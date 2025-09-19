import { createTestSuite, type TestContext } from '@lib/test';
import app from "@renderer/Objects/Stores/AppStore";
import { api } from "@renderer/API";

let vaultStoreTestSuite = createTestSuite("Vault Store");

const masterKey = "test";
const email = "test@gmail.com";

vaultStoreTestSuite.tests.push({
    name: "Logging in records login", func: async (ctx: TestContext) =>
    {
        const dateObj = new Date(Date.now());
        const todayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

        const logInRecords = app.currentVault.loginHistory.value.get(todayKey);
        await app.lock();

        const response = await api.helpers.server.logUserIn(masterKey, email, false, false);
        ctx.assertTruthy("Log in was successful", response.success);

        app.isOnline = true;
        await app.loadUserData(masterKey, response.value!.UserDataPayload);

        const newLogInRecords = app.currentVault.loginHistory.value.get(todayKey);

        const addedLogin = newLogInRecords?.value.daysLogin.value.difference(logInRecords!.value.daysLogin.value);
        ctx.assertEquals("New log in record", addedLogin?.size, 1);

        const oneMinutesAgo = Date.now() - (1000 * 60);

        for (const [key, value] of addedLogin!.entries())
        {
            ctx.assertTruthy("New log in happened less than a minute ago", key > oneMinutesAgo);
        }
    }
});

export default vaultStoreTestSuite;