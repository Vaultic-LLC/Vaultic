import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";
import { api } from '../../src/core/API';

let vaultStoreTestSuite = createTestSuite("Vault Store");

const masterKey = "test";
const email = "test@gmail.com";

vaultStoreTestSuite.tests.push({
    name: "Logging in records login", func: async (ctx: TestContext) =>
    {
        const dateObj = new Date(Date.now());
        const todayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

        const logInRecords = app.currentVault.loginHistory[todayKey];
        await app.lock();

        const response = await api.helpers.server.logUserIn(masterKey, email, false, false);
        ctx.assertTruthy("Log in was successful", response.success);

        app.isOnline = true;
        await app.loadUserData(masterKey, response.value!.UserDataPayload);

        const newLogInRecords = app.currentVault.loginHistory[todayKey];
        const addedLogin = newLogInRecords.filter(n => !logInRecords.includes(n));
        ctx.assertEquals("New log in record", addedLogin.length, 1);

        const oneMinutesAgo = Date.now() - (1000 * 60);
        ctx.assertTruthy("New log in happened less than a minute ago", addedLogin[0] > oneMinutesAgo);
    }
});

export default vaultStoreTestSuite;