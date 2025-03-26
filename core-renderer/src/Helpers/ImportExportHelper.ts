import app from "../Objects/Stores/AppStore";
import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from 'csv-stringify/browser/esm';
import cryptHelper from "./cryptHelper";
import { api } from "../API";
import { CSVHeaderPropertyMapperModel } from "../Types/Models";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { IPrimaryDataObject, DataType, defaultGroup, Password, SecurityQuestion, defaultPassword, NameValuePair, defaultValue, nameValuePairTypesValues, NameValuePairType, Group } from "../Types/DataTypes";
import { ImportableDisplayField } from "../Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { GroupStoreState, IGroupStoreState } from "../Objects/Stores/GroupStore";
import { FilterStoreState, FilterStoreStateKeys, IFilterStoreState } from "../Objects/Stores/FilterStore";
import { IPasswordStoreState, PasswordStoreState, PasswordStoreStateKeys } from "../Objects/Stores/PasswordStore";
import { IValueStoreState, ValueStoreState } from "../Objects/Stores/ValueStore";
import StoreUpdateTransaction from "../Objects/StoreUpdateTransaction";
import { PendingStoreState } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";
import { PrimarydataTypeStoreStateKeys, SecondarydataTypeStoreStateKeys } from "../Objects/Stores/Base";

export async function exportLogs(color: string)
{
    app.popups.showLoadingIndicator(color, "Exporting Logs");

    const data = JSON.vaulticParse(await api.repositories.logs.getExportableLogData());
    const formattedData = await exportData(data);

    const success = await api.helpers.vaultic.writeCSV("Vaultic-Logs", formattedData);
    if (success)
    {
        app.popups.showToast("Export Succeeded", true);
    }
    else 
    {
        app.popups.showToast("Export Failed", false);
    }

    app.popups.hideLoadingIndicator();
}

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
        if (password.v)
        {
            continue;
        }

        let decryptedPasswordResponse = await cryptHelper.decrypt(masterKey, password.p);
        if (!decryptedPasswordResponse.success)
        {
            showExportError();
            return "";
        }

        let securityQuestionQuestions: string[] = [];
        let securityQuestionAnswers: string[] = [];

        for (const sq of Object.values(password.q))
        {
            const decryptedSecurityQuestionQuestion = await cryptHelper.decrypt(masterKey, sq.q);
            if (!decryptedSecurityQuestionQuestion.success)
            {
                showExportError();
                return "";
            }

            const decryptedSecurityQuestionAnswer = await cryptHelper.decrypt(masterKey, sq.a);
            if (!decryptedSecurityQuestionAnswer.success)
            {
                showExportError();
                return "";
            }

            securityQuestionQuestions.push(decryptedSecurityQuestionQuestion.value!);
            securityQuestionAnswers.push(decryptedSecurityQuestionAnswer.value!);
        }

        let groups: string[] = [];
        OH.forEachKey(password.g, (k) => 
        {
            const group = app.currentVault.groupStore.getState().p[k];
            if (group)
            {
                groups.push(group.n);
            }
            else 
            {
                console.log(`No group found in export passwords`);
            }
        });

        data.push([password.l, password.d, password.e, password.f, decryptedPasswordResponse.value!,
        securityQuestionQuestions.join(';'), securityQuestionAnswers.join(';'), password.a, groups.join(';')]);
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

        let decryptedValueResponse = await cryptHelper.decrypt(masterKey, nameValuePair.v);
        if (!decryptedValueResponse.success)
        {
            showExportError();
            return "";
        }

        let groups: string[] = [];
        OH.forEachKey(nameValuePair.g, (k) => 
        {
            const group = app.currentVault.groupStore.getState().v[k];
            if (group)
            {
                groups.push(group.n);
            }
            else 
            {
                console.log("no group for value when exporting");
            }
        });

        data.push([nameValuePair.n, decryptedValueResponse.value!, nameValuePair.y ?? "",
        nameValuePair.a, groups.join(';')]);
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

    pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>;
    pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>;

    didFailToSave: boolean;

    constructor(dataType: DataType)
    {
        this.dataType = dataType;
        this.didFailToSave = false;
    }

    protected getTypeName()
    {
        return "";
    }

    protected preImport()
    {
        this.pendingGroupStoreState = app.currentVault.groupStore.getPendingState()!;
        this.pendingFilterStoreState = app.currentVault.filterStore.getPendingState()!;
    }

    protected createValue(): T
    {
        return {} as T;
    }

    protected async saveValue(masterKey: string, value: T, commit: boolean)
    {
    }

    protected async saveGroup(group: Group): Promise<void>
    {

    }

    public async import(color: string, masterKey: string, records: string[][], columnToProperty: Dictionary<ImportableDisplayField[]>)
    {
        app.popups.showLoadingIndicator(color, "Importing");

        this.preImport();

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
                        if (properties[k].backingProperty == "g")
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
                                        group.n = groups[l];

                                        await this.saveGroup(group);

                                        groupId = group.id;
                                        groupsAdded[group.n] = group.id;
                                    }
                                    else 
                                    {
                                        groupId = groupsAdded[groups[l]];
                                    }

                                    if (groupId)
                                    {
                                        value.groups.set(groupId, groupId);
                                    }
                                }
                            }
                        }
                        else 
                        {
                            // default set, can just set to the value in the csv cell
                            // @ts-ignore
                            value[properties[k].backingProperty] = cellValue;
                        }
                    }
                }
            }

            // save, only backup after the last value
            await this.saveValue(masterKey, value, i == records.length - 1);
        }

        app.popups.hideLoadingIndicator();

        if (this.didFailToSave)
        {
            this.failedToSave()
        }
        else
        {
            app.popups.showToast("Import Complete", true);
        }
    }

    protected async customSetProperty(value: T, property: ImportableDisplayField, cellValue: string)
    {
        return false;
    }

    protected failedToSave()
    {
        app.popups.showAlert("Unable to Import", `An error occured when trying to import your ${this.getTypeName()}s, please try again. If the issue persists`, true);
    }
}

