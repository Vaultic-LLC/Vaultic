import { buildCSVPropertyMappers, getExportablePasswords, getExportableValues, importablePasswordProperties, importableValueProperties, PasswordCSVImporter, ValueCSVImporter } from "@renderer/Helpers/ImportExportHelper";
import { createTestSuite, TestContext } from "@lib/test";
import { parse } from "csv-parse/browser/esm/sync";
import { CSVHeaderPropertyMapperModel } from "@renderer/Types/Models";
import { DataType, defaultGroup, defaultPassword, defaultValue, NameValuePair, NameValuePairType, Password, SecurityQuestion } from "@renderer/Types/DataTypes";
import cryptHelper from "@renderer/Helpers/cryptHelper";
import app from "@renderer/Objects/Stores/AppStore";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";
import { DictionaryAsList } from "@vaultic/shared/Types/Stores";
import userManager from "@lib/userManager";

let importExportHelperTestSuite = createTestSuite("Import / Export");

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
        await importer.import('', userManager.defaultUser.vaulticKey, records, csvHeaderPropertiesDict);

        const googleGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.n == "google");
        ctx.assertEquals("Imported Google Group exists", googleGroup.length, 1);
        ctx.assertEquals("Groogle Group has 2 passwords", OH.size(googleGroup[0].p), 2);

        const facebookGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.n == "facebook");
        ctx.assertEquals("Imported Facebook Group exists", facebookGroup.length, 1);
        ctx.assertEquals("Facebook Group has 2 passwords", OH.size(facebookGroup[0].p), 2);

        const passwordOne = app.currentVault.passwordStore.passwords.filter(p => p.l == "johnp");
        const decryptedPassword = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordOne[0].p);

        ctx.assertEquals("First password exists", passwordOne.length, 1);
        ctx.assertEquals("First password duplicate csv header set correctly", passwordOne[0].a, passwordOne[0].e);
        ctx.assertTruthy("First password has google group", passwordOne[0].g[googleGroup[0].id]);
        ctx.assertEquals("First password password set properly", decryptedPassword.value!, "password1");
        ctx.assertEquals("First password domain set properly", passwordOne[0].d, "google.com");
        ctx.assertEquals("First password email set properly", passwordOne[0].e, "john@gmail.com");
        ctx.assertEquals("First password no security questions", OH.size(passwordOne[0].q), 0);

        const passwordTwo = app.currentVault.passwordStore.passwords.filter(p => p.l == "johnpeterson");
        const decryptedPasswordTwo = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordTwo[0].p);

        ctx.assertEquals("Second password exists", passwordTwo.length, 1);
        ctx.assertEquals("Second password duplicate csv header set correctly", passwordTwo[0].a, passwordTwo[0].e);
        ctx.assertTruthy("Second password has facebook group", passwordTwo[0].g[facebookGroup[0].id]);
        ctx.assertEquals("Second password password set properly", decryptedPasswordTwo.value!, "AnotherPassword");
        ctx.assertEquals("Second password domain set properly", passwordTwo[0].d, "facebook.com");
        ctx.assertEquals("Second password email set properly", passwordTwo[0].e, "john@gmail.com");

        const passwordTwoSecurityQuestion = Object.values(passwordTwo[0].q)[0];
        const decryptedPasswordTwoQuestion = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordTwoSecurityQuestion.q);
        const decryptedPasswordTwoAnswer = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordTwoSecurityQuestion.a);
        ctx.assertEquals("Second password security question question", decryptedPasswordTwoQuestion.value, "Who Am I");
        ctx.assertEquals("Second password security question answer", decryptedPasswordTwoAnswer.value, "Me");

        const passwordThree = app.currentVault.passwordStore.passwords.filter(p => p.l == "johnJPeter");
        const decryptedPasswordThree = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordThree[0].p);

        ctx.assertEquals("Third password exists", passwordThree.length, 1);
        ctx.assertEquals("Third password duplicate csv header set correctly", passwordThree[0].a, passwordThree[0].e);
        ctx.assertTruthy("Third password has google group", passwordThree[0].g[googleGroup[0].id]);
        ctx.assertTruthy("Third password has facebook group", passwordThree[0].g[facebookGroup[0].id]);
        ctx.assertEquals("Third password password set properly", decryptedPasswordThree.value!, "PasswordAnother");
        ctx.assertEquals("Third password domain set properly", passwordThree[0].d, "google.com");
        ctx.assertEquals("Third password email set properly", passwordThree[0].e, "johnJ@outlook.com");

        const passwordThreeSecurityQuestionOne = Object.values(passwordThree[0].q)[0];
        const decryptedPasswordThreeQuestionOne = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordThreeSecurityQuestionOne.q);
        const decryptedPasswordThreeAnswerOne = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordThreeSecurityQuestionOne.a);
        ctx.assertEquals("Third password security question question one", decryptedPasswordThreeQuestionOne.value, "Color");
        ctx.assertEquals("Third password security question answer one", decryptedPasswordThreeAnswerOne.value, "Green");

        const passwordThreeSecurityQuestionTwo = Object.values(passwordThree[0].q)[1];
        const decryptedPasswordThreeQuestionTwo = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordThreeSecurityQuestionTwo.q);
        const decryptedPasswordThreeAnswerTwo = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, passwordThreeSecurityQuestionTwo.a);
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
        await importer.import('', userManager.defaultUser.vaulticKey, records, csvHeaderPropertiesDict);

        const mfaGroup = app.currentVault.groupStore.valuesGroups.filter(g => g.n == "MFA Codes");
        ctx.assertEquals("Imported MFA Codes Group exists", mfaGroup.length, 1);
        ctx.assertEquals("MFA Codes Group has 1 value", OH.size(mfaGroup[0].v), 1);

        const valueOne = app.currentVault.valueStore.nameValuePairs.filter(v => v.n == "phone code");
        const decryptedValueOne = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, valueOne[0].v);

        ctx.assertEquals("First value exists", valueOne.length, 1);
        ctx.assertEquals("First value value set properly", decryptedValueOne.value!, "1234");
        ctx.assertEquals("First value type", valueOne[0].y, NameValuePairType.Passcode);

        const valueTwo = app.currentVault.valueStore.nameValuePairs.filter(v => v.n == "mfa code");
        const decryptedValueTwo = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, valueTwo[0].v);

        ctx.assertEquals("Second value exists", valueTwo.length, 1);
        ctx.assertEquals("Second value value set properly", decryptedValueTwo.value!, "FVewogldnion2g2hyp9jgdsoighoeoh");
        ctx.assertEquals("Second value additional information is correct", valueTwo[0].a, "Code for Mfa");
        ctx.assertTruthy("Second value has mfa group", valueTwo[0].g[mfaGroup[0].id]);
        ctx.assertEquals("Second value type", valueTwo[0].y, NameValuePairType.MFAKey);

        const valueThree = app.currentVault.valueStore.nameValuePairs.filter(v => v.n == "bank verbal code");
        const decryptedValueThree = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, valueThree[0].v);

        ctx.assertEquals("Third value exists", valueOne.length, 1);
        ctx.assertEquals("Third value value set properly", decryptedValueThree.value!, "i like sheep");
        ctx.assertEquals("Third value additional information is correct", valueThree[0].a, "for me bank");
        ctx.assertEquals("Third value type", valueThree[0].y, NameValuePairType.Other);
    }
});

