import { stores } from "../../src/core/Objects/Stores";
import { buildCSVPropertyMappers, getExportablePasswords, getExportableValues, importablePasswordProperties, importableValueProperties, PasswordCSVImporter, ValueCSVImporter } from "../../src/core/Helpers/ImportExportHelper";
import { createTestSuite, TestContext } from "../test";
import { parse } from "csv-parse/browser/esm/sync";
import { CSVHeaderPropertyMapperModel } from "../../src/core/Types/Models";
import { DataType } from "../../src/core/Types/Table";
import { defaultGroup, defaultPassword, defaultValue, NameValuePair, NameValuePairType, Password } from "../../src/core/Types/EncryptedData";
import cryptHelper from "../../src/core/Helpers/cryptHelper";

let importExportHelperTestSuite = createTestSuite("Import / Export");
const masterKey = "test";

importExportHelperTestSuite.tests.push({
    name: "Import Passwords Works", func: async (ctx: TestContext) =>
    {
        const mockCSVPasswords =
            "Login,Password,Domain,Tag,Email,Security Question Questions,Security Question Answers\n" +
            "johnp,password1,google.com,google,john@gmail.com,,\n" +
            "johnpeterson,AnotherPassword,facebook.com,facebook,john@gmail.com,Who Am I,Me\n" +
            "johnJPeter,PasswordAnother,google.com,google;facebook,johnJ@outlook.com,Color;Food,Green;Milk";

        const csvHeaderPropertyMapperModels: CSVHeaderPropertyMapperModel[] = [
            { property: importablePasswordProperties[0], csvHeader: "Login" }, { property: importablePasswordProperties[1], csvHeader: "Password" },
            { property: importablePasswordProperties[4], csvHeader: "Email" }, { property: importablePasswordProperties[3], csvHeader: "Domain" },
            { property: { ...importablePasswordProperties[8], delimiter: ';' }, csvHeader: "Tag" }, { property: importablePasswordProperties[5], csvHeader: "Email" },
            { property: { ...importablePasswordProperties[6], delimiter: ';' }, csvHeader: "Security Question Questions" },
            { property: { ...importablePasswordProperties[7], delimiter: ';' }, csvHeader: "Security Question Answers" }];

        const csvHeaderPropertiesDict = buildCSVPropertyMappers(csvHeaderPropertyMapperModels);
        const records: string[][] = parse(mockCSVPasswords, { bom: true });

        const importer = new PasswordCSVImporter();
        await importer.import('', masterKey, records, csvHeaderPropertiesDict);

        const googleGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.name == "google");
        ctx.assertEquals("Imported Google Group exists", googleGroup.length, 1);
        ctx.assertEquals("Groogle Group has 2 passwords", googleGroup[0].passwords.length, 2);

        const facebookGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.name == "facebook");
        ctx.assertEquals("Imported Facebook Group exists", facebookGroup.length, 1);
        ctx.assertEquals("Facebook Group has 2 passwords", facebookGroup[0].passwords.length, 2);

        const passwordOne = app.currentVault.passwordStore.passwords.filter(p => p.login == "johnp");
        const decryptedPassword = await cryptHelper.decrypt(masterKey, passwordOne[0].password);

        ctx.assertEquals("First password exists", passwordOne.length, 1);
        ctx.assertEquals("First password duplicate csv header set correctly", passwordOne[0].additionalInformation, passwordOne[0].email);
        ctx.assertTruthy("First password has google group", passwordOne[0].groups.includes(googleGroup[0].id));
        ctx.assertEquals("First password password set properly", decryptedPassword.value!, "password1");
        ctx.assertEquals("First password domain set properly", passwordOne[0].domain, "google.com");
        ctx.assertEquals("First password email set properly", passwordOne[0].email, "john@gmail.com");
        ctx.assertEquals("First password no security questions", passwordOne[0].securityQuestions.length, 0);

        const passwordTwo = app.currentVault.passwordStore.passwords.filter(p => p.login == "johnpeterson");
        const decryptedPasswordTwo = await cryptHelper.decrypt(masterKey, passwordTwo[0].password);

        ctx.assertEquals("Second password exists", passwordTwo.length, 1);
        ctx.assertEquals("Second password duplicate csv header set correctly", passwordTwo[0].additionalInformation, passwordTwo[0].email);
        ctx.assertTruthy("Second password has facebook group", passwordTwo[0].groups.includes(facebookGroup[0].id));
        ctx.assertEquals("Second password password set properly", decryptedPasswordTwo.value!, "AnotherPassword");
        ctx.assertEquals("Second password domain set properly", passwordTwo[0].domain, "facebook.com");
        ctx.assertEquals("Second password email set properly", passwordTwo[0].email, "john@gmail.com");

        const decryptedPasswordTwoQuestion = await cryptHelper.decrypt(masterKey, passwordTwo[0].securityQuestions[0].question);
        const decryptedPasswordTwoAnswer = await cryptHelper.decrypt(masterKey, passwordTwo[0].securityQuestions[0].answer);
        ctx.assertEquals("Second password security question question", decryptedPasswordTwoQuestion.value, "Who Am I");
        ctx.assertEquals("Second password security question answer", decryptedPasswordTwoAnswer.value, "Me");

        const passwordThree = app.currentVault.passwordStore.passwords.filter(p => p.login == "johnJPeter");
        const decryptedPasswordThree = await cryptHelper.decrypt(masterKey, passwordThree[0].password);

        ctx.assertEquals("Third password exists", passwordThree.length, 1);
        ctx.assertEquals("Third password duplicate csv header set correctly", passwordThree[0].additionalInformation, passwordThree[0].email);
        ctx.assertTruthy("Third password has google group", passwordThree[0].groups.includes(googleGroup[0].id));
        ctx.assertTruthy("Third password has facebook group", passwordThree[0].groups.includes(facebookGroup[0].id));
        ctx.assertEquals("Third password password set properly", decryptedPasswordThree.value!, "PasswordAnother");
        ctx.assertEquals("Third password domain set properly", passwordThree[0].domain, "google.com");
        ctx.assertEquals("Third password email set properly", passwordThree[0].email, "johnJ@outlook.com");

        const decryptedPasswordThreeQuestionOne = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions[0].question);
        const decryptedPasswordThreeAnswerOne = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions[0].answer);
        ctx.assertEquals("Third password security question question one", decryptedPasswordThreeQuestionOne.value, "Color");
        ctx.assertEquals("Third password security question answer one", decryptedPasswordThreeAnswerOne.value, "Green");

        const decryptedPasswordThreeQuestionTwo = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions[1].question);
        const decryptedPasswordThreeAnswerTwo = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions[1].answer);
        ctx.assertEquals("Third password security question question two", decryptedPasswordThreeQuestionTwo.value, "Food");
        ctx.assertEquals("Third password security question answer two", decryptedPasswordThreeAnswerTwo.value, "Milk");
    }
});