export class PasswordCSVImporter extends CSVImporter<Password>
{
    pendingPasswordStoreState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>;
    temporarySecurityQuestions: Map<string, SecurityQuestion>;
    addedPasswords: Password[];

    constructor()
    {
        super(DataType.Passwords);

        this.temporarySecurityQuestions = new Map<string, SecurityQuestion>();
        this.addedPasswords = [];
    }

    protected getTypeName(): string
    {
        return "password";
    }

    protected preImport(): void
    {
        super.preImport();
        this.pendingPasswordStoreState = app.currentVault.passwordStore.getPendingState()!;
    }

    protected createValue(): Password 
    {
        return defaultPassword();
    }

    protected async saveGroup(group: Group): Promise<void>
    {
        await app.currentVault.groupStore.addGroupToStores(group, this.pendingGroupStoreState, this.pendingFilterStoreState, this.pendingPasswordStoreState);
    }

    protected async saveValue(masterKey: string, value: Password, commit: boolean): Promise<void> 
    {
        this.addedPasswords.push(value);

        await app.currentVault.passwordStore.addPasswordToStores(masterKey, value, this.temporarySecurityQuestions.valueArray(), this.pendingPasswordStoreState,
            this.pendingFilterStoreState, this.pendingGroupStoreState);

        this.temporarySecurityQuestions = new Map();

        if (commit)
        {
            if (!await app.currentVault.passwordStore.commitPasswordEdits(masterKey, this.addedPasswords, this.pendingPasswordStoreState, this.pendingFilterStoreState,
                this.pendingGroupStoreState))
            {
                this.didFailToSave = true;
            }
        }
    }

