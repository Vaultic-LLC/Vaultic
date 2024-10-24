import { buildCSVPropertyMappers, getExportablePasswords, getExportableValues, importablePasswordProperties, importableValueProperties, PasswordCSVImporter, ValueCSVImporter } from "../../src/core/Helpers/ImportExportHelper";
import { createTestSuite, TestContext } from "../test";
import { parse } from "csv-parse/browser/esm/sync";
import { CSVHeaderPropertyMapperModel } from "../../src/core/Types/Models";
import { DataType, defaultGroup, defaultPassword, defaultValue, NameValuePair, NameValuePairType, Password } from "../../src/core/Types/DataTypes";
import cryptHelper from "../../src/core/Helpers/cryptHelper";
import app from "../../src/core/Objects/Stores/AppStore";
import { Field } from "../../src/core/Types/Fields";

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

        const googleGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.name.value == "google");
        ctx.assertEquals("Imported Google Group exists", googleGroup.length, 1);
        ctx.assertEquals("Groogle Group has 2 passwords", googleGroup[0].passwords.value.length, 2);

        const facebookGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.name.value == "facebook");
        ctx.assertEquals("Imported Facebook Group exists", facebookGroup.length, 1);
        ctx.assertEquals("Facebook Group has 2 passwords", facebookGroup[0].passwords.value.length, 2);

        const passwordOne = app.currentVault.passwordStore.passwords.filter(p => p.login.value == "johnp");
        const decryptedPassword = await cryptHelper.decrypt(masterKey, passwordOne[0].password.value);

        ctx.assertEquals("First password exists", passwordOne.length, 1);
        ctx.assertEquals("First password duplicate csv header set correctly", passwordOne[0].additionalInformation.value, passwordOne[0].email.value);
        ctx.assertTruthy("First password has google group", passwordOne[0].groups.value.includes(googleGroup[0].id.value));
        ctx.assertEquals("First password password set properly", decryptedPassword.value!, "password1");
        ctx.assertEquals("First password domain set properly", passwordOne[0].domain.value, "google.com");
        ctx.assertEquals("First password email set properly", passwordOne[0].email.value, "john@gmail.com");
        ctx.assertEquals("First password no security questions", passwordOne[0].securityQuestions.value.length, 0);

        const passwordTwo = app.currentVault.passwordStore.passwords.filter(p => p.login.value == "johnpeterson");
        const decryptedPasswordTwo = await cryptHelper.decrypt(masterKey, passwordTwo[0].password.value);

        ctx.assertEquals("Second password exists", passwordTwo.length, 1);
        ctx.assertEquals("Second password duplicate csv header set correctly", passwordTwo[0].additionalInformation.value, passwordTwo[0].email.value);
        ctx.assertTruthy("Second password has facebook group", passwordTwo[0].groups.value.includes(facebookGroup[0].id.value));
        ctx.assertEquals("Second password password set properly", decryptedPasswordTwo.value!, "AnotherPassword");
        ctx.assertEquals("Second password domain set properly", passwordTwo[0].domain.value, "facebook.com");
        ctx.assertEquals("Second password email set properly", passwordTwo[0].email.value, "john@gmail.com");

        const decryptedPasswordTwoQuestion = await cryptHelper.decrypt(masterKey, passwordTwo[0].securityQuestions.value[0].question);
        const decryptedPasswordTwoAnswer = await cryptHelper.decrypt(masterKey, passwordTwo[0].securityQuestions.value[0].answer);
        ctx.assertEquals("Second password security question question", decryptedPasswordTwoQuestion.value, "Who Am I");
        ctx.assertEquals("Second password security question answer", decryptedPasswordTwoAnswer.value, "Me");

        const passwordThree = app.currentVault.passwordStore.passwords.filter(p => p.login.value == "johnJPeter");
        const decryptedPasswordThree = await cryptHelper.decrypt(masterKey, passwordThree[0].password.value);

        ctx.assertEquals("Third password exists", passwordThree.length, 1);
        ctx.assertEquals("Third password duplicate csv header set correctly", passwordThree[0].additionalInformation.value, passwordThree[0].email.value);
        ctx.assertTruthy("Third password has google group", passwordThree[0].groups.value.includes(googleGroup[0].id.value));
        ctx.assertTruthy("Third password has facebook group", passwordThree[0].groups.value.includes(facebookGroup[0].id.value));
        ctx.assertEquals("Third password password set properly", decryptedPasswordThree.value!, "PasswordAnother");
        ctx.assertEquals("Third password domain set properly", passwordThree[0].domain.value, "google.com");
        ctx.assertEquals("Third password email set properly", passwordThree[0].email.value, "johnJ@outlook.com");

        const decryptedPasswordThreeQuestionOne = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions.value[0].question);
        const decryptedPasswordThreeAnswerOne = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions.value[0].answer);
        ctx.assertEquals("Third password security question question one", decryptedPasswordThreeQuestionOne.value, "Color");
        ctx.assertEquals("Third password security question answer one", decryptedPasswordThreeAnswerOne.value, "Green");

        const decryptedPasswordThreeQuestionTwo = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions.value[1].question);
        const decryptedPasswordThreeAnswerTwo = await cryptHelper.decrypt(masterKey, passwordThree[0].securityQuestions.value[1].answer);
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

        const mfaGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.name.value == "MFA Codes");
        ctx.assertEquals("Imported MFA Codes Group exists", mfaGroup.length, 1);
        ctx.assertEquals("MFA Codes Group has 1 value", mfaGroup[0].values.value.length, 1);

        const valueOne = app.currentVault.valueStore.nameValuePairs.filter(v => v.name.value == "phone code");
        const decryptedValueOne = await cryptHelper.decrypt(masterKey, valueOne[0].value.value);

        ctx.assertEquals("First value exists", valueOne.length, 1);
        ctx.assertEquals("First value value set properly", decryptedValueOne.value!, "1234");
        ctx.assertEquals("First value type", valueOne[0].valueType?.value, NameValuePairType.Passcode);

        const valueTwo = app.currentVault.valueStore.nameValuePairs.filter(v => v.name.value == "mfa code");
        const decryptedValueTwo = await cryptHelper.decrypt(masterKey, valueTwo[0].value.value);

        ctx.assertEquals("Second value exists", valueTwo.length, 1);
        ctx.assertEquals("Second value value set properly", decryptedValueTwo.value!, "FVewogldnion2g2hyp9jgdsoighoeoh");
        ctx.assertEquals("Second value additional information is correct", valueTwo[0].additionalInformation.value, "Code for Mfa");
        ctx.assertTruthy("Second value has mfa group", valueTwo[0].groups.value.includes(mfaGroup[0].id.value));
        ctx.assertEquals("Second value type", valueTwo[0].valueType?.value, NameValuePairType.MFAKey);

        const valueThree = app.currentVault.valueStore.nameValuePairs.filter(v => v.name.value == "bank verbal code");
        const decryptedValueThree = await cryptHelper.decrypt(masterKey, valueThree[0].value.value);

        ctx.assertEquals("Third value exists", valueOne.length, 1);
        ctx.assertEquals("Third value value set properly", decryptedValueThree.value!, "i like sheep");
        ctx.assertEquals("Third value additional information is correct", valueThree[0].additionalInformation.value, "for me bank");
        ctx.assertEquals("Third value type", valueThree[0].valueType?.value, NameValuePairType.Other);
    }
});

