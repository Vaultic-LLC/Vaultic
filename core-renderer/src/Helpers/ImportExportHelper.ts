import app from "../Objects/Stores/AppStore";
import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from 'csv-stringify/browser/esm';
import cryptHelper from "./cryptHelper";
import { api } from "../API";
import { CSVHeaderPropertyMapperModel } from "../Types/Models";
import { generateUniqueID } from "./generatorHelper";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { IPrimaryDataObject, DataType, defaultGroup, Password, SecurityQuestion, defaultPassword, NameValuePair, defaultValue, nameValuePairTypesValues, NameValuePairType } from "../Types/DataTypes";
import { ImportableDisplayField } from "../Types/Fields";
import { Field } from "@vaultic/shared/Types/Fields";

export function buildCSVPropertyMappers(models: CSVHeaderPropertyMapperModel[]): Dictionary<ImportableDisplayField[]>
{
    let csvHeadersToPropertiesDict: Dictionary<ImportableDisplayField[]> = {};

    models.forEach(mapper =>
    {
        if (!mapper.csvHeader)
        {
            return;
        }

        if (!csvHeadersToPropertiesDict[mapper.csvHeader])
        {
            csvHeadersToPropertiesDict[mapper.csvHeader] = [];
        }

        csvHeadersToPropertiesDict[mapper.csvHeader].push(mapper.property);
    });

    return csvHeadersToPropertiesDict;
}

export async function importPasswords(color: string)
{
    const [attempted, content] = await api.helpers.vaultic.readCSV();
    if (!attempted)
    {
        return;
    }

    if (!content)
    {
        app.popups.showAlert("Unable to read file", "Please check to make sure the file is formatted properly.", false);
        return;
    }

    const records: string[][] = parse(content, { bom: true });
    const importer = new PasswordCSVImporter();
    app.popups.showImportPopup(color, records[0], importablePasswordProperties,
        (masterKey: string, columnToProperty: Dictionary<ImportableDisplayField[]>) => importer.import(color, masterKey, records, columnToProperty));
}

export async function importValues(color: string)
{
    const [attempted, content] = await api.helpers.vaultic.readCSV();
    if (!attempted)
    {
        return;
    }

    if (!content)
    {
        app.popups.showAlert("Unable to read file", "Please check to make sure the file is formatted properly.", false);
        return;
    }

    const records: string[][] = parse(content, { bom: true });

    const importer = new ValueCSVImporter();
    app.popups.showImportPopup(color, records[0], importableValueProperties,
        (masterKey: string, columnToProperty: Dictionary<ImportableDisplayField[]>) => importer.import(color, masterKey, records, columnToProperty));
}

export async function getExportablePasswords(color: string, masterKey: string): Promise<string>
{
    app.popups.showLoadingIndicator(color, "Exporting Passwords");
    let data: string[][] = [['Login', 'Domain', 'Email', 'Password For', 'Password', 'Security Question Questions',
        'Security Question Answers', 'Additional Info', 'Groups']];

    for (let i = 0; i < app.currentVault.passwordStore.passwords.length; i++)
    {
        let password = app.currentVault.passwordStore.passwords[i];
        if (password.value.isVaultic.value)
        {
            continue;
        }

        let decryptedPasswordResponse = await cryptHelper.decrypt(masterKey, password.value.password.value);
        if (!decryptedPasswordResponse.success)
        {
            showExportError();
            return "";
        }

        let securityQuestionQuestions: string[] = [];
        let securityQuestionAnswers: string[] = [];

        for (let j = 0; j < password.value.securityQuestions.value.length; j++)
        {
            const decryptedSecurityQuestionQuestion = await cryptHelper.decrypt(masterKey, password.value.securityQuestions.value[j].question);
            if (!decryptedSecurityQuestionQuestion.success)
            {
                showExportError();
                return "";
            }

            const decryptedSecurityQuestionAnswer = await cryptHelper.decrypt(masterKey, password.value.securityQuestions.value[j].answer);
            if (!decryptedSecurityQuestionAnswer.success)
            {
                showExportError();
                return "";
            }

            securityQuestionQuestions.push(decryptedSecurityQuestionQuestion.value!);
            securityQuestionAnswers.push(decryptedSecurityQuestionAnswer.value!);
        }

        let groups: string[] = [];
        password.value.groups.value.forEach((v, k, map) => 
        {
            const group = app.currentVault.groupStore.getState().passwordGroupsByID.value.get(k);
            if (group)
            {
                groups.push(group.value.name.value);
            }
            else 
            {
                console.log(`No group found in export passwords`);
            }
        });

        data.push([password.value.login.value, password.value.domain.value, password.value.email.value, password.value.passwordFor.value, decryptedPasswordResponse.value!,
        securityQuestionQuestions.join(';'), securityQuestionAnswers.join(';'), password.value.additionalInformation.value, groups.join(';')]);
    }

    return await exportData(data);
}

