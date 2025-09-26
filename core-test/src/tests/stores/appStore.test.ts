import { createTestSuite, type TestContext } from '@lib/test';
import app from "@renderer/Objects/Stores/AppStore";
import { api } from "@renderer/API";
import userManager from '@lib/userManager';
import localDatabase from "@lib/localDatabaseBridge";
import { publicServerDB } from "@lib/serverDatabaseBridge";
import { FilterStoreState, GroupStoreState, Organization, OrganizationVault, PasswordStoreState, UserOrganization, UserVault, ValueStoreState, Vault, VaultPreferencesStoreState, VaultStoreState } from '@lib/types/serverSchema';
import { IFilterStoreState, IGroupStoreState, IPasswordStoreState, IUserVault, IValueStoreState, IVault, IVaultPreferencesStoreState, IVaultStoreState } from '@vaultic/shared/Types/Entities';

let appStoreTestSuite = createTestSuite("App Store");

async function verifyAllVaultDataInDatabases(test: string, ctx: TestContext, exists: boolean, userVaultID: number, vaultID: number, organizationVaultID?: number)
{
    const localUserVault = (await localDatabase.query<IUserVault>(`SELECT * FROM "UserVaults" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Local UserVault extists", !!localUserVault, exists);
    if (exists)
    {
        ctx.assertEquals("Local UserVault is for user", localUserVault.userID, userManager.defaultUser.id);
        ctx.assertTruthy("Local UserVault is owner", localUserVault.isOwner);
        ctx.assertTruthy("Local UserVault has vaultKey", localUserVault.vaultKey);
        ctx.assertTruthy("Local UserVault doesn't have permissions", !localUserVault.permissions);
        ctx.assertTruthy("Local UserVault has change version", localUserVault.lastLoadedChangeVersion != undefined);
        verifyLocalVaulticEntity(test, ctx, localUserVault);
    }

    const localVaultPreferencesStoreState = (await localDatabase.query<IVaultPreferencesStoreState>(`SELECT * FROM "VaultPreferencesStoreStates" WHERE "UserVaultID" = ${localUserVault?.userVaultID ?? userVaultID}`))[0];
    verifyStoreState(test, ctx, exists, "vaultPreferencesStoreState", localVaultPreferencesStoreState);

    const localVault = (await localDatabase.query<IVault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Local Vault extists", !!localVault, exists);
    if (exists) 
    {
        ctx.assertTruthy("Local Vault has name", localVault.name);
        ctx.assertEquals("Server Vault shared is false", localVault?.shared, false);
        ctx.assertEquals("Local vault is not archived", localVault?.isArchived, false);
        verifyLocalVaulticEntity(test, ctx, localVault);
    }

    const localVaultStoreState = (await localDatabase.query<IVaultStoreState>(`SELECT * FROM "VaultStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    verifyStoreState(test, ctx, exists, "vaultStoreState", localVaultStoreState);

    const localPasswordStoreState = (await localDatabase.query<IPasswordStoreState>(`SELECT * FROM "PasswordStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    verifyStoreState(test, ctx, exists, "passwordStoreState", localPasswordStoreState);

    const localValueStoreState = (await localDatabase.query<IValueStoreState>(`SELECT * FROM "ValueStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    verifyStoreState(test, ctx, exists, "valueStoreState", localValueStoreState);

    const localFilterStoreState = (await localDatabase.query<IFilterStoreState>(`SELECT * FROM "FilterStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    verifyStoreState(test, ctx, exists, "filterStoreState", localFilterStoreState);

    const localGroupStoreState = (await localDatabase.query<IGroupStoreState>(`SELECT * FROM "GroupStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    verifyStoreState(test, ctx, exists, "groupStoreState", localGroupStoreState);

    const serverUserVault = (await publicServerDB.query<UserVault & UserOrganization>(`
        SELECT * 
        FROM "UserVaults" uv
        INNER JOIN "UserOrganizations" uo ON "uv"."UserOrganizationID" = uo."UserOrganizationID"
        WHERE uv."UserVaultID" = ${userVaultID}`))[0];

    ctx.assertEquals("Server UserVault extists", !!serverUserVault, exists);
    if (exists)
    {
        ctx.assertEquals("Server UserVault is for user", serverUserVault.UserID, userManager.defaultUser.id);    
        ctx.assertTruthy("Server UserVault has vaultKey", serverUserVault.VaultKey);
        ctx.assertTruthy("Server UserVault doesn't have permissions", !serverUserVault.Permissions);
        ctx.assertTruthy("Server UserVault has change version", serverUserVault.LastLoadedChangeTrackingVersion != undefined);
    }

    const serverVaultPreferencesStoreState = (await publicServerDB.query<VaultPreferencesStoreState>(`SELECT * FROM "VaultPreferencesStoreStates" WHERE "UserVaultID" = ${userVaultID}`))[0];
    ctx.assertEquals("Server VaultPreferencesStoreState extists", !!serverVaultPreferencesStoreState, exists);

    const serverOrganizationVault = (await publicServerDB.query<OrganizationVault & Organization>(`
        SELECT * 
        FROM "OrganizationVaults" ov
        JOIN "Organizations" o on "ov"."OrganizationID" = "o"."OrganizationID"
        WHERE ov."OrganizationVaultID" = ${serverUserVault?.OrganizationVaultID ?? organizationVaultID}`))[0];

    ctx.assertEquals("Server Org Vault extists", !!serverOrganizationVault, exists);
    if (exists)
    {
        ctx.assertEquals("Server Org Vault is for vault", serverOrganizationVault.VaultID, vaultID);
        ctx.assertEquals("User is owner", serverOrganizationVault.UserIDOwner, userManager.defaultUser.id);
    }

    const serverVault = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Server Vault extists", !!serverVault, exists);
    if (exists)
    {
        ctx.assertTruthy("Server Vault has name", serverVault.Name);
        ctx.assertTruthy("Server Vault is not shared", serverVault.IsShared === false);
        ctx.assertTruthy("Server Vault is not archived", serverVault.IsArchived === false);        
    }

    const serverVaultStoreState = (await publicServerDB.query<VaultStoreState>(`SELECT * FROM "VaultStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Server VaultStoreState extists", !!serverVaultStoreState, exists);

    const serverPasswordStoreState = (await publicServerDB.query<PasswordStoreState>(`SELECT * FROM "PasswordStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Server PasswordStoreState extists", !!serverPasswordStoreState, exists);

    const serverValueStoreState = (await publicServerDB.query<ValueStoreState>(`SELECT * FROM "ValueStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Server ValueStoreState extists", !!serverValueStoreState, exists);

    const serverFilterStoreState = (await publicServerDB.query<FilterStoreState>(`SELECT * FROM "FilterStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Server FilterStoreState extists", !!serverFilterStoreState, exists);

    const serverGroupStoreState = (await publicServerDB.query<GroupStoreState>(`SELECT * FROM "GroupStoreStates" WHERE "VaultID" = ${vaultID}`))[0];
    ctx.assertEquals("Server GroupStoreState extists", !!serverGroupStoreState, exists);
}

function verifyLocalVaulticEntity(test: string, ctx: TestContext, entity: any)
{
    ctx.assertTruthy(`Verify Vaultic Entity has current signature for ${test}`, entity.currentSignature);
    ctx.assertTruthy(`Verify Vaultic Entity has entity state for ${test}`, entity.entityState);
}

function verifyStoreState(test: string, ctx: TestContext, exists: boolean, storeStateName: string, storeState: any)
{
    ctx.assertEquals(`Local ${storeStateName} extists`, !!storeState, exists);
    if (exists)
    {
        ctx.assertTruthy(`Local ${storeStateName} has state`, storeState.state);
        ctx.assertTruthy(`Local ${storeStateName} has previous signature`, storeState.previousSignature);
        verifyLocalVaulticEntity(test, ctx, storeState);
    }
}

appStoreTestSuite.tests.push({
    name: "Load User Data Works", func: async (ctx: TestContext) =>
    {
        await userManager.logCurrentUserOut();
        await userManager.logUserIn(ctx, userManager.defaultUser.id);
        ctx.assertTruthy("Has UserVaults", app.userVaults.value.length > 0);
    }
});

appStoreTestSuite.tests.push({
    name: "Create New Vault works", func: async (ctx: TestContext) =>
    {
        const currentUserVaultCount = app.userVaults.value.length;
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "CreateNewVaultTest", false, false, [], []);
        
        const vault = app.userVaults.value.filter(v => v.name == "CreateNewVaultTest")[0];
        ctx.assertTruthy("Create New Vault Succeeded", response);
        ctx.assertEquals("One additional userVault", app.userVaults.value.length, currentUserVaultCount + 1);
        ctx.assertTruthy("Added vault exists", vault);

        await verifyAllVaultDataInDatabases("Create new vault works", ctx, true, vault.userVaultID, vault.vaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Create New Vault Set As Active Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "CreateNewVaultSetAsActiveTest", false, true, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(uv => uv.userVaultID == app.currentVault.userVaultID);
        ctx.assertEquals("Created Vault Is Current", userVault?.[0]?.name, "CreateNewVaultSetAsActiveTest");

        await verifyAllVaultDataInDatabases("Create new vault set as active works", ctx, true, userVault[0].userVaultID, userVault[0].vaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Update Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "UpdateVaultWorksTest", false, true, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "UpdateVaultWorksTest")[0];
        await verifyAllVaultDataInDatabases("Update vault works", ctx, true, userVault.userVaultID, userVault.vaultID);

        const oldLocalVaultName = (await localDatabase.query<IVault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${userVault.vaultID}`))[0].name;
        const oldServerVaultName = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${userVault.vaultID}`))[0].Name;

        userVault.name = "UpdatedNameForUpdateVaultWorksTest";

        await app.updateVault(userManager.defaultUser.vaulticKey, userVault, false, [], [], [], [], []);
        const updatedUserVault = app.userVaults.value.filter(v => v.name == "UpdatedNameForUpdateVaultWorksTest");

        ctx.assertEquals("Updated Vault Exists With Name", updatedUserVault.length, 1);
        ctx.assertEquals("Updated Vault has same userVaultID", userVault.userVaultID, updatedUserVault[0].userVaultID);

        const newLocalVaultName = (await localDatabase.query<IVault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${userVault.vaultID}`))[0].name;
        const newServerVaultName = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${userVault.vaultID}`))[0].Name;

        ctx.assertTruthy("Local vault name changed", newLocalVaultName !== oldLocalVaultName);
        ctx.assertTruthy("Server vault name changed", newServerVaultName !== oldServerVaultName);
    }
});

appStoreTestSuite.tests.push({
    name: "Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "ArchiveVaultWorksTest", false, true, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);
        
        const userVault = app.userVaults.value.filter(v => v.name == "ArchiveVaultWorksTest");
        await verifyAllVaultDataInDatabases("Archive vault works", ctx, true, userVault[0].userVaultID, userVault[0].vaultID);

        const archiveSucceeded = await app.updateArchiveStatus(userManager.defaultUser.vaulticKey, userVault[0].userVaultID!, true);

        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const archivedVault = app.archivedVaults.value.filter(v => v.name == "ArchiveVaultWorksTest");
        ctx.assertEquals("Archive Vault Exists", archivedVault.length, 1);
        ctx.assertEquals("Active Vault equals archvied Vault", app.currentVault.userVaultID, archivedVault[0].userVaultID);

        const localVault = (await localDatabase.query<IVault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${userVault[0].vaultID}`))[0];
        ctx.assertEquals("Local vault is archived", localVault.isArchived, true);

        const serverVault = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${userVault[0].vaultID}`))[0];
        ctx.assertEquals("Server vault is archived", serverVault.IsArchived, true);
    }
});

appStoreTestSuite.tests.push({
    name: "Load Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "LoadArchiveVaultWorksTest", false, false, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "LoadArchiveVaultWorksTest");
        await verifyAllVaultDataInDatabases("Load Archive vault works", ctx, true, archivedUserVault[0].userVaultID, archivedUserVault[0].vaultID);

        const archiveSucceeded = await app.updateArchiveStatus(userManager.defaultUser.vaulticKey, archivedUserVault[0].userVaultID!, true);
        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const localVault = (await localDatabase.query<IVault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${archivedUserVault[0].vaultID}`))[0];
        ctx.assertEquals("Local vault is archived", localVault.isArchived, true);

        const serverVault = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${archivedUserVault[0].vaultID}`))[0];
        ctx.assertEquals("Server vault is archived", serverVault.IsArchived, true);

        const loadArchiveSucceeded = await app.setActiveVault(userManager.defaultUser.vaulticKey, archivedUserVault[0].userVaultID!);
        ctx.assertTruthy("Load archive Succeeded", loadArchiveSucceeded);
        ctx.assertEquals("Archive Vault is found in archived vaults", app.archivedVaults.value.filter(v => v.name == "LoadArchiveVaultWorksTest").length, 1);
        ctx.assertEquals("Current Vault is Archived Vault", app.currentVault.userVaultID, archivedUserVault[0].userVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Un Archive Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "UnArchiveVaultWorksTest", false, true, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const archivedUserVault = app.userVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest");
        await verifyAllVaultDataInDatabases("Un Archive Vault Works", ctx, true, archivedUserVault[0].userVaultID, archivedUserVault[0].vaultID);

        const archiveSucceeded = await app.updateArchiveStatus(userManager.defaultUser.vaulticKey, archivedUserVault[0].userVaultID!, true);

        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        let localVault = (await localDatabase.query<IVault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${archivedUserVault[0].vaultID}`))[0];
        ctx.assertEquals("Local vault is archived", localVault.isArchived, true);

        let serverVault = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${archivedUserVault[0].vaultID}`))[0];
        ctx.assertEquals("Server vault is archived", serverVault.IsArchived, true);

        const unarchiveVaultSucceeded = await app.updateArchiveStatus(userManager.defaultUser.vaulticKey, archivedUserVault[0].userVaultID!, false);
        ctx.assertTruthy("Un Archive Vault Succeeded", unarchiveVaultSucceeded);

        const userVault = app.userVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest");
        ctx.assertEquals("Un Archive Vault exists in UserVaults", userVault.length, 1);
        ctx.assertEquals("Un Archive Vault does not exist in Archived Vaults", app.archivedVaults.value.filter(v => v.name == "UnArchiveVaultWorksTest").length, 0);

        localVault = (await localDatabase.query(`SELECT * FROM "Vaults" WHERE "VaultID" = ${archivedUserVault[0].vaultID}`))[0];
        ctx.assertTruthy("Local vault is not archived", !localVault.isArchived);

        serverVault = (await publicServerDB.query<Vault>(`SELECT * FROM "Vaults" WHERE "VaultID" = ${archivedUserVault[0].vaultID}`))[0];
        ctx.assertTruthy("Server vault is not archived", !serverVault.IsArchived);
    }
});

appStoreTestSuite.tests.push({
    name: "Permanently Delete Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "PermanentlyDeleteVaultWorksTest", false, true, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "PermanentlyDeleteVaultWorksTest");
        await verifyAllVaultDataInDatabases("Permanently Delete Vault Works 1", ctx, true, userVault[0].userVaultID, userVault[0].vaultID);

        const serverUserVault = (await publicServerDB.query<UserVault>(`
            SELECT * 
            FROM "UserVaults"
            WHERE "UserVaultID" = ${userVault[0].userVaultID}`))[0];

        const archiveSucceeded = await app.updateArchiveStatus(userManager.defaultUser.vaulticKey, userVault[0].userVaultID!, true);
        ctx.assertTruthy("Archive Vault Succeeded", archiveSucceeded);

        const deleteSucceeded = await app.permanentlyDeleteVault(userManager.defaultUser.vaulticKey, userVault[0].userVaultID!);
        ctx.assertTruthy("Permanently Delete Vault Works", deleteSucceeded);
        ctx.assertEquals("ArchivedVault does not exist", app.archivedVaults.value.filter(v => v.name == "PermanentlyDeleteVaultWorksTest").length, 0);
        ctx.assertEquals("Current Vault is first UserVault", app.currentVault.userVaultID, app.userVaults.value[0].userVaultID);

        await verifyAllVaultDataInDatabases("Permanently Delete Vault Works 2", ctx, false, userVault[0].userVaultID, userVault[0].vaultID, serverUserVault.OrganizationVaultID);
    }
});

appStoreTestSuite.tests.push({
    name: "Set Active Vault Works", func: async (ctx: TestContext) =>
    {
        const response = await app.createNewVault(userManager.defaultUser.vaulticKey, "SetActiveVaultWorksTest", false, false, [], []);
        ctx.assertTruthy("Create New Vault Succeeded", response);

        const userVault = app.userVaults.value.filter(v => v.name == "SetActiveVaultWorksTest")[0];
        await verifyAllVaultDataInDatabases("Set Active Vault Works 1", ctx, true, userVault.userVaultID, userVault.vaultID);

        ctx.assertTruthy("Not currently active", app.currentVault.userVaultID != userVault.userVaultID);

        const setActiveSucceed = await app.setActiveVault(userManager.defaultUser.vaulticKey, userVault.userVaultID!);
        ctx.assertTruthy("Set Active Succeeded", setActiveSucceed);
        ctx.assertEquals("Active User Vault UserVaultID", app.currentVault.userVaultID, userVault.userVaultID);
    }
});

// TODO: write tests for creating and updating vaults with organizations and members

export default appStoreTestSuite;