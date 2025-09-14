import app from "@renderer/Objects/Stores/AppStore";
import { api } from "@renderer/API";
import { createTestSuite, TestContext } from "@lib/test";
import userManager from "@lib/userManager";

let serverHelperTestSuite = createTestSuite("Server Helper");

serverHelperTestSuite.tests.push({
    name: "Register and First Log In Works", func: async (ctx: TestContext) =>
    {
        const createdUser = await userManager.createNewUser(ctx);
        ctx.assertTruthy("Create new user works", !!createdUser);

        await app.lock();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In Works", func: async (ctx: TestContext) =>
    {
        const logInResponse = await userManager.logUserIn(ctx, 1);
        ctx.assertTruthy("Log in works", logInResponse);

        await app.lock();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In With No Current Data Works", func: async (ctx: TestContext) =>
    {
        const recreateDatabase = await api.environment.recreateDatabase();
        ctx.assertTruthy("Recreate Database worked", recreateDatabase);

        const logInResponse = await userManager.logUserIn(ctx, 1);
        ctx.assertTruthy("Log in works", logInResponse);
    }
});

export default serverHelperTestSuite;