const passwordHeaderMapper: Map<string, string> = new Map([
    ["Login", "l"],
    ["Email", "e"],
    ["Domain", "d"],
    ["Additional Info", "a"],
    ["Password For", "f"]
]);

// In order for this test to pass, all other passwords and groups added via other tests must have unique logins / names
importExportHelperTestSuite.tests.push({
    name: "Export Passwords Works", func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.n = "Any's Group";
        await userManager.defaultUser.addGroup("Add Group 1", ctx, groupOne);

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.n = "Mary's Group";
        await userManager.defaultUser.addGroup("Add Group 2", ctx, groupTwo);

        await createPassword("John", "facebook.com", "john@google.com", "JohnP", "Facebook", "", [], [], { [groupOne.id]: true });
        await createPassword("Mary", "google.com", "maryL@outlook.com", "VJweiohgoinu2ith29hiodg", "Google", "For google",
            ["What is your first name", "Where were you born"], ["Maryelis", "Alaska"],
            { [groupOne.id]: true, [groupTwo.id]: true });

        const formattedPasswords = await getExportablePasswords('', userManager.defaultUser.vaulticKey);
        const rows = formattedPasswords.split('\n');
        const headers = rows[0].replace(/"|\\"/g, '').split(',');

        let exportedCount = 0;
        for (let i = 1; i < rows.length; i++)
        {
            const rowValues = rows[i].replace(/"|\\"/g, '').split(',');
            if (rowValues.every(v => v == ""))
            {
                continue;
            }

            exportedCount += 1;
            let password = app.currentVault.passwordStore.passwords.filter(p => p.l == rowValues[0])[0];

            for (let j = 1; j < rowValues.length; j++)
            {
                if (headers[j] == "Password")
                {
                    const decryptedPassword = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, password.p);
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
                        ctx.assertEquals("No security question answers", OH.size(password.q), 0);
                        continue;
                    }

                    const securityQuestionQuestions = rowValues[j].split(';');
                    ctx.assertEquals(`Same amount of security question questions`, securityQuestionQuestions.length, OH.size(password.q));

                    OH.forEachValue(password.q, async (value) => 
                    {
                        const decryptedSecurityQuestionQuestion = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, value.q);
                        if (!decryptedSecurityQuestionQuestion.success)
                        {
                            throw "Failed to decrypted security question quesiton";
                        }

                        ctx.assertTruthy(`Security question question exists in export`, securityQuestionQuestions.includes(decryptedSecurityQuestionQuestion.value!));
                    });
                }
                else if (headers[j] == "Security Question Answers")
                {
                    if (!rowValues[j])
                    {
                        ctx.assertEquals("No security question questions", OH.size(password.q), 0);
                        continue;
                    }

                    const securityQuestionAnswer = rowValues[j].split(';');
                    ctx.assertEquals(`Same amount of security question answers`, securityQuestionAnswer.length, OH.size(password.q));

                    OH.forEachValue(password.q, async (value) => 
                    {
                        const decryptedSecurityQuestionAnswer = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, value.a);
                        if (!decryptedSecurityQuestionAnswer.success)
                        {
                            throw "Failed to decrypted security question answer";
                        }

                        ctx.assertTruthy(`Security question answer exists in export`, securityQuestionAnswer.includes(decryptedSecurityQuestionAnswer.value!));
                    });
                }
                else if (headers[j] == "Groups")
                {
                    if (!rowValues[j])
                    {
                        ctx.assertEquals("No groups", OH.size(password.g), 0);
                        continue;
                    }

                    const groups = rowValues[j].split(';');
                    ctx.assertEquals(`Group count equals passwords group count`, groups.length, OH.size(password.g));

                    for (let k = 0; k < groups.length; k++)
                    {
                        const group = app.currentVault.groupStore.passwordGroups.filter(g => g.n == groups[k]);
                        ctx.assertTruthy(`Group has password`, group[0].p[password.id]);
                    }
                }
                else
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals passwords ${headers[j]}`, rowValues[j], password[passwordHeaderMapper.get(headers[j])!]);
                }
            }
        }

        ctx.assertEquals("Exported all passwords", app.currentVault.passwordStore.passwords.length, exportedCount);

        async function createPassword(login: string, domain: string, email: string, password: string, passwordFor: string, additionalInfo: string,
            secrutiyQuestionQuestions: string[], securityQuestionAnswers: string[], groups: DictionaryAsList)
        {
            let testPassword = defaultPassword();
            testPassword.l = login;
            testPassword.d = domain;
            testPassword.e = email;
            testPassword.p = password;
            testPassword.f = passwordFor;
            testPassword.a = additionalInfo;
            testPassword.g = groups;

            const addedSecurityQuestions: SecurityQuestion[] = [];
            for (let i = 0; i < secrutiyQuestionQuestions.length; i++)
            {
                const securityQuestion = 
                {
                    id: i.toString(),
                    q: secrutiyQuestionQuestions[i],
                    a: securityQuestionAnswers[i],
                };

                addedSecurityQuestions.push(securityQuestion);
            }

            await userManager.defaultUser.addPassword("Add password " + login, ctx, testPassword, addedSecurityQuestions);
        }
    }
});

const valueHeaderMapper: Map<string, string> = new Map([
    ["Name", "n"],
    ["Value Type", "y"],
    ["Additional Info", "a"],
]);

// In order for this test to pass, all other values and groups added via other tests must have unique names
importExportHelperTestSuite.tests.push({
    name: "Export Values Works", func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.NameValuePairs);
        groupOne.n = "Any";
        await userManager.defaultUser.addGroup("Group 1", ctx, groupOne);

        const groupTwo = defaultGroup(DataType.NameValuePairs);
        groupTwo.n = "Banks";
        await userManager.defaultUser.addGroup("Group 1", ctx, groupTwo);

        await createValue("Phone Code", "1234", NameValuePairType.Passcode, "", { [groupOne.id]: true });
        await createValue("Bank Verbal Code", "sleepy time", NameValuePairType.Passcode, "For the bank",
            { [groupOne.id]: true, [groupTwo.id]: true });

        const formattedValues = await getExportableValues('', userManager.defaultUser.vaulticKey);
        const rows = formattedValues.split('\n');
        const headers = rows[0].replace(/"|\\"/g, '').split(',');

        let exportedCount = 0;
        for (let i = 1; i < rows.length; i++)
        {
            const rowValues = rows[i].replace(/"|\\"/g, '').split(',');
            if (rowValues.every(v => v == ""))
            {
                continue;
            }

            exportedCount += 1;
            let value: NameValuePair = app.currentVault.valueStore.nameValuePairs.filter(v => v.n == rowValues[0])[0];

            for (let j = 1; j < rowValues.length; j++)
            {
                if (headers[j] == "Value")
                {
                    const decryptedValue = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, value.v);
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
                        ctx.assertEquals("No groups", OH.size(value.g), 0);
                        continue;
                    }

                    const groups = rowValues[j].split(';');
                    ctx.assertEquals(`Group count equals values group count`, groups.length, OH.size(value.g));

                    for (let k = 0; k < groups.length; k++)
                    {
                        const group = app.currentVault.groupStore.valuesGroups.filter(g => g.n == groups[k]);
                        ctx.assertTruthy("Group has value", group[0].v[value.id]);
                    }
                }
                else 
                {
                    ctx.assertEquals(`Row ${i} ${headers[j]} equals values ${headers[j]}`, rowValues[j], value[valueHeaderMapper.get(headers[j])!]);
                }
            }
        }

        ctx.assertEquals("Exported all values", app.currentVault.valueStore.nameValuePairs.length, exportedCount);
        app.popups.hideLoadingIndicator();

        async function createValue(name: string, value: string, valueType: NameValuePairType, additionalInfo: string, groups: DictionaryAsList)
        {
            let testValue = defaultValue();
            testValue.n = name;
            testValue.v = value;
            testValue.y = valueType;
            testValue.a = additionalInfo;
            testValue.g = groups;

            await userManager.defaultUser.addNameValuePair("Add Value " + name, ctx, testValue);
        }
    }
});

export default importExportHelperTestSuite;