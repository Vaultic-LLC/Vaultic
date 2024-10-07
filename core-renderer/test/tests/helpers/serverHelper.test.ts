import app from "../../src/core/Objects/Stores/AppStore";
import { api } from "../../src/core/API";
import { createTestSuite, TestContext } from "../test";

let serverHelperTestSuite = createTestSuite("Server Helper");

const masterKey = "test";
const email = "test@gmail.com"

serverHelperTestSuite.tests.push({
    name: "Register User Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.registerUser(masterKey, email, "Test", "Test");
        ctx.assertTruthy("Register user works", response.Success);
    }
});

serverHelperTestSuite.tests.push({
    name: "First Log In Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(masterKey, email, true);
        ctx.assertTruthy("Log user in works", response.Success);

        await api.repositories.users.createUser(masterKey, email)

        app.isOnline = true;
        await app.loadUserData(masterKey, response.userDataPayload);
        await app.lock();
    }
});

serverHelperTestSuite.tests.push({
    name: "Re Log In Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(masterKey, email, false);
        ctx.assertTruthy("Log user in works", response.Success);

        app.isOnline = true;
        await app.loadUserData(masterKey, response.userDataPayload);
    }
});

export default serverHelperTestSuite;