export async function getExportableValues(color: string, masterKey: string): Promise<string>
{
    app.popups.showLoadingIndicator(color, "Exporting Values");
    let data: string[][] = [['Name', 'Value', 'Value Type', 'Additional Info', 'Groups']];

    for (let i = 0; i < app.currentVault.valueStore.nameValuePairs.length; i++)
    {
        let nameValuePair = app.currentVault.valueStore.nameValuePairs[i];

        let decryptedValueResponse = await cryptHelper.decrypt(masterKey, nameValuePair.value.value.value);
        if (!decryptedValueResponse.success)
        {
            showExportError();
            return "";
        }

        let groups: string[] = [];
        nameValuePair.value.groups.value.forEach((v, k, map) => 
        {
            const group = app.currentVault.groupStore.getState().valueGroupsByID.value.get(k);
            if (group)
            {
                groups.push(group.value.name.value);
            }
            else 
            {
                console.log("no group for value when exporting");
            }
        });

        data.push([nameValuePair.value.name.value, decryptedValueResponse.value!, nameValuePair.value.valueType?.value ?? "",
        nameValuePair.value.additionalInformation.value, groups.join(';')]);
    }

    return await exportData(data);
}

export async function exportData(data: string[][]): Promise<string>
{
    return new Promise((resolve) =>
    {
        const formattedData: string[] = [];
        const stringifier = stringify({
            delimiter: ',',
            quoted: true
        });

        // Use the readable stream api to consume CSV data
        stringifier.on('readable', function ()
        {
            let row;
            while ((row = stringifier.read()) !== null)
            {
                formattedData.push(row);
            }
        });

        // Catch any error
        stringifier.on('error', function (err)
        {
            console.error(err.message);
            resolve('');
        });

        stringifier.on('finish', async function ()
        {
            resolve(formattedData.join(''));
        });

        for (let i = 0; i < data.length; i++)
        {
            stringifier.write(data[i]);
        }

        stringifier.end();
    });
}

function showExportError()
{
    app.popups.showAlert("", "An error occured while trying to export. Please try again or", true);
    app.popups.hideLoadingIndicator();
}

class CSVImporter<T extends IPrimaryDataObject>
{
    dataType: DataType;

    constructor(dataType: DataType)
    {
        this.dataType = dataType;
    }

    protected createValue(): T
    {
        return {} as T;
    }

    protected async saveValue(masterKey: string, value: T, backup: boolean)
    {
    }

    public async import(color: string, masterKey: string, records: string[][], columnToProperty: Dictionary<ImportableDisplayField[]>)
    {
        app.popups.showLoadingIndicator(color, "Importing");

        let groupsAdded: Dictionary<string> = {};
        const headers: string[] = records[0];

        for (let i = 1; i < records.length; i++)
        {
            const value = this.createValue();
            for (let j = 0; j < records[i].length; j++)
            {
                const column = headers[j];

                // the user didn't decide to import this column
                if (!columnToProperty[column])
                {
                    continue;
                }

                const cellValue = records[i][j];
                if (!cellValue)
                {
                    continue;
                }

                const properties = columnToProperty[column];

                // a single cell can map to multiple properties
                for (let k = 0; k < properties.length; k++)
                {
                    // first see if its something we need to set custom
                    if (!(await this.customSetProperty(value, properties[k], cellValue)))
                    {
                        // then check groups
                        if (properties[k].backingProperty == "groups")
                        {
                            // split groups up if the user has specified a delimiter for them, otherwise just use the entire value as the group name
                            const groups: string[] = cellValue ? properties[k].delimiter ? cellValue.split(properties[k].delimiter!) : [cellValue] : [];
                            if (groups.length > 0)
                            {
                                for (let l = 0; l < groups.length; l++)
                                {
                                    // just in case
                                    if (!groups[l])
                                    {
                                        continue;
                                    }

                                    let groupId: string | undefined = undefined;
                                    if (!groupsAdded[groups[l]])
                                    {
                                        const group = defaultGroup(this.dataType);
                                        group.name.value = groups[l];

                                        await app.currentVault.groupStore.addGroup(masterKey, group, false);

                                        groupId = group.id.value;
                                        groupsAdded[group.name.value] = group.id.value;
                                    }
                                    else 
                                    {
                                        groupId = groupsAdded[groups[l]];
                                    }

                                    if (groupId)
                                    {
                                        value.groups.value.set(groupId, new Field(groupId));
                                    }
                                }
                            }
                        }
                        else 
                        {
                            // default set, can just set to the value in the csv cell
                            value[properties[k].backingProperty].value = cellValue;
                        }
                    }
                }
            }

            // save, only backup after the last value
            await this.saveValue(masterKey, value, i == records.length - 1);
        }

        app.popups.hideLoadingIndicator();
        app.popups.showToast(color, "Import Complete", true);
    }

    protected async customSetProperty(value: T, property: ImportableDisplayField, cellValue: string)
    {
        return false;
    }
}

