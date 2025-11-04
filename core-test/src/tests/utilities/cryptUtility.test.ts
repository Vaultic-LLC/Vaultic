import cryptHelper from "@renderer/Helpers/cryptHelper";
import { api } from "@renderer/API";
import { createTestSuite, TestContext, TestSuites } from "@lib/test";
import userManager from "@lib/userManager";

let cryptUtilityTestSuite = createTestSuite("Crypt Utility", TestSuites.CryptUtility);

cryptUtilityTestSuite.tests.push({
    name: "Encrypt / Decrypt", func: async (ctx: TestContext) =>
    {
        const testUser = userManager.getCurrentUser()!;
        const test = "testValue";
        const encryptResponse = await cryptHelper.encrypt(testUser.vaulticKey, test);
        const decryptResponse = await cryptHelper.decrypt(testUser.vaulticKey, encryptResponse.value!);

        ctx.assertEquals("Encryption and Decryption Work", decryptResponse.value, test);
    }
});

cryptUtilityTestSuite.tests.push({
    name: "EC Encrypt / EC Decrypt", func: async (ctx: TestContext) =>
    {
        const test = "testValue";

        const keys = await api.utilities.generator.ECKeys();

        const encryptResponse = await api.utilities.crypt.ECEncrypt(keys.public, test);
        const decryptResponse = await api.utilities.crypt.ECDecrypt(encryptResponse.value!.publicKey, keys.private, encryptResponse.value!.data);

        ctx.assertEquals("EC Encryption and EC Decryption Work", decryptResponse.value, test);
    }
});

export default cryptUtilityTestSuite;