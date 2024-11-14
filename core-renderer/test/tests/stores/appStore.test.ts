import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";
import { api } from '../../src/core/API';
import { AutoLockTime } from '../../src/core/Types/Settings';

let appStoreTestSuite = createTestSuite("App Store");

const masterKey = "test";
const email = "test@gmail.com";

appStoreTestSuite.tests.push({
    name: "Load User Data Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(masterKey, email, true, false);
        ctx.assertTruthy("Log user in works", response.success);
        app.isOnline = true;

        await app.loadUserData(masterKey, response.value!.UserDataPayload);
        ctx.assertEquals("One UserVault", app.userVaults.value.length, 1);

        const currentState = app.cloneState();
        currentState.settings.value.autoLockTime.value = AutoLockTime.ThirtyMinutes;
        app.updateState(currentState);
    }
});

appStoreTestSuite.tests.push({
    name: "Create New Vault works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "CreateNewVaultTest", false);
        ctx.assertTruthy("Create New Vault Succeeded", response);
        ctx.assertEquals("Two UserVaults", app.userVaults.value.length, 2);
        ctx.assertEquals("Vault has correct name", app.userVaults.value.filter(v => v.name == "CreateNewVaultTest").length, 1);
    }
});

appStoreTestSuite.tests.push({
    name: "Create New Vault Set As Active Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "CreateNewVaultSetAsActiveTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(uv => uv.userVaultID == app.currentVault.userVaultID);
        ctx.assertEquals("Created Vault Is Current", userVault?.[0]?.name, "CreateNewVaultSetAsActiveTest");
    }
});

appStoreTestSuite.tests.push({
    name: "Update Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "UpdateVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "UpdateVaultWorksTest")[0];
        userVault.name = "UpdatedNameForUpdateVaultWorksTest";

        await app.updateVault(masterKey, userVault);
        const updatedUserVault = app.userVaults.value.filter(v => v.name == "UpdatedNameForUpdateVaultWorksTest");

        ctx.assertEquals("Updated Vault Exists With Name", updatedUserVault.length, 1);
        ctx.assertEquals("Updated Vault has same userVaultID", userVault.userVaultID, updatedUserVault[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "ArchiveVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "ArchiveVaultWorksTest");
        const archiveSucceeded = await app.archiveVault(masterKey, userVault[0].userVaultID!);

        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const archivedVault = app.archivedVaults.value.filter(v => v.name == "ArchiveVaultWorksTest");
        ctx.assertEquals("Archive Vault Exists", archivedVault.length, 1);
        ctx.assertEquals("Archive Vault is not in UserVaults", app.userVaults.value.filter(v => v.name == "ArchiveVaultWorksTest").length, 0);
        ctx.assertEquals("Active Vault equals archvied Vault", app.currentVault.userVaultID, archivedVault[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Load Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "LoadArchiveVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "LoadArchiveVaultWorksTest");
        await app.archiveVault(masterKey, archivedUserVault[0].userVaultID!);

        const loadArchiveSucceeded = await app.loadArchivedVault(masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Load archive Succeeded", loadArchiveSucceeded);
        ctx.assertEquals("Current Vault is Archived Vault", app.currentVault.userVaultID, archivedUserVault[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Un Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "UnArchiveVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest");
        const archiveSucceeded = await app.archiveVault(masterKey, archivedUserVault[0].userVaultID!);

        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const unarchiveVaultSucceeded = await app.unarchiveVault(masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Un Archive Vault Succeeded", unarchiveVaultSucceeded);

        const userVault = app.userVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest");
        ctx.assertEquals("Un Archive Vault exists in UserVaults", userVault.length, 1);
        ctx.assertEquals("Un Archive Vault does not exist in Archived Vaults", app.archivedVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest").length, 0);
    }
});

appStoreTestSuite.tests.push({
    name: "Permanently Delete Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "PermanentlyDeleteVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "PermanentlyDeleteVaultWorksTest");
        const archiveSucceeded = await app.archiveVault(masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const deleteSucceeded = await app.permanentlyDeleteVault(masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Permanently Delete Vault Works", deleteSucceeded);
        ctx.assertEquals("ArchivedVault does not exist", app.archivedVaults.value.filter(v => v.name == "PermanentlyDeleteVaultWorksTest").length, 0);
        ctx.assertEquals("Current Vault is first UserVault", app.currentVault.userVaultID, app.userVaults.value[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Set Active Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(masterKey, "SetActiveVaultWorksTest", false);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "SetActiveVaultWorksTest")[0];
        ctx.assertTruthy("Not currently active", app.currentVault.userVaultID != userVault.userVaultID);

        const setActiveSucceed = await app.setActiveVault(masterKey, userVault.userVaultID!);
        ctx.assertTruthy("Set Active Succeeded", setActiveSucceed);
        ctx.assertEquals("Active User Vault UserVaultID", app.currentVault.userVaultID, userVault.userVaultID);
    }
});

export default appStoreTestSuite;