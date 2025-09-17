import { api } from "@renderer/API";
import { createTestSuite, TestContext } from "@lib/test";
import userManager, { User } from "@lib/userManager";

let serverHelperTestSuite = createTestSuite("Server Helper");

type TestState =
{
    user: User | undefined;
}

serverHelperTestSuite.tests.push({
    name: "Register and First Log In Works", func: async (ctx: TestContext<TestState>) =>
    {
        ctx.state.user = await userManager.createNewUser(ctx);
        ctx.assertTruthy("Create new user works", !!ctx.state.user);

        await userManager.logCurrentUserOut();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In Works", func: async (ctx: TestContext<TestState>) =>
    {
        const logInResponse = await userManager.logUserIn(ctx, ctx.state.user!.id);
        ctx.assertTruthy("Log in works", logInResponse);

        await userManager.logCurrentUserOut();
    }
});

serverHelperTestSuite.tests.push({
    name: "Log In With No Current Data Works", func: async (ctx: TestContext<TestState>) =>
    {
        const recreateDatabase = await api.environment.recreateDatabase();
        ctx.assertTruthy("Recreate Database worked", recreateDatabase);

        const logInResponse = await userManager.logUserIn(ctx, ctx.state.user!.id);
        ctx.assertTruthy("Log in works", logInResponse);
    }
});

export default serverHelperTestSuite;