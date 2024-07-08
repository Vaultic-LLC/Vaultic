import { stores } from "../../src/core/Objects/Stores";
import { importData } from "../../src/core/Helpers/ImportExportHelper";
import { createTestSuite, TestContext } from "../test";
import { parse } from "csv-parse/sync";

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

        const records: string[][] = parse(mockCSVPasswords, { bom: true });

        await importData()

        const googleGroup = stores.groupStore.passwordGroups.filter(g => g.name == "google");
        ctx.assertEquals("Imported Google Group exists", googleGroup.length, 1);
        ctx.assertEquals("Groogle Group has 2 passwords", googleGroup[0].passwords.length, 2);

        const facebookGroup = stores.groupStore.passwordGroups.filter(g => g.name == "facebook");
        ctx.assertEquals("Imported Facebook Group exists", facebookGroup.length, 1);
        ctx.assertEquals("Facebook Group has 1 passwords", facebookGroup[0].passwords.length, 1);

        const passwordOne = stores.passwordStore.passwords.filter(p => p.login == "johnp");
        ctx.assertEquals("First password exists", passwordOne.length, 1);
    }
});