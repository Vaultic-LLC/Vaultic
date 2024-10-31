import app from "../../src/core/Objects/Stores/AppStore";
import { api } from "../../src/core/API";
import { createTestSuite, TestContext } from "../test";
import { AutoLockTime } from "../../src/core/Types/Settings";

let serverHelperTestSuite = createTestSuite("Server Helper");

const masterKey = "test";
const email = "test@gmail.com"

let publicKey = "";
let privateKey = "";

serverHelperTestSuite.tests.push({
    name: "Register User Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.registerUser(masterKey, email, "Test", "Test");
        publicKey = response.PublicKey!;
        privateKey = response.PrivateKey!;

        ctx.assertTruthy("Register user works", response.Success);
    }
});

serverHelperTestSuite.tests.push({
    name: "First Log In Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(masterKey, email, true, false);
        ctx.assertTruthy("Log user in works", response.success);

        await api.repositories.users.createUser(masterKey, email, publicKey, privateKey);

        app.isOnline = true;
        await app.loadUserData(masterKey, response.value!.UserDataPayload);

        const settings = app.cloneState();
        settings.settings.autoLockTime = AutoLockTime.ThirtyMinutes;
        app.updateState(settings);

        await app.lock();
    }
});

serverHelperTestSuite.tests.push({
    name: "Re Log In Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(masterKey, email, false, false);
        ctx.assertTruthy("Log user in works", response.success);
    }
});

export default serverHelperTestSuite;