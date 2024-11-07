// TODO Have different suites, one for creating backed up data, and then one for verifying it?
// Can run first suite to create it, then close the app and delete local files, then run second suite?
// Or can I just query the database manually via axios? I do know what port its on.
//
// Also need to test syncing between 2 devices and making sure everything gets merged properly
// could have original state.
// make a copy of it
// add password to copy offline
// save offline state in variable
// reload original state
// go online and add a new password that gets backed up
// log out and reload offline state
// log in

// TODO: Should also test that current and previous signatures match after backing up for store states

import { defaultPassword } from "../../src/core/Types/DataTypes";
import { api } from "../../src/core/API";
import app from "../../src/core/Objects/Stores/AppStore";
import { createTestSuite, TestContext } from "../test";

// run the entire app with a few tests in docker (each container would be like a differnt device)?
let backupTestSuite = createTestSuite("Backup");

const masterKey = "test";
const email = "test@gmail.com"

backupTestSuite.tests.push({
    name: "Merging Added Passwords Works", func: async (ctx: TestContext) =>
    {
        await app.lock();

        const resposne = await api.repositories.users.setCurrentUser(masterKey, email);
        ctx.assertTruthy("Set Current user worked", resposne.value)

        const loadUserResponse = await app.loadUserData(masterKey);
        ctx.assertTruthy("Load user data worked", loadUserResponse);

        const password = defaultPassword();
        password.login.value = "Merging Password 1";
        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password succeeded", addPasswordSucceeded);

        //@ts-ignore
        const createResponse = await api.environment.createNewDatabase("vaultic2");

        await app.lock();
        let logInResponse = await api.helpers.server.logUserIn(masterKey, email, true, false);
        ctx.assertTruthy("Log in worked", logInResponse.success);

        const password2 = defaultPassword();
        password.login.value = "Merging Password 2";
        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password2);
        ctx.assertTruthy("Add Password succeeded", addPasswordSucceeded);

        await app.lock();

        // @ts-ignore
        const setAsCurrentResponse = await api.environment.setDatabaseAsCurrent("vaultic2");

        logInResponse = await api.helpers.server.logUserIn(masterKey, email, false, false);
        ctx.assertTruthy("Log in two worked", logInResponse.success);

        const passwordOne = app.currentVault.passwordStore.passwords.find(p => p.value.login.value == "Merging Password 1");
        ctx.assertTruthy("Merged Password one exists", passwordOne);

        const passwordTwo = app.currentVault.passwordStore.passwords.find(p => p.value.login.value == "Merging Password 2");
        ctx.assertTruthy("Merged Password two exists", passwordTwo);
    }
});

export default backupTestSuite;