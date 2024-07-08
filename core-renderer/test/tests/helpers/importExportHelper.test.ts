import { stores } from "../../src/core/Objects/Stores";
import { buildCSVPropertyMappers, importData } from "../../src/core/Helpers/ImportExportHelper";
import { createTestSuite, TestContext } from "../test";
import { parse } from "csv-parse/sync";
import { CSVHeaderPropertyMapperModel } from "../../src/core/Types/Models";
import { DataType } from "src/core/Types/Table";
import { defaultPassword, Password } from "../../src/core/Types/EncryptedData";
import cryptHelper from "src/core/Helpers/cryptHelper";

let importExportHelperTestSuite = createTestSuite("Import / Export");
const masterKey = "test";

importExportHelperTestSuite.tests.push({
    name: "Import Passwords Works", func: async (ctx: TestContext) =>
    {
        const mockCSVPasswords =
            "Login,Password,Domain,Tag,Email\n" +
            "johnp,password1,google.com,google,john@gmail.com\n" +
            "johnpeterson,AnotherPassword,facebook.com,facebook,john@gmail.com\n" +
            "johnJPeter,PasswordAnother,google.com,google,john@gmail.com";

        const csvHeaderPropertyMapperModels: CSVHeaderPropertyMapperModel[] = [
            { property: 'login', csvHeader: 0 }, { property: 'password', csvHeader: 1 }, { property: 'email', csvHeader: 4 },
            { property: 'domain', csvHeader: 2 }, { property: 'groups', csvHeader: 3 }, { property: 'additionalInformation', csvHeader: 4 }];

        const [groupIndex, csvHeaderPropertiesDict] = buildCSVPropertyMappers(csvHeaderPropertyMapperModels);
        const records: string[][] = parse(mockCSVPasswords, { bom: true });

        await importData('', masterKey, records, csvHeaderPropertiesDict, groupIndex, DataType.Passwords, defaultPassword,
            (value: Password) => stores.passwordStore.addPassword(masterKey, value));

        const googleGroup = stores.groupStore.passwordGroups.filter(g => g.name == "google");
        ctx.assertEquals("Imported Google Group exists", googleGroup.length, 1);
        ctx.assertEquals("Groogle Group has 2 passwords", googleGroup[0].passwords.length, 2);

        const facebookGroup = stores.groupStore.passwordGroups.filter(g => g.name == "facebook");
        ctx.assertEquals("Imported Facebook Group exists", facebookGroup.length, 1);
        ctx.assertEquals("Facebook Group has 1 passwords", facebookGroup[0].passwords.length, 1);

        const passwordOne = stores.passwordStore.passwords.filter(p => p.login == "johnp");
        const decryptedPassword = await cryptHelper.decrypt(masterKey, passwordOne[0].password);

        ctx.assertEquals("First password exists", passwordOne.length, 1);
        ctx.assertEquals("First password duplicate csv header set correctly", passwordOne[0].additionalInformation, passwordOne[0].email);
        ctx.assertTruthy("First password has google group", passwordOne[0].groups.includes(googleGroup[0].id));
        ctx.assertEquals("First password password set properly", decryptedPassword.value!, "password1");
        ctx.assertEquals("First password domain set properly", passwordOne[0].domain, "google.com");
        ctx.assertEquals("First password email set properly", passwordOne[0].email, "john@gmail.com");
    }
});