export class PasswordCSVImporter extends CSVImporter<Password>
{
    temporarySecurityQuestions: SecurityQuestion[];

    constructor()
    {
        super(DataType.Passwords);
        this.temporarySecurityQuestions = [];
    }

    protected createValue(): Password 
    {
        return defaultPassword();
    }

    protected async saveValue(masterKey: string, value: Password, backup: boolean): Promise<void> 
    {
        await app.currentVault.passwordStore.addPassword(masterKey, value, backup);
    }

    protected async customSetProperty(value: Password, property: ImportableDisplayField, cellValue: string): Promise<boolean> 
    {
        if (property.backingProperty == "securityQuestionQuestions")
        {
            const questions: string[] = property.delimiter ? cellValue.split(property.delimiter) : [cellValue];

            // reading in questions first
            if (this.temporarySecurityQuestions.length == 0)
            {
                for (let i = 0; i < questions.length; i++)
                {
                    const id = await generateUniqueID(this.temporarySecurityQuestions);
                    this.temporarySecurityQuestions.push({
                        id: new Field(id),
                        question: questions[i],
                        questionLength: questions[i].length,
                        answer: '',
                        answerLength: 0
                    });
                }
            }
            // reading in questions after answers
            else 
            {
                for (let i = 0; i < questions.length; i++)
                {
                    this.temporarySecurityQuestions[i].question = questions[i];
                    this.temporarySecurityQuestions[i].questionLength = questions[i].length;
                }

                value.securityQuestions.value = this.temporarySecurityQuestions;
                this.temporarySecurityQuestions = [];
            }

            return true;
        }
        else if (property.backingProperty == "securityQuestionAnswers")
        {
            const answers: string[] = property.delimiter ? cellValue.split(property.delimiter) : [cellValue];

            // reading in answers first
            if (this.temporarySecurityQuestions.length == 0)
            {
                for (let i = 0; i < answers.length; i++)
                {
                    const id = await generateUniqueID(this.temporarySecurityQuestions);
                    this.temporarySecurityQuestions.push({
                        id: new Field(id),
                        question: '',
                        questionLength: 0,
                        answer: answers[i],
                        answerLength: answers[i].length
                    });
                }
            }
            // reading in answers after questions
            else 
            {
                for (let i = 0; i < answers.length; i++)
                {
                    this.temporarySecurityQuestions[i].answer = answers[i];
                    this.temporarySecurityQuestions[i].answerLength = answers[i].length;
                }

                value.securityQuestions.value = this.temporarySecurityQuestions;
                this.temporarySecurityQuestions = [];
            }

            return true;
        }

        return false;
    }
}

export class ValueCSVImporter extends CSVImporter<NameValuePair>
{
    constructor()
    {
        super(DataType.NameValuePairs);
    }

    protected createValue(): NameValuePair 
    {
        return defaultValue();
    }

    protected async saveValue(masterKey: string, value: NameValuePair, backup: boolean): Promise<void> 
    {
        await app.currentVault.valueStore.addNameValuePair(masterKey, value, backup);
    }

    protected async customSetProperty(value: NameValuePair, property: ImportableDisplayField, cellValue: string): Promise<boolean> 
    {
        if (property.backingProperty == "valueType")
        {
            // @ts-ignore
            value.valueType.value = nameValuePairTypesValues.includes(cellValue) ? cellValue : NameValuePairType.Other;
            return true;
        }

        return false;
    }
}

export const importablePasswordProperties: ImportableDisplayField[] = [
    {
        backingProperty: "login",
        displayName: "Username",
        required: true,
    },
    {
        backingProperty: "password",
        displayName: "Password",
        required: true,
    },
    {
        backingProperty: "passwordFor",
        displayName: "Password For",
        required: false,
    },
    {
        backingProperty: "domain",
        displayName: "Domain",
        required: false,
    },
    {
        backingProperty: "email",
        displayName: "Email",
        required: false,
    },
    {
        backingProperty: "additionalInformation",
        displayName: "Additional Info",
        required: false,
    },
    {
        backingProperty: "securityQuestionQuestions",
        displayName: "Security Questions",
        required: false,
        requiresDelimiter: true
    },
    {
        backingProperty: "securityQuestionAnswers",
        displayName: "Security Answers",
        required: false,
        requiresDelimiter: true
    },
    {
        backingProperty: "groups",
        displayName: "Groups",
        required: false,
        requiresDelimiter: true
    }
];

export const importableValueProperties: ImportableDisplayField[] = [
    {
        backingProperty: "name",
        displayName: "Name",
        required: true
    },
    {
        backingProperty: "value",
        displayName: "Value",
        required: true
    },
    {
        backingProperty: "valueType",
        displayName: "Type",
        required: false
    },
    {
        backingProperty: "additionalInformation",
        displayName: "Additional Info",
        required: false
    },
    {
        backingProperty: "groups",
        displayName: "Groups",
        required: false,
        requiresDelimiter: true
    }
];