importExportHelperTestSuite.tests.push({
    name: "Import Values Works", func: async (ctx: TestContext) =>
    {
        const mockCSVValues =
            "Name,Value,Additional Information,Groups,Value Type\n" +
            "phone code,1234,,,Passcode\n" +
            "mfa code,FVewogldnion2g2hyp9jgdsoighoeoh,Code for Mfa,MFA Codes,MFA Key\n" +
            "bank verbal code,i like sheep,for me bank,,Bank Code";

        const csvHeaderPropertyMapperModels: CSVHeaderPropertyMapperModel[] = [
            { property: importableValueProperties[0], csvHeader: "Name" }, { property: importableValueProperties[1], csvHeader: "Value" },
            { property: importableValueProperties[3], csvHeader: "Additional Information" }, { property: { ...importableValueProperties[4], delimiter: ';' }, csvHeader: "Groups" },
            { property: importableValueProperties[2], csvHeader: "Value Type" }];

        const csvHeaderPropertiesDict = buildCSVPropertyMappers(csvHeaderPropertyMapperModels);
        const records: string[][] = parse(mockCSVValues, { bom: true });

        const importer = new ValueCSVImporter();
        await importer.import('', masterKey, records, csvHeaderPropertiesDict);

        const mfaGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.name == "MFA Codes");
        ctx.assertEquals("Imported MFA Codes Group exists", mfaGroup.length, 1);
        ctx.assertEquals("MFA Codes Group has 1 value", mfaGroup[0].values.length, 1);

        const valueOne = app.currentVault.valueStore.nameValuePairs.filter(v => v.name == "phone code");
        const decryptedValueOne = await cryptHelper.decrypt(masterKey, valueOne[0].value);

        ctx.assertEquals("First value exists", valueOne.length, 1);
        ctx.assertEquals("First value value set properly", decryptedValueOne.value!, "1234");
        ctx.assertEquals("First value type", valueOne[0].valueType, NameValuePairType.Passcode);

        const valueTwo = app.currentVault.valueStore.nameValuePairs.filter(v => v.name == "mfa code");
        const decryptedValueTwo = await cryptHelper.decrypt(masterKey, valueTwo[0].value);

        ctx.assertEquals("Second value exists", valueTwo.length, 1);
        ctx.assertEquals("Second value value set properly", decryptedValueTwo.value!, "FVewogldnion2g2hyp9jgdsoighoeoh");
        ctx.assertEquals("Second value additional information is correct", valueTwo[0].additionalInformation, "Code for Mfa");
        ctx.assertTruthy("Second value has mfa group", valueTwo[0].groups.includes(mfaGroup[0].id));
        ctx.assertEquals("Second value type", valueTwo[0].valueType, NameValuePairType.MFAKey);

        const valueThree = app.currentVault.valueStore.nameValuePairs.filter(v => v.name == "bank verbal code");
        const decryptedValueThree = await cryptHelper.decrypt(masterKey, valueThree[0].value);

        ctx.assertEquals("Third value exists", valueOne.length, 1);
        ctx.assertEquals("Third value value set properly", decryptedValueThree.value!, "i like sheep");
        ctx.assertEquals("Third value additional information is correct", valueThree[0].additionalInformation, "for me bank");
        ctx.assertEquals("Third value type", valueThree[0].valueType, NameValuePairType.Other);
    }
});

