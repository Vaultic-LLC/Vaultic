import { defaultGroup, defaultPassword, defaultValue, IGroupable, NameValuePair, Password } from "../Types/EncryptedData";
import { DataType } from "../Types/Table";
import { stores } from "../Objects/Stores/index";
import { parse } from "csv-parse/sync";
import { stringify } from 'csv-stringify';
import cryptHelper from "./cryptHelper";
import { api } from "../API";
import { CSVHeaderPropertyMapperModel } from "../Types/Models";
import { NumberDictionary } from "../Types/DataStructures";

export function buildCSVPropertyMappers(models: CSVHeaderPropertyMapperModel[]): [number | undefined, NumberDictionary<string[]>]
{
    let groupIndex: number | undefined = undefined;
    let csvHeadersToPropertiesDict: NumberDictionary<string[]> = {};

    models.forEach(mapper =>
    {
        if (!mapper.csvHeader)
        {
            return;
        }

        if (mapper.property == "groups")
        {
            groupIndex = mapper.csvHeader;
            return;
        }

        if (!csvHeadersToPropertiesDict[mapper.csvHeader])
        {
            csvHeadersToPropertiesDict[mapper.csvHeader] = [];
        }

        csvHeadersToPropertiesDict[mapper.csvHeader].push(mapper.property);
    });

    return [groupIndex, csvHeadersToPropertiesDict];
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
        // TODO: show error
        return;
    }

    const records: string[][] = parse(content, { bom: true });
    const properties = ["login", "domain", "email", "password", "passwordFor", "additionalInformation", "groups"];

    stores.popupStore.showImportPopup(color, records[0], properties,
        (masterKey: string, columnIndexToProperty: any, groupNameIndex: number) =>
            importData(color, masterKey, records, columnIndexToProperty, groupNameIndex, DataType.Passwords,
                defaultPassword, (password: Password) => stores.passwordStore.addPassword(masterKey, password)));
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
        // TODO: show error
        return;
    }

    const records: string[][] = parse(content, { bom: true });
    const properties = ["name", "value", "valueType", "notifyIfWeak", "additionalInformation", "groups"];

    stores.popupStore.showImportPopup(color, records[0], properties,
        (masterKey: string, columnIndexToProperty: any, groupNameIndex: number) =>
            importData(color, masterKey, records, columnIndexToProperty, groupNameIndex, DataType.NameValuePairs,
                defaultValue, (value: NameValuePair) => stores.valueStore.addNameValuePair(masterKey, value)));
}

export async function importData<T extends IGroupable>(color: string, masterKey: string, records: string[][], columnIndexToProperty: NumberDictionary<string[]>,
    groupNameIndex: number | undefined, dataType: DataType, createValue: () => T, saveValue: (value: T) => Promise<boolean>)
{
    stores.popupStore.showLoadingIndicator(color, "Importing");

    let groupsAdded: string[] = [];
    for (let i = 0; i < records.length; i++)
    {
        // header row
        if (i == 0)
        {
            continue;
        }

        const value = createValue();
        for (let j = 0; j < records[i].length; j++)
        {
            // the user didn't decide to import this column
            if (!columnIndexToProperty[j])
            {
                continue;
            }

            if (j == groupNameIndex)
            {
                let groupId: string | undefined = undefined;

                // TODO: this column could be an array of groups
                if (!groupsAdded.includes(records[i][j]))
                {
                    const group = defaultGroup(dataType);
                    group.name = records[i][j];

                    await stores.groupStore.addGroup(masterKey, group);

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

            for (let k = 0; k < columnIndexToProperty[j].length; k++)
            {
                value[columnIndexToProperty[j][k]] = records[i][j];
            }
        }

        // TODO: this and group store should not backup after each password. Should
        // add an override to skip this
        await saveValue(value);
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
                    const decryptedSecurityQuestionQuestion = await cryptHelper.encrypt(masterKey, password.securityQuestions[i].question);
                    if (!decryptedSecurityQuestionQuestion.success)
                    {
                        showExportError();
                        return;
                    }

                    const decryptedSecurityQuestionAnswer = await cryptHelper.encrypt(masterKey, password.securityQuestions[i].answer);
                    if (!decryptedSecurityQuestionAnswer.success)
                    {
                        showExportError();
                        return;
                    }

                    securityQuestionQuestions.push(decryptedSecurityQuestionQuestion.value!);
                    securityQuestionAnswers.push(decryptedSecurityQuestionAnswer.value!);
                }

                data.push([formatCSVValue(password.login), formatCSVValue(password.domain), formatCSVValue(password.email),
                formatCSVValue(password.passwordFor), formatCSVValue(decryptedPasswordResponse.value!), formatCSVValue(securityQuestionQuestions.join(';')),
                formatCSVValue(securityQuestionAnswers.join(';')), formatCSVValue(password.additionalInformation), formatCSVValue(password.groups.join(';'))]);
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

                data.push([formatCSVValue(value.name), formatCSVValue(decryptedValueResponse.value!), formatCSVValue(value.valueType),
                formatCSVValue(value.additionalInformation), formatCSVValue(value.groups.join(';'))]);
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
            delimiter: ','
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

function formatCSVValue(value: any)
{
    let stringValue: string = `${value}`;

    // double escape any quotes already in the value
    if (stringValue.includes("\""))
    {
        stringValue = stringValue.replace("\"", "\"\"");
    }

    // escape the whole value in case there is a delimiter in it
    stringValue = `"${stringValue}"`;
    return stringValue;
}

function showExportError()
{
    stores.popupStore.showAlert("", "An error occured while trying to export. Please try again or", true);
}