    protected async customSetProperty(value: Password, property: ImportableDisplayField, cellValue: string): Promise<boolean> 
    {
        if (property.backingProperty == "securityQuestionQuestions")
        {
            const questions: string[] = property.delimiter ? cellValue.split(property.delimiter) : [cellValue];

            // reading in questions first
            if (this.temporarySecurityQuestions.size == 0)
            {
                for (let i = 0; i < questions.length; i++)
                {
                    const id = uniqueIDGenerator.generate();
                    this.temporarySecurityQuestions.set(id, {
                        id: id,
                        q: questions[i],
                        a: ''
                    });
                }
            }
            // reading in questions after answers
            else
            {
                let count = 0;
                for (const [key, value] of this.temporarySecurityQuestions.entries())
                {
                    value.q = questions[count];
                    count += 1;
                }
            }

            return true;
        }
        else if (property.backingProperty == "securityQuestionAnswers")
        {
            const answers: string[] = property.delimiter ? cellValue.split(property.delimiter) : [cellValue];

            // reading in answers first
            if (this.temporarySecurityQuestions.size == 0)
            {
                for (let i = 0; i < answers.length; i++)
                {
                    const id = uniqueIDGenerator.generate();
                    this.temporarySecurityQuestions.set(id, {
                        id: id,
                        q: '',
                        a: answers[i],
                    });
                }
            }
            // reading in answers after questions
            else 
            {
                let count = 0;
                for (const [key, value] of this.temporarySecurityQuestions.entries())
                {
                    value.a = answers[count];
                    count += 1;
                }
            }

            return true;
        }

        return false;
    }
}

export class ValueCSVImporter extends CSVImporter<NameValuePair>
{
    pendingValueStoreState: PendingStoreState<ValueStoreState, PrimarydataTypeStoreStateKeys>;

    constructor()
    {
        super(DataType.NameValuePairs);
    }

    protected getTypeName(): string
    {
        return "value";
    }

    protected preImport(): void
    {
        super.preImport();
        this.pendingValueStoreState = app.currentVault.valueStore.getPendingState()!;
    }

    protected createValue(): NameValuePair 
    {
        return defaultValue();
    }

    protected async saveValue(masterKey: string, value: NameValuePair, commit: boolean): Promise<void> 
    {
        await app.currentVault.valueStore.addNameValuePairToStores(masterKey, value, this.pendingValueStoreState, this.pendingFilterStoreState,
            this.pendingGroupStoreState);

        if (commit)
        {
            const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);

            transaction.updateVaultStore(app.currentVault.valueStore, this.pendingValueStoreState);
            transaction.updateVaultStore(app.currentVault.groupStore, this.pendingGroupStoreState);
            transaction.updateVaultStore(app.currentVault.filterStore, this.pendingFilterStoreState);

            if (!await transaction.commit(masterKey))
            {
                this.didFailToSave = true;
            }
        }
    }

    protected async saveGroup(group: Group): Promise<void>
    {
        await app.currentVault.groupStore.addGroupToStores(group, this.pendingGroupStoreState, this.pendingFilterStoreState, undefined,
            this.pendingValueStoreState);
    }

    protected async customSetProperty(value: NameValuePair, property: ImportableDisplayField, cellValue: string): Promise<boolean> 
    {
        if (property.backingProperty == "y")
        {
            // @ts-ignore
            value.y = nameValuePairTypesValues.includes(cellValue) ? cellValue : NameValuePairType.Other;
            return true;
        }

        return false;
    }
}

export const importablePasswordProperties: ImportableDisplayField[] = [
    {
        backingProperty: "l",
        displayName: "Username",
        required: true,
    },
    {
        backingProperty: "p",
        displayName: "Password",
        required: true,
    },
    {
        backingProperty: "f",
        displayName: "Password For",
        required: false,
    },
    {
        backingProperty: "d",
        displayName: "Domain",
        required: false,
    },
    {
        backingProperty: "e",
        displayName: "Email",
        required: false,
    },
    {
        backingProperty: "a",
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
        backingProperty: "g",
        displayName: "Groups",
        required: false,
        requiresDelimiter: true
    }
];

export const importableValueProperties: ImportableDisplayField[] = [
    {
        backingProperty: "n",
        displayName: "Name",
        required: true
    },
    {
        backingProperty: "v",
        displayName: "Value",
        required: true
    },
    {
        backingProperty: "y",
        displayName: "Type",
        required: false
    },
    {
        backingProperty: "a",
        displayName: "Additional Info",
        required: false
    },
    {
        backingProperty: "g",
        displayName: "Groups",
        required: false,
        requiresDelimiter: true
    }
];