// In order for this test to pass, all other passwords and groups added via other tests must have unique logins / names
importExportHelperTestSuite.tests.push({
    name: "Export Passwords Works", func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.name.value = "Any's Group";
        await app.currentVault.groupStore.addGroup(masterKey, groupOne);

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.name.value = "Mary's Group";
        await app.currentVault.groupStore.addGroup(masterKey, groupTwo);

        await createPassword("John", "facebook.com", "john@google.com", "JohnP", "Facebook", "", [], [], [groupOne.id.value]);
        await createPassword("Mary", "google.com", "maryL@outlook.com", "VJweiohgoinu2ith29hiodg", "Google", "For google",
            ["What is your first name", "Where were you born"], ["Maryelis", "Alaska"], [groupOne.id.value, groupTwo.id.value]);

        const formattedPasswords = await getExportablePasswords('', masterKey);
        const rows = formattedPasswords.split('\n');
        const headers = rows[0].replace(/"|\\"/g, '').split(',');

        for (let i = 1; i < rows.length; i++)
        {
            const rowValues = rows[i].replace(/"|\\"/g, '').split(',');
            let password: Password = app.currentVault.passwordStore.passwords.filter(p => p.login.value == rowValues[0])[0];

            for (let j = 1; j < rowValues.length; j++)
            {
                if (headers[j] == "Password")
                {
                    const decryptedPassword = await cryptHelper.decrypt(masterKey, password.password.value);
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
                        ctx.assertEquals("No security question answers", password.securityQuestions.value.length, 0);
                        continue;
                    }

                    const securityQuestionQuestions = rowValues[j].split(';');
                    ctx.assertEquals(`Same amount of security question questions`, securityQuestionQuestions.length, password.securityQuestions.value.length);

                    for (let k = 0; k < password.securityQuestions.value.length; k++)
                    {
                        const decryptedSecurityQuestionQuestion = await cryptHelper.decrypt(masterKey, password.securityQuestions.value[k].question);
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
                        ctx.assertEquals("No security question questions", password.securityQuestions.value.length, 0);
                        continue;
                    }

                    const securityQuestionAnswer = rowValues[j].split(';');
                    ctx.assertEquals(`Same amount of security question answers`, securityQuestionAnswer.length, password.securityQuestions.value.length);

                    for (let k = 0; k < password.securityQuestions.value.length; k++)
                    {
                        const decryptedSecurityQuestionAnswer = await cryptHelper.decrypt(masterKey, password.securityQuestions.value[k].answer);
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
                        ctx.assertEquals("No groups", password.groups.value.length, 0);
                        continue;
                    }

                    const groups = rowValues[j].split(';');
                    ctx.assertEquals(`Group count equals passwords group count`, groups.length, password.groups.value.length);

                    for (let k = 0; k < groups.length; k++)
                    {
                        const group = app.currentVault.groupStore.passwordGroups.filter(g => g.name.value == groups[k]);
                        ctx.assertTruthy(`Group has password`, group[0].passwords.value.includes(password.id.value));
                    }
                }
                else if (headers[j] == "Additional Info")
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals passwords additional info`, rowValues[j], password.additionalInformation.value);
                }
                else if (headers[j] == "Password For")
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals passwords Password For`, rowValues[j], password.passwordFor.value);
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
            testPassword.login.value = login;
            testPassword.domain.value = domain;
            testPassword.email.value = email;
            testPassword.password.value = password;
            testPassword.passwordFor.value = passwordFor;
            testPassword.additionalInformation.value = additionalInfo;
            testPassword.groups.value = groups;

            for (let i = 0; i < secrutiyQuestionQuestions.length; i++)
            {
                testPassword.securityQuestions.value.push({
                    id: new Field(i.toString()),
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
        groupOne.name.value = "Any";
        await app.currentVault.groupStore.addGroup(masterKey, groupOne);

        const groupTwo = defaultGroup(DataType.NameValuePairs);
        groupTwo.name.value = "Banks";
        await app.currentVault.groupStore.addGroup(masterKey, groupTwo);

        await createValue("Phone Code", "1234", NameValuePairType.Passcode, "", [groupOne.id.value]);
        await createValue("Bank Verbal Code", "sleepy time", NameValuePairType.Passcode, "For the bank", [groupOne.id.value, groupTwo.id.value]);

        const formattedValues = await getExportableValues('', masterKey);
        const rows = formattedValues.split('\n');
        const headers = rows[0].replace(/"|\\"/g, '').split(',');

        for (let i = 1; i < rows.length; i++)
        {
            const rowValues = rows[i].replace(/"|\\"/g, '').split(',');
            let value: NameValuePair = app.currentVault.valueStore.nameValuePairs.filter(v => v.name.value == rowValues[0])[0];

            for (let j = 1; j < rowValues.length; j++)
            {
                if (headers[j] == "Value")
                {
                    const decryptedValue = await cryptHelper.decrypt(masterKey, value.value.value);
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
                        ctx.assertEquals("No groups", value.groups.value.length, 0);
                        continue;
                    }

                    const groups = rowValues[j].split(';');
                    ctx.assertEquals(`Group count equals values group count`, groups.length, value.groups.value.length);

                    for (let k = 0; k < groups.length; k++)
                    {
                        const group = app.currentVault.groupStore.valuesGroups.filter(g => g.name.value == groups[k]);
                        ctx.assertTruthy("Group has value", group[0].values.value.includes(value.id.value));
                    }
                }
                else if (headers[j] == "Additional Info")
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals values additional info`, rowValues[j], value.additionalInformation.value);
                }
                else if (headers[j] == "Value Type")
                {
                    ctx.assertEquals(`Row ${i} Value Type equals values valueType`, rowValues[j], value.valueType.value ?? "");
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
            testValue.name.value = name;
            testValue.value.value = value;
            testValue.valueType!.value = valueType;
            testValue.additionalInformation.value = additionalInfo;
            testValue.groups.value = groups;

            return app.currentVault.valueStore.addNameValuePair(masterKey, testValue);
        }
    }
});

export default importExportHelperTestSuite;