// In order for this test to pass, all other passwords and groups added via other tests must have unique logins / names
importExportHelperTestSuite.tests.push({
    name: "Export Passwords Works", func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.name = "Any's Group";
        await app.currentVault.groupStore.addGroup(masterKey, groupOne);

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.name = "Mary's Group";
        await app.currentVault.groupStore.addGroup(masterKey, groupTwo);

        await createPassword("John", "facebook.com", "john@google.com", "JohnP", "Facebook", "", [], [], [groupOne.id]);
        await createPassword("Mary", "google.com", "maryL@outlook.com", "VJweiohgoinu2ith29hiodg", "Google", "For google",
            ["What is your first name", "Where were you born"], ["Maryelis", "Alaska"], [groupOne.id, groupTwo.id]);

        const formattedPasswords = await getExportablePasswords('', masterKey);
        const rows = formattedPasswords.split('\n');
        const headers = rows[0].replace(/"|\\"/g, '').split(',');

        for (let i = 1; i < rows.length; i++)
        {
            const rowValues = rows[i].replace(/"|\\"/g, '').split(',');
            let password: Password = app.currentVault.passwordStore.passwords.filter(p => p.login == rowValues[0])[0];

            for (let j = 1; j < rowValues.length; j++)
            {
                if (headers[j] == "Password")
                {
                    const decryptedPassword = await cryptHelper.decrypt(masterKey, password.password);
                    if (!decryptedPassword.success)
                    {
                        throw "Failed to decrypted password";
                    }

                    ctx.assertEquals(`Row ${i} password equals passwords password`, rowValues[j], decryptedPassword.value!);
                }
                else if (headers[j] == "Security Question Questions")
                {
                    if (!rowValues[j])
                    {
                        ctx.assertEquals("No security question answers", password.securityQuestions.length, 0);
                        continue;
                    }

                    const securityQuestionQuestions = rowValues[j].split(';');
                    ctx.assertEquals(`Same amount of security question questions`, securityQuestionQuestions.length, password.securityQuestions.length);

                    for (let k = 0; k < password.securityQuestions.length; k++)
                    {
                        const decryptedSecurityQuestionQuestion = await cryptHelper.decrypt(masterKey, password.securityQuestions[k].question);
                        if (!decryptedSecurityQuestionQuestion.success)
                        {
                            throw "Failed to decrypted security question quesiton";
                        }

                        ctx.assertTruthy(`Security question question exists in export`, securityQuestionQuestions.includes(decryptedSecurityQuestionQuestion.value!));
                    }
                }
                else if (headers[j] == "Security Question Answers")
                {
                    if (!rowValues[j])
                    {
                        ctx.assertEquals("No security question questions", password.securityQuestions.length, 0);
                        continue;
                    }

                    const securityQuestionAnswer = rowValues[j].split(';');
                    ctx.assertEquals(`Same amount of security question answers`, securityQuestionAnswer.length, password.securityQuestions.length);

                    for (let k = 0; k < password.securityQuestions.length; k++)
                    {
                        const decryptedSecurityQuestionAnswer = await cryptHelper.decrypt(masterKey, password.securityQuestions[k].answer);
                        if (!decryptedSecurityQuestionAnswer.success)
                        {
                            throw "Failed to decrypted security question answer";
                        }

                        ctx.assertTruthy(`Security question answer exists in export`, securityQuestionAnswer.includes(decryptedSecurityQuestionAnswer.value!));
                    }
                }
                else if (headers[j] == "Groups")
                {
                    if (!rowValues[j])
                    {
                        ctx.assertEquals("No groups", password.groups.length, 0);
                        continue;
                    }

                    const groups = rowValues[j].split(';');
                    ctx.assertEquals(`Group count equals passwords group count`, groups.length, password.groups.length);

                    for (let k = 0; k < groups.length; k++)
                    {
                        const group = app.currentVault.groupStore.passwordGroups.filter(g => g.name == groups[k]);
                        ctx.assertTruthy(`Group has password`, group[0].passwords.includes(password.id));
                    }
                }
                else if (headers[j] == "Additional Info")
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals passwords additional info`, rowValues[j], password.additionalInformation);
                }
                else if (headers[j] == "Password For")
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals passwords Password For`, rowValues[j], password.passwordFor);
                }
                else 
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals passwords ${headers[j]}`, rowValues[j], password[headers[j].toLowerCase()]);
                }
            }
        }

        async function createPassword(login: string, domain: string, email: string, password: string, passwordFor: string, additionalInfo: string,
            secrutiyQuestionQuestions: string[], securityQuestionAnswers: string[], groups: string[])
        {
            let testPassword = defaultPassword();
            testPassword.login = login;
            testPassword.domain = domain;
            testPassword.email = email;
            testPassword.password = password;
            testPassword.passwordFor = passwordFor;
            testPassword.additionalInformation = additionalInfo;
            testPassword.groups = groups;

            for (let i = 0; i < secrutiyQuestionQuestions.length; i++)
            {
                testPassword.securityQuestions.push({
                    id: i.toString(),
                    question: secrutiyQuestionQuestions[i],
                    questionLength: 0,
                    answer: securityQuestionAnswers[i],
                    answerLength: 0
                });
            }

            return app.currentVault.passwordStore.addPassword(masterKey, testPassword);
        }
    }
});

// In order for this test to pass, all other values and groups added via other tests must have unique names
importExportHelperTestSuite.tests.push({
    name: "Export Values Works", func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.NameValuePairs);
        groupOne.name = "Any";
        await app.currentVault.groupStore.addGroup(masterKey, groupOne);

        const groupTwo = defaultGroup(DataType.NameValuePairs);
        groupTwo.name = "Banks";
        await app.currentVault.groupStore.addGroup(masterKey, groupTwo);

        await createValue("Phone Code", "1234", NameValuePairType.Passcode, "", [groupOne.id]);
        await createValue("Bank Verbal Code", "sleepy time", NameValuePairType.Passcode, "For the bank", [groupOne.id, groupTwo.id]);

        const formattedValues = await getExportableValues('', masterKey);
        const rows = formattedValues.split('\n');
        const headers = rows[0].replace(/"|\\"/g, '').split(',');

        for (let i = 1; i < rows.length; i++)
        {
            const rowValues = rows[i].replace(/"|\\"/g, '').split(',');
            let value: NameValuePair = app.currentVault.valueStore.nameValuePairs.filter(v => v.name == rowValues[0])[0];

            for (let j = 1; j < rowValues.length; j++)
            {
                if (headers[j] == "Value")
                {
                    const decryptedValue = await cryptHelper.decrypt(masterKey, value.value);
                    if (!decryptedValue.success)
                    {
                        throw "Failed to decrypted value";
                    }

                    ctx.assertEquals(`Row ${i} value equals values value`, rowValues[j], decryptedValue.value!);
                }
                else if (headers[j] == "Groups")
                {
                    if (!rowValues[j])
                    {
                        ctx.assertEquals("No groups", value.groups.length, 0);
                        continue;
                    }

                    const groups = rowValues[j].split(';');
                    ctx.assertEquals(`Group count equals values group count`, groups.length, value.groups.length);

                    for (let k = 0; k < groups.length; k++)
                    {
                        const group = app.currentVault.groupStore.valuesGroups.filter(g => g.name == groups[k]);
                        ctx.assertTruthy("Group has value", group[0].values.includes(value.id));
                    }
                }
                else if (headers[j] == "Additional Info")
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals values additional info`, rowValues[j], value.additionalInformation);
                }
                else if (headers[j] == "Value Type")
                {
                    ctx.assertEquals(`Row ${i} Value Type equals values valueType`, rowValues[j], value.valueType ?? "");
                }
                else 
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals values ${headers[j]}`, rowValues[j], value[headers[j].toLowerCase()]);
                }
            }
        }

        app.popups.hideLoadingIndicator();

        async function createValue(name: string, value: string, valueType: NameValuePairType, additionalInfo: string, groups: string[])
        {
            let testValue = defaultValue();
            testValue.name = name;
            testValue.value = value;
            testValue.valueType = valueType;
            testValue.additionalInfo = additionalInfo;
            testValue.groups = groups;

            return app.currentVault.valueStore.addNameValuePair(masterKey, testValue);
        }
    }
});

export default importExportHelperTestSuite;