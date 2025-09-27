import { createTestSuite, TestSuites, type TestContext } from '@lib/test';
import app from "@renderer/Objects/Stores/AppStore";
import userManager from '@lib/userManager';

let vaultStoreTestSuite = createTestSuite("Vault Store", TestSuites.VaultStore);

vaultStoreTestSuite.tests.push({
    name: "Logging in records login", func: async (ctx: TestContext) =>
    {
        const logInRecords = app.currentVault.loginHistory.length;

        await userManager.logCurrentUserOut();
        await userManager.logUserIn(ctx, userManager.defaultUser.id);

        const newLogInRecords = app.currentVault.loginHistory.length;
        ctx.assertEquals("New log in record", newLogInRecords, logInRecords + 1);

        const oneMinutesAgo = Date.now() - (1000 * 60);
        ctx.assertTruthy("New log in happened less than a minute ago", app.currentVault.loginHistory[app.currentVault.loginHistory.length - 1] > oneMinutesAgo);
    }
});

export default vaultStoreTestSuite;