import app, { AppSettings } from "@renderer/Objects/Stores/AppStore";
import { api } from "@renderer/API";
import { createTestSuite, TestContext } from "@lib/test";
import { AutoLockTime } from "@vaultic/shared/Types/Stores";
import StoreUpdateTransaction from "@renderer/Objects/StoreUpdateTransaction";
import { logUserIn, testUser } from "@lib/utilities";

let serverHelperTestSuite = createTestSuite("Server Helper");

serverHelperTestSuite.tests.push({
    name: "Register User Works", func: async (ctx: TestContext) =>
    {
        const validateEmailResponse = await api.server.user.validateEmail(testUser.email);
        ctx.assertTruthy("Validate Email Response Succeeded", validateEmailResponse.Success);

        const verifyEmailResponse = await api.server.user.verifyEmail(validateEmailResponse.PendingUserToken!, validateEmailResponse.Code!);
        ctx.assertTruthy("Verify Email Response Succeeded", verifyEmailResponse.Success);

        const response = await api.helpers.server.registerUser(testUser.plainMasterKey, validateEmailResponse.PendingUserToken!, "Test", "Test");
        ctx.assertTruthy("Register user works", response.Success);
    }
});

serverHelperTestSuite.tests.push({
    name: "First Log In Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(testUser.plainMasterKey, testUser.email, true, false);
        ctx.assertTruthy("Log user in works", response.success && response.value!.Success);

        const createUserResponse = await api.repositories.users.createUser(testUser.plainMasterKey, testUser.email, "Test", "Test");

        app.isOnline = true;
        const loadDataResponse = await app.loadUserData(createUserResponse.value!);
        ctx.assertTruthy("Load Data works after first login", loadDataResponse);

        const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);

        const state = app.getPendingState()!;
        const reactiveAppSettings: AppSettings = state.createCustomRef("settings", JSON.parse(JSON.stringify(app.settings)));
        reactiveAppSettings.a = AutoLockTime.ThirtyMinutes;

        state.commitProxyObject("settings", reactiveAppSettings);

        transaction.updateUserStore(app, state);
        await transaction.commit(testUser.masterKey);

        await app.lock();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In Works", func: async (ctx: TestContext) =>
    {
        await logUserIn(ctx);
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In With No Current Data Works", func: async (ctx: TestContext) =>
    {
        const recreateDatabase = await api.environment.recreateDatabase();
        ctx.assertTruthy("Recreate Database worked", recreateDatabase);

        await logUserIn(ctx);
    }
});

export default serverHelperTestSuite;