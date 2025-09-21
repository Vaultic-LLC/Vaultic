import { createTestSuite, type TestContext } from '@lib/test';
import app from "@renderer/Objects/Stores/AppStore";
import { api } from "@renderer/API";
import userManager from '@lib/userManager';
import localDatabase from "@lib/localDatabaseBridge";
import { publicServerDB } from "@lib/serverDatabaseBridge";

let appStoreTestSuite = createTestSuite("App Store");

appStoreTestSuite.tests.push({
    name: "Load User Data Works", func: async (ctx: TestContext) =>
    {
        const response = await api.helpers.server.logUserIn(userManager.defaultUser.masterKey, 
            userManager.defaultUser.email, true, false);

        ctx.assertTruthy("Log user in works", response.success);
        app.isOnline = true;

        const laodUserDataResponse = await app.loadUserData(userManager.defaultUser.vaulticKey);
        ctx.assertTruthy("Load data succeeded", laodUserDataResponse);
        ctx.assertTruthy("Has UserVaults", app.userVaults.value.length > 0);
    }
});

appStoreTestSuite.tests.push({
    name: "Create New Vault works", func: async (ctx: TestContext) =>
    {
        const currentUserVaultCount = app.userVaults.value.length;
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "CreateNewVaultTest", false);
        
        ctx.assertTruthy("Create New Vault Succeeded", response);
        ctx.assertEquals("One additional userVault", app.userVaults.value.length, currentUserVaultCount + 1);
        ctx.assertTruthy("Added vault exists", app.userVaults.value.some(v => v.name == "CreateNewVaultTest"));
    }
});

appStoreTestSuite.tests.push({
    name: "Create New Vault Set As Active Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "CreateNewVaultSetAsActiveTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(uv => uv.userVaultID == app.currentVault.userVaultID);
        ctx.assertEquals("Created Vault Is Current", userVault?.[0]?.name, "CreateNewVaultSetAsActiveTest");
    }
});

appStoreTestSuite.tests.push({
    name: "Update Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "UpdateVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "UpdateVaultWorksTest")[0];
        userVault.name = "UpdatedNameForUpdateVaultWorksTest";

        await app.updateVault(userManager.defaultUser.vaulticKey, userVault);
        const updatedUserVault = app.userVaults.value.filter(v => v.name == "UpdatedNameForUpdateVaultWorksTest");

        ctx.assertEquals("Updated Vault Exists With Name", updatedUserVault.length, 1);
        ctx.assertEquals("Updated Vault has same userVaultID", userVault.userVaultID, updatedUserVault[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "ArchiveVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "ArchiveVaultWorksTest");
        const archiveSucceeded = await app.archiveVault(userManager.defaultUser.vaulticKey, userVault[0].userVaultID!);

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
        const testUser = userManager.getCurrentUser()!;
        const response = await app.createNewVault(testUser.masterKey, "LoadArchiveVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "LoadArchiveVaultWorksTest");
        await app.archiveVault(testUser.masterKey, archivedUserVault[0].userVaultID!);

        const loadArchiveSucceeded = await app.loadArchivedVault(testUser.masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Load archive Succeeded", loadArchiveSucceeded);
        ctx.assertEquals("Current Vault is Archived Vault", app.currentVault.userVaultID, archivedUserVault[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Un Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const testUser = userManager.getCurrentUser()!;
        const response = await app.createNewVault(testUser.masterKey, "UnArchiveVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest");
        const archiveSucceeded = await app.archiveVault(testUser.masterKey, archivedUserVault[0].userVaultID!);

        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const unarchiveVaultSucceeded = await app.unarchiveVault(testUser.masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Un Archive Vault Succeeded", unarchiveVaultSucceeded);

        const userVault = app.userVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest");
        ctx.assertEquals("Un Archive Vault exists in UserVaults", userVault.length, 1);
        ctx.assertEquals("Un Archive Vault does not exist in Archived Vaults", app.archivedVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest").length, 0);
    }
});

appStoreTestSuite.tests.push({
    name: "Permanently Delete Vault Works", func: async (ctx: TestContext) =>
    {
        const testUser = userManager.getCurrentUser()!;
        const response = await app.createNewVault(testUser.masterKey, "PermanentlyDeleteVaultWorksTest", true);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "PermanentlyDeleteVaultWorksTest");
        const archiveSucceeded = await app.archiveVault(testUser.masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const deleteSucceeded = await app.permanentlyDeleteVault(testUser.masterKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Permanently Delete Vault Works", deleteSucceeded);
        ctx.assertEquals("ArchivedVault does not exist", app.archivedVaults.value.filter(v => v.name == "PermanentlyDeleteVaultWorksTest").length, 0);
        ctx.assertEquals("Current Vault is first UserVault", app.currentVault.userVaultID, app.userVaults.value[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Set Active Vault Works", func: async (ctx: TestContext) =>
    {
        const testUser = userManager.getCurrentUser()!;
        const response = await app.createNewVault(testUser.masterKey, "SetActiveVaultWorksTest", false);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "SetActiveVaultWorksTest")[0];
        ctx.assertTruthy("Not currently active", app.currentVault.userVaultID != userVault.userVaultID);

        const setActiveSucceed = await app.setActiveVault(testUser.masterKey, userVault.userVaultID!);
        ctx.assertTruthy("Set Active Succeeded", setActiveSucceed);
        ctx.assertEquals("Active User Vault UserVaultID", app.currentVault.userVaultID, userVault.userVaultID);
    }
});

export default appStoreTestSuite;