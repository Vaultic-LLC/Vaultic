import { api } from "@renderer/API";
import { createTestSuite, TestContext, TestSuites } from "@lib/test";
import userManager, { User } from "@lib/userManager";

let serverHelperTestSuite = createTestSuite("Server Helper", TestSuites.ServerHelper);

serverHelperTestSuite.tests.push({
    name: "Register and First Log In Works", func: async (ctx: TestContext) =>
    {
        const user = await userManager.createNewUser(ctx);
        ctx.assertTruthy("Create new user works", !!user);

        await userManager.logCurrentUserOut();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In Works", func: async (ctx: TestContext) =>
    {
        const logInResponse = await userManager.logUserIn(ctx, userManager.defaultUserID!);
        ctx.assertTruthy("Log in works", logInResponse);

        await userManager.logCurrentUserOut();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In With No Current Data Works", func: async (ctx: TestContext) =>
    {
        const recreateDatabase = await api.environment.recreateDatabase();
        ctx.assertTruthy("Recreate Database worked", recreateDatabase);

        const logInResponse = await userManager.logUserIn(ctx, userManager.defaultUserID!);
        ctx.assertTruthy("Log in works", logInResponse);
    }
});

// TODO: should test the other options for logging in like resetting all of the users data

export default serverHelperTestSuite;