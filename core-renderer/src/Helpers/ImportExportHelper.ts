import { defaultGroup, defaultPassword, defaultValue, IGroupable, NameValuePair, NameValuePairType, Password, ImportableDisplayField, GroupCSVHeader } from "../Types/EncryptedData";
import { DataType } from "../Types/Table";
import { stores } from "../Objects/Stores/index";
import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from 'csv-stringify/browser/esm';
import cryptHelper from "./cryptHelper";
import { api } from "../API";
import { CSVHeaderPropertyMapperModel } from "../Types/Models";
import { Dictionary } from "../Types/DataStructures";

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
        stores.popupStore.showAlert("Unable to read file", "Please check to make sure the file is formatted properly.", false);
        return;
    }

    const records: string[][] = parse(content, { bom: true });
    const properties: ImportableDisplayField[] = [
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
            backingProperty: "groups",
            displayName: "Groups",
            required: false,
            requiresDelimiter: true
        }
    ];

    const importer = new PasswordCSVImporter();
    stores.popupStore.showImportPopup(color, records[0], properties,
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
        stores.popupStore.showAlert("Unable to read file", "Please check to make sure the file is formatted properly.", false);
        return;
    }

    const records: string[][] = parse(content, { bom: true });
    const properties: ImportableDisplayField[] = [
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

    const importer = new ValueCSVImporter();
    stores.popupStore.showImportPopup(color, records[0], properties,
        (masterKey: string, columnToProperty: Dictionary<ImportableDisplayField[]>) => importer.import(color, masterKey, records, columnToProperty));
}

export function getExportablePasswords(color: string): Promise<string>
{
    return new Promise<string>((resolve) => 
    {
        stores.popupStore.showRequestAuthentication(color, async (masterKey: string) => 
        {
            stores.popupStore.showLoadingIndicator(color, "Exporting Passwords");
            let data: string[][] = [['Login', 'Domain', 'Email', 'Password For', 'Password', 'Security Question Questions',
                'Security Question Answers', 'Additional Info', 'Groups']];

            for (let i = 0; i < stores.passwordStore.passwords.length; i++)
            {
                let password = stores.passwordStore.passwords[i];
                if (password.isVaultic)
                {
                    continue;
                }

                let decryptedPasswordResponse = await cryptHelper.decrypt(masterKey, password.password);
                if (!decryptedPasswordResponse.success)
                {
                    showExportError();
                    return;
                }

                let securityQuestionQuestions: string[] = [];
                let securityQuestionAnswers: string[] = [];

                for (let j = 0; j < password.securityQuestions.length; j++)
                {
                    const decryptedSecurityQuestionQuestion = await cryptHelper.decrypt(masterKey, password.securityQuestions[j].question);
                    if (!decryptedSecurityQuestionQuestion.success)
                    {
                        showExportError();
                        return;
                    }

                    const decryptedSecurityQuestionAnswer = await cryptHelper.decrypt(masterKey, password.securityQuestions[j].answer);
                    if (!decryptedSecurityQuestionAnswer.success)
                    {
                        showExportError();
                        return;
                    }

                    securityQuestionQuestions.push(decryptedSecurityQuestionQuestion.value!);
                    securityQuestionAnswers.push(decryptedSecurityQuestionAnswer.value!);
                }

                let groups: string[] = [];
                for (let j = 0; j < password.groups.length; j++)
                {
                    const group = stores.groupStore.passwordGroups.filter(g => g.id == password.groups[j]);
                    if (group.length == 1)
                    {
                        groups.push(group[0].name);
                    }
                }

                data.push([password.login, password.domain, password.email, password.passwordFor, decryptedPasswordResponse.value!,
                securityQuestionQuestions.join(';'), securityQuestionAnswers.join(';'), password.additionalInformation, groups.join(';')]);
            }

            const formattedData = await exportData(data);
            resolve(formattedData);
        }, () => resolve(''))
    });
}

