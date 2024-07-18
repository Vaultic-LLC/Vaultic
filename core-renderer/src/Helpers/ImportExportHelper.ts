import { defaultGroup, defaultPassword, defaultValue, IGroupable, NameValuePair, NameValuePairType, Password, PropertySelectorDisplayFields, PropertyType, RequireableDisplayField } from "../Types/EncryptedData";
import { DataType } from "../Types/Table";
import { stores } from "../Objects/Stores/index";
import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from 'csv-stringify/browser/esm';
import cryptHelper from "./cryptHelper";
import { api } from "../API";
import { CSVHeaderPropertyMapperModel } from "../Types/Models";
import { Dictionary } from "../Types/DataStructures";

export function buildCSVPropertyMappers(models: CSVHeaderPropertyMapperModel[]): [string | undefined, Dictionary<string[]>]
{
    let groupHeader: string | undefined = undefined;
    let csvHeadersToPropertiesDict: Dictionary<string[]> = {};

    models.forEach(mapper =>
    {
        if (!mapper.csvHeader)
        {
            return;
        }

        if (mapper.property.backingProperty == "groups")
        {
            groupHeader = mapper.csvHeader;
            return;
        }

        if (!csvHeadersToPropertiesDict[mapper.csvHeader])
        {
            csvHeadersToPropertiesDict[mapper.csvHeader] = [];
        }

        csvHeadersToPropertiesDict[mapper.csvHeader].push(mapper.property.backingProperty);
    });

    return [groupHeader, csvHeadersToPropertiesDict];
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
    const properties: RequireableDisplayField[] = [
        {
            backingProperty: "login",
            displayName: "Username",
            required: true
        },
        {
            backingProperty: "password",
            displayName: "Password",
            required: true
        },
        {
            backingProperty: "passwordFor",
            displayName: "Password For",
            required: false
        },
        {
            backingProperty: "domain",
            displayName: "Domain",
            required: false
        },
        {
            backingProperty: "email",
            displayName: "Email",
            required: false
        },
        {
            backingProperty: "additionalInformation",
            displayName: "Additional Info",
            required: false,
        },
        {
            backingProperty: "groups",
            displayName: "Groups",
            required: false
        }
    ];

    stores.popupStore.showImportPopup(color, records[0], properties,
        (masterKey: string, columnToProperty: Dictionary<string[]>, groupNameIndex: string) =>
            importData(color, masterKey, records, columnToProperty, groupNameIndex, DataType.Passwords,
                defaultPassword, (password: Password, skipBackup: boolean) => stores.passwordStore.addPassword(masterKey, password, skipBackup)));
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
    const properties: RequireableDisplayField[] = [
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
            required: false
        }
    ];

    stores.popupStore.showImportPopup(color, records[0], properties,
        (masterKey: string, columnToProperty: Dictionary<string[]>, groupNameIndex: string) =>
            importData(color, masterKey, records, columnToProperty, groupNameIndex, DataType.NameValuePairs,
                defaultValue, (value: NameValuePair, skipBackup: boolean) => stores.valueStore.addNameValuePair(masterKey, value, skipBackup)));
}

export async function importData<T extends IGroupable>(color: string, masterKey: string, records: string[][], columnToProperty: Dictionary<string[]>,
    groupNameIndex: string | undefined, dataType: DataType, createValue: () => T, saveValue: (value: T, skipBackup: boolean) => Promise<boolean>)
{
    stores.popupStore.showLoadingIndicator(color, "Importing");

    let groupsAdded: string[] = [];
    const headers: string[] = records[0];

    for (let i = 1; i < records.length; i++)
    {
        const value = createValue();
        for (let j = 0; j < records[i].length; j++)
        {
            const column = headers[j];

            // the user didn't decide to import this column
            if (!columnToProperty[column])
            {
                continue;
            }

            if (column == groupNameIndex)
            {
                let groupId: string | undefined = undefined;

                // TODO: this column could be an array of groups
                if (!groupsAdded.includes(records[i][j]))
                {
                    const group = defaultGroup(dataType);
                    group.name = records[i][j];

                    await stores.groupStore.addGroup(masterKey, group, true);

                    groupId = group.id;
                    groupsAdded.push(group.name);
                }
                else 
                {
                    groupId = stores.groupStore.groups.filter(g => g.type == dataType && g.name == records[i][j])[0].id;
                }

                if (groupId)
                {
                    value.groups.push(groupId);
                }
            }

            for (let k = 0; k < columnToProperty[column].length; k++)
            {
                value[columnToProperty[column][k]] = records[i][j];
            }
        }

        await saveValue(value, i != records.length - 1);
    }

    stores.popupStore.hideLoadingIndicator();

    // TOOD: should actually do some error handling
    stores.popupStore.showToast(color, "Import Complete", true);
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