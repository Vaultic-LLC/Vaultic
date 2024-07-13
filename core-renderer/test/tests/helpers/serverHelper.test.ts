import { api } from "../../src/core/API";
import { createTestSuite, TestContext } from "../test";

let serverHelperTestSuite = createTestSuite("Server Helper");

const masterKey = "test";

serverHelperTestSuite.tests.push({
    name: "Register User Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.registerUser(masterKey, "test@gmail.com", "Test", "Test");
        ctx.assertTruthy("Register user works", response.Success);
    }
});

serverHelperTestSuite.tests.push({
    name: "Log User In Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(masterKey, "test@gmail.com");
        ctx.assertTruthy("Log user in works", response.Success);
    }
});

export default serverHelperTestSuite;