export function getExportableValues(color: string): Promise<string>
{
    return new Promise<string>((resolve) => 
    {
        stores.popupStore.showRequestAuthentication(color, async (masterKey: string) => 
        {
            stores.popupStore.showLoadingIndicator(color, "Exporting Values");
            let data: string[][] = [['Name', 'Value', 'ValueType', 'Additional Info', 'Groups']];

            for (let i = 0; i < stores.valueStore.nameValuePairs.length; i++)
            {
                let value = stores.valueStore.nameValuePairs[i];

                let decryptedValueResponse = await cryptHelper.decrypt(masterKey, value.value);
                if (!decryptedValueResponse.success)
                {
                    showExportError();
                    return;
                }

                let groups: string[] = [];
                for (let j = 0; j < value.groups.length; j++)
                {
                    const group = stores.groupStore.valuesGroups.filter(g => g.id == value.groups[j]);
                    if (group.length == 1)
                    {
                        groups.push(group[0].name);
                    }
                }

                const valueType = value.valueType ? NameValuePairType[value.valueType] : "";
                data.push([value.name, decryptedValueResponse.value!, valueType, value.additionalInformation, groups.join(';')]);
            }

            const formattedData = await exportData(data);
            resolve(formattedData);
        }, () => resolve(''))
    });
}

async function exportData(data: string[][]): Promise<string>
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
    stores.popupStore.showAlert("", "An error occured while trying to export. Please try again or", true);
    stores.popupStore.hideLoadingIndicator();
}

class CSVImporter<T extends IGroupable>
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

    protected async saveValue(masterKey: string, value: T, skipBackup: boolean)
    {
    }

    public async import(color: string, masterKey: string, records: string[][], columnToProperty: Dictionary<ImportableDisplayField[]>)
    {
        stores.popupStore.showLoadingIndicator(color, "Importing");

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
                                        group.name = groups[l];

                                        await stores.groupStore.addGroup(masterKey, group, true);

                                        groupId = group.id;
                                        groupsAdded[group.name] = group.id;
                                    }
                                    else 
                                    {
                                        groupId = groupsAdded[groups[l]];
                                    }

                                    if (groupId)
                                    {
                                        value.groups.push(groupId);
                                    }
                                }
                            }
                        }
                        else 
                        {
                            // default set, can just set to the value in the csv cell
                            value[properties[k].backingProperty] = column;
                        }
                    }
                }
            }

            // save, only backup the last value
            await this.saveValue(masterKey, value, i != records.length - 1);
        }

        stores.popupStore.hideLoadingIndicator();

        // TOOD: should actually do some error handling
        stores.popupStore.showToast(color, "Import Complete", true);
    }

    protected async customSetProperty(value: T, property: ImportableDisplayField, cellValue: string)
    {
        return false;
    }
}

class PasswordCSVImporter extends CSVImporter<Password>
{
    constructor()
    {
        super(DataType.Passwords);
    }

    protected createValue(): Password 
    {
        return defaultPassword();
    }

    protected async saveValue(masterKey: string, value: Password, skipBackup: boolean): Promise<void> 
    {
        await stores.passwordStore.addPassword(masterKey, value, skipBackup);
    }

    protected async customSetProperty(value: Password, property: ImportableDisplayField, cellValue: string): Promise<boolean> 
    {
        // TODO: implement security question import
        return false;
    }
}

class ValueCSVImporter extends CSVImporter<NameValuePair>
{
    constructor()
    {
        super(DataType.NameValuePairs);
    }

    protected createValue(): NameValuePair 
    {
        return defaultValue();
    }

    protected async saveValue(masterKey: string, value: NameValuePair, skipBackup: boolean): Promise<void> 
    {
        await stores.valueStore.addNameValuePair(masterKey, value, skipBackup);
    }

    protected async customSetProperty(value: NameValuePair, property: ImportableDisplayField, cellValue: string): Promise<boolean> 
    {
        if (property.backingProperty == "valueType" && cellValue)
        {
            value.valueType = NameValuePairType[cellValue] ?? NameValuePairType.Other;
            return true;
        }

        return false;
    }
}