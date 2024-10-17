import { api } from "../../src/core/API";
import { createTestSuite, TestContext } from "../test";

let cryptUtilityTestSuite = createTestSuite("Crypt Utility");

const masterKey = "test";

cryptUtilityTestSuite.tests.push({
    name: "Encrypt / Decrypt", func: async (ctx: TestContext) =>
    {
        const test = "testValue";
        const encryptResponse = await api.utilities.crypt.encrypt(masterKey, test);
        const decryptResponse = await api.utilities.crypt.decrypt(masterKey, encryptResponse.value!);

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