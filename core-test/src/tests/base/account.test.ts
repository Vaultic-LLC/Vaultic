import { serverDB } from "@lib/serverDatabaseBridge";
import { createTestSuite, TestContext } from "@lib/test";
import userManager, { User } from "@lib/userManager";
import { api } from "@renderer/API";
import app from "@renderer/Objects/Stores/AppStore";
import { Organization } from "@vaultic/shared/Types/DataTypes";
import { UserVaultIDAndVaultID } from "@vaultic/shared/Types/Entities";

let accountTestSuite = createTestSuite("Account");

type TestState =
{
    userOne: User;
    userTwo: User &
    {
        AppStoreStateID: number | undefined;
        UserPreferencesStoreStateID: number | undefined;
        UserSharingFromID: number | undefined;
        UserSharingToID: number | undefined;
        OrganizationID: number | undefined;
        UserOrganizationIDs: string | undefined;
        UserVaultIDs: string | undefined;
        OrganizationVaultIDs: string | undefined;
        VaultIDs: string | undefined;
        VaultPreferencesStoreState: string | undefined;
        VaultStoreStateIDs: string | undefined;
        PasswordStoreStateIDs: string | undefined;
        ValueStoreStateIDs: string | undefined;
        FilterStoreStateIDs: string | undefined;
        GroupStoreStateIDs: string | undefined;
    };
};

accountTestSuite.tests.push({
    name: "Delete Account Works", func: async (ctx: TestContext<TestState>) =>
    {
        if (!await setupUsers(ctx)) { return; }
        if (!await createUserData(ctx)) { return; }
        if (!await confirmUserOneData(ctx)) { return; }

        retrieveUserTwoDataForDeleteConfirmation(ctx);
        deleteUserTwoAndConfirmDataIsCleanedUp(ctx);
        confirmUserOneDataIsCorrect(ctx);
    }
});

async function setupUsers(ctx: TestContext<TestState>): Promise<boolean>
{
    const userOne = userManager.getCurrentUser();
    if (!userOne)
    {
        ctx.assertTruthy("User one exists", false);
        return false;
    }

    if (!await userOne.loadUserData(ctx))
    {
        ctx.assertTruthy("Load user data succeeded", false);
        return false;
    }

    const userTwo = await userManager.createNewUser(ctx);
    if (!userTwo)
    {
        ctx.assertTruthy("Create new user succeeded", false);
        return false;
    }

    ctx.state.userOne = userOne;
    ctx.state.userTwo = userTwo as User & {
        AppStoreStateID: number | undefined;
        UserPreferencesStoreStateID: number | undefined;
        UserSharingFromID: number | undefined;
        UserSharingToID: number | undefined;
        OrganizationID: number | undefined;
        UserOrganizationIDs: string | undefined;
        UserVaultIDs: string | undefined;   
        OrganizationVaultIDs: string | undefined;
        VaultIDs: string | undefined;
        VaultPreferencesStoreState: string | undefined;
        VaultStoreStateIDs: string | undefined;
        PasswordStoreStateIDs: string | undefined;
        ValueStoreStateIDs: string | undefined;
        FilterStoreStateIDs: string | undefined;
        GroupStoreStateIDs: string | undefined;
    };

    return true;
}

async function createUserData(ctx: TestContext<TestState>): Promise<boolean>
{
    const userOneMember = ctx.state.userOne.toMember();

    // --- Setup some more data to test that data is cleaned up correctly between users ---
    const adHocVaultResponse = await app.createNewVault(ctx.state.userOne.vaulticKey, "Ad hoc", true, true, [], [userOneMember]);
    ctx.assertTruthy("Create new vault succeeded", adHocVaultResponse);

    const orgVaultResponse = await app.createNewVault(ctx.state.userOne.vaulticKey, "Org Vault", true, true, [], []);
    ctx.assertTruthy("Create new vault succeeded", orgVaultResponse);

    let orgVault = app.userVaults.value.find(v => v.name == "Org Vault");
    if (!orgVault)
    {
        ctx.assertTruthy("Org vault exists", false);
        return false;
    }

    const organization: Organization = 
    {
        organizationID: 0,
        name: `${ctx.state.userTwo.email}'s Test org for deletion`,
        membersByUserID: new Map(),
        vaultIDsByVaultID: new Map()
    };

    const userVaultIDAndVaultID: UserVaultIDAndVaultID[] = [{ userVaultID: orgVault.userVaultID, vaultID: orgVault.vaultID }];
    const orgSucceeded = await app.organizations.createOrganization(ctx.state.userOne.vaulticKey, organization, userVaultIDAndVaultID, [userOneMember]);
    ctx.assertTruthy("Create organization succeeded", orgSucceeded);

    const allowSharingFromUserOneResponse = await api.server.user.updateSettings(undefined, undefined, undefined, [ctx.state.userOne.id]);
    ctx.assertTruthy("Allow sharing from user one succeeded", allowSharingFromUserOneResponse.Success);

    const retreivedOrganization = app.organizations.organizations.value.find(o => o.name == organization.name);
    if (!retreivedOrganization)
    {
        ctx.assertTruthy("Retreived organization exists", false);
        return false;
    }

    ctx.state.userTwo.OrganizationID = orgVault.userOrganizationID;
    return true;
}

async function confirmUserOneData(ctx: TestContext<TestState>): Promise<boolean>
{
    const userOneLogInResponse = await userManager.logUserIn(ctx, ctx.state.userOne.id);
    ctx.assertTruthy("Log in succeeded", userOneLogInResponse);

    const userOneVaults = await serverDB.getVaultIDsForUser(ctx.state.userOne.id);
    ctx.assertTruthy("User has enough vaults", userOneVaults.length > 2);

    const adHocVault = app.userVaults.value.find(v => v.name == "Ad hoc");
    if (!adHocVault)
    {
        ctx.assertTruthy("Ad hoc vault exists", false);
        return false;
    }

    const userOneHasAdHocVault = userOneVaults.some(v => v.VaultID == adHocVault.vaultID && v.UserVaultID == adHocVault.userVaultID 
        && v.UserOrganizationID == adHocVault.userOrganizationID);

    ctx.assertTruthy("User one has ad hoc vault", userOneHasAdHocVault);

    const orgVault = app.userVaults.value.find(v => v.name == "Org Vault");
    if (!orgVault)
    {
        ctx.assertTruthy("Org vault exists", false);
        return false;
    }

    const userOneHasOrgVault = userOneVaults.some(v => v.VaultID == orgVault.vaultID && v.UserVaultID == orgVault.userVaultID 
        && v.UserOrganizationID == orgVault.userOrganizationID);

    ctx.assertTruthy("User one has org vault", userOneHasOrgVault);

    const allowSharingFromUserTwoResponse = await api.server.user.updateSettings(undefined, undefined, undefined, [ctx.state.userTwo.id]);
    ctx.assertTruthy("Allow sharing from user two succeeded", allowSharingFromUserTwoResponse.Success);
    
    return true;
}

async function retrieveUserTwoDataForDeleteConfirmation(ctx: TestContext<TestState>)
{
    const userTwoAppStoreStateResponse = await serverDB.query<{ AppStoreStateID: number }>(`
        SELECT "AppStoreStateID"
        FROM "AppStoreStates"
        JOIN "UserDatas" on "AppStoreStates"."UserDataID" = "UserDatas"."UserDataID"
        WHERE "UserID" = ${ctx.state.userTwo.id}`);

    ctx.assertTruthy("User two app store state exists", userTwoAppStoreStateResponse.rowCount == 1 && !!userTwoAppStoreStateResponse.rows[0].AppStoreStateID);
    ctx.state.userTwo.AppStoreStateID = userTwoAppStoreStateResponse.rows[0].AppStoreStateID;

    const userTwoUserPreferencesStoreStateResponse = await serverDB.query<{ UserPreferencesStoreStateID: number }>(`
        SELECT "UserPreferencesStoreStateID"
        FROM "UserPreferencesStoreStates"
        JOIN "UserDatas" on "UserPreferencesStoreStates"."UserDataID" = "UserDatas"."UserDataID"
        WHERE "UserID" = ${ctx.state.userTwo.id}`);

    ctx.assertTruthy("User two user preferences store state exists", userTwoUserPreferencesStoreStateResponse.rowCount == 1 && !!userTwoUserPreferencesStoreStateResponse.rows[0].UserPreferencesStoreStateID);
    ctx.state.userTwo.UserPreferencesStoreStateID = userTwoUserPreferencesStoreStateResponse.rows[0].UserPreferencesStoreStateID;

    const userTwoAllowSharingFromThisUserResponse = await serverDB.query<{ UserSharingID: number }>(`SELECT "UserSharingID" FROM "UserSharings" WHERE "UserIDFrom" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two allow sharing from this user has 1 record", userTwoAllowSharingFromThisUserResponse.rowCount == 1);
    ctx.state.userTwo.UserSharingFromID = userTwoAllowSharingFromThisUserResponse.rows[0].UserSharingID;

    const userTwoAllowSharingToThisUserResponse = await serverDB.query<{ UserSharingID: number }>(`SELECT "UserSharingID" FROM "UserSharings" WHERE "UserIDTo" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two allow sharing to this user has 1 record", userTwoAllowSharingToThisUserResponse.rowCount == 1);
    ctx.state.userTwo.UserSharingToID = userTwoAllowSharingToThisUserResponse.rows[0].UserSharingID;

    const userTwoUserOrganizationsResponse = await serverDB.query<{ UserOrganizationID: number }>(`SELECT "UserOrganizationID" FROM "UserOrganizations" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two user organizations has 2 records", userTwoUserOrganizationsResponse.rowCount == 2);
    ctx.state.userTwo.UserOrganizationIDs = userTwoUserOrganizationsResponse.rows.map(r => r.UserOrganizationID).join(',');

    const userTwoUserVaultsResponse = await serverDB.query<{ UserVaultID: number, OrganizationVaultID: number, VaultPreferencesStoreState: string }>(`SELECT "UserVaultID", "OrganizationVaultID", "VaultPreferencesStoreState" FROM "UserVaults" WHERE "UserOrganizationID" IN (${ctx.state.userTwo.UserOrganizationIDs})`);
    ctx.assertTruthy("User two user vaults has 3 records", userTwoUserVaultsResponse.rowCount == 3);
    ctx.state.userTwo.UserVaultIDs = userTwoUserVaultsResponse.rows.map(r => r.UserVaultID).join(',');
    ctx.state.userTwo.OrganizationVaultIDs = userTwoUserVaultsResponse.rows.map(r => r.OrganizationVaultID).join(',');
    ctx.state.userTwo.VaultPreferencesStoreState = userTwoUserVaultsResponse.rows.map(r => r.VaultPreferencesStoreState).join(',');

    const userTwoOrganizationVaultsResponse = await serverDB.query<{ OrganizationVaultID: number, VaultID: number }>(`SELECT "OrganizationVaultID", "VaultID" FROM "OrganizationVaults" WHERE "OrganizationVaultID" IN (${ctx.state.userTwo.OrganizationVaultIDs})`);
    ctx.assertTruthy("User two organization vaults has 3 record", userTwoOrganizationVaultsResponse.rowCount == 3);
    ctx.state.userTwo.VaultIDs = userTwoOrganizationVaultsResponse.rows.map(r => r.VaultID).join(',');

    const userTwoVaultStoresResponse = await serverDB.query<{ 
        VaultStoreStateID: Number, 
        PasswordStoreStateID: Number, 
        ValueStoreStateID: Number, 
        FilterStoreStateID: Number, 
        GroupStoreStateID: number}>(`
            SELECT "VaultStoreStateID", "PasswordStoreStateID", "ValueStoreStateID", "FilterStoreStateID", "GroupStoreStateID" 
            FROM "Vaults" v
            JOIN "VaultStoreStates" vas ON vas."VaultID" = v."VaultID"
            JOIN "PasswordStoreStates" pas ON pas."VaultID" = v."PasswordStoreStateID"
            JOIN "ValueStoreStates" vas ON vas."VaultID" = v."ValueStoreStateID"
            JOIN "FilterStoreStates" fas ON fas."VaultID" = v."FilterStoreStateID"
            JOIN "GroupStoreStates" gas ON gas."VaultID" = v."GroupStoreStateID"
            WHERE v."VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    
    ctx.assertTruthy("User two vault stores has 3 records", userTwoVaultStoresResponse.rowCount == 3);
    ctx.state.userTwo.VaultStoreStateIDs = userTwoVaultStoresResponse.rows.map(r => r.VaultStoreStateID).join(',');
    ctx.state.userTwo.PasswordStoreStateIDs = userTwoVaultStoresResponse.rows.map(r => r.PasswordStoreStateID).join(',');
    ctx.state.userTwo.ValueStoreStateIDs = userTwoVaultStoresResponse.rows.map(r => r.ValueStoreStateID).join(',');
    ctx.state.userTwo.FilterStoreStateIDs = userTwoVaultStoresResponse.rows.map(r => r.FilterStoreStateID).join(',');
    ctx.state.userTwo.GroupStoreStateIDs = userTwoVaultStoresResponse.rows.map(r => r.GroupStoreStateID).join(',');
}

async function deleteUserTwoAndConfirmDataIsCleanedUp(ctx: TestContext<TestState>)
{
    const logUserTwoInResponse = await userManager.logUserIn(ctx, ctx.state.userTwo.id);
    if (!logUserTwoInResponse)
    {
        ctx.assertTruthy("Log user two in succeeded", false);
        return;
    }

    const deleteAccountResponse = await api.repositories.users.deleteAccount();
    ctx.assertTruthy("Delete account succeeded", deleteAccountResponse.success && deleteAccountResponse.value);
    await app.lock(true, false, false);

    const userTwoRecord = await serverDB.query(`SELECT * FROM "Users" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two doesn't exists", userTwoRecord.rowCount == 0);

    const userTwoLicenseRecord = await serverDB.query(`SELECT * FROM "Licenses" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two license doesn't exists", userTwoLicenseRecord.rowCount == 0);

    const userTwoUserDataRecord = await serverDB.query(`SELECT * FROM "UserDatas" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two user data doesn't exists", userTwoUserDataRecord.rowCount == 0);

    const userTwoAppStoreStateRecord = await serverDB.query(`SELECT * FROM "AppStoreStates" WHERE "AppStoreStateID" = ${ctx.state.userTwo.AppStoreStateID}`);
    ctx.assertTruthy("User two app store state doesn't exists", userTwoAppStoreStateRecord.rowCount == 0);

    const userTwoUserPreferencesStoreStateRecord = await serverDB.query(`SELECT * FROM "UserPreferencesStoreStates" WHERE "UserPreferencesStoreStateID" = ${ctx.state.userTwo.UserPreferencesStoreStateID}`);
    ctx.assertTruthy("User two user preferences store state doesn't exists", userTwoUserPreferencesStoreStateRecord.rowCount == 0);

    const userTwoSessionRecord = await serverDB.query(`SELECT * FROM "Sessions" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two session doesn't exists", userTwoSessionRecord.rowCount == 0);

    const userTwoStripeDataRecord = await serverDB.query(`SELECT * FROM "StripeDatas" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two stripe data doesn't exists", userTwoStripeDataRecord.rowCount == 0);

    const userTwoDesktopDeviceRecord = await serverDB.query(`SELECT * FROM "DesktopDevices" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two desktop device doesn't exists", userTwoDesktopDeviceRecord.rowCount == 0);

    const userTwoMobileDeviceRecord = await serverDB.query(`SELECT * FROM "MobileDevices" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two mobile device doesn't exists", userTwoMobileDeviceRecord.rowCount == 0);

    const userTwoBugReportsRecord = await serverDB.query(`SELECT * FROM "BugReports" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two bug reports doesn't exists", userTwoBugReportsRecord.rowCount == 0);

    const userTwoAllowSharingFromThisUserRecord = await serverDB.query(`SELECT * FROM "UserSharings" WHERE "UserSharingID" = ${ctx.state.userTwo.UserSharingFromID}`);
    ctx.assertTruthy("User two allow sharing from this user doesn't exists", userTwoAllowSharingFromThisUserRecord.rowCount == 0);

    const userTwoAllowSharingToThisUserRecord = await serverDB.query(`SELECT * FROM "UserSharings" WHERE "UserSharingID" = ${ctx.state.userTwo.UserSharingToID}`);
    ctx.assertTruthy("User two allow sharing to this user doesn't exists", userTwoAllowSharingToThisUserRecord.rowCount == 0);

    const userTwoOrganizationRecord = await serverDB.query(`SELECT * FROM "Organizations" WHERE "OrganizationID" = ${ctx.state.userTwo.OrganizationID}`);
    ctx.assertTruthy("User two organization doesn't exists", userTwoOrganizationRecord.rowCount == 0);

    const userTwoUserOrganizationsRecords = await serverDB.query(`SELECT * FROM "UserOrganizations" WHERE "UserOrganizationID" IN (${ctx.state.userTwo.UserOrganizationIDs})`);
    ctx.assertTruthy("User two user organizations records don't exists", userTwoUserOrganizationsRecords.rowCount == 0);

    const userTwoUserVaultsRecords = await serverDB.query(`SELECT * FROM "UserVaults" WHERE "UserVaultID" IN (${ctx.state.userTwo.UserVaultIDs})`);
    ctx.assertTruthy("User two user vaults records don't exists", userTwoUserVaultsRecords.rowCount == 0);

    const userTwoOrganizationVaultsRecords = await serverDB.query(`SELECT * FROM "OrganizationVaults" WHERE "OrganizationVaultID" IN (${ctx.state.userTwo.OrganizationVaultIDs})`);
    ctx.assertTruthy("User two organization vaults records don't exists", userTwoOrganizationVaultsRecords.rowCount == 0);

    const userTwoVaultsRecords = await serverDB.query(`SELECT * FROM "Vaults" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two vaults records don't exists", userTwoVaultsRecords.rowCount == 0);

    const userTwoVaultPreferencesStoreStateRecords = await serverDB.query(`SELECT * FROM "VaultPreferencesStoreStates" WHERE "VaultPreferencesStoreStateID" IN (${ctx.state.userTwo.VaultPreferencesStoreState})`);
    ctx.assertTruthy("User two vault preferences store state records don't exists", userTwoVaultPreferencesStoreStateRecords.rowCount == 0);

    const userTwoVaultStoreStateRecords = await serverDB.query(`SELECT * FROM "VaultStoreStates" WHERE "VaultStoreStateID" IN (${ctx.state.userTwo.VaultStoreStateIDs})`);
    ctx.assertTruthy("User two vault store state records don't exists", userTwoVaultStoreStateRecords.rowCount == 0);

    const userTwoPasswordStoreStateRecords = await serverDB.query(`SELECT * FROM "PasswordStoreStates" WHERE "PasswordStoreStateID" IN (${ctx.state.userTwo.PasswordStoreStateIDs})`);
    ctx.assertTruthy("User two password store state records don't exists", userTwoPasswordStoreStateRecords.rowCount == 0);

    const userTwoValueStoreStateRecords = await serverDB.query(`SELECT * FROM "ValueStoreStates" WHERE "ValueStoreStateID" IN (${ctx.state.userTwo.ValueStoreStateIDs})`);
    ctx.assertTruthy("User two value store state records don't exists", userTwoValueStoreStateRecords.rowCount == 0);

    const userTwoFilterStoreStateRecords = await serverDB.query(`SELECT * FROM "FilterStoreStates" WHERE "FilterStoreStateID" IN (${ctx.state.userTwo.FilterStoreStateIDs})`);
    ctx.assertTruthy("User two filter store state records don't exists", userTwoFilterStoreStateRecords.rowCount == 0);

    const userTwoGroupStoreStateRecords = await serverDB.query(`SELECT * FROM "GroupStoreStates" WHERE "GroupStoreStateID" IN (${ctx.state.userTwo.GroupStoreStateIDs})`);
    ctx.assertTruthy("User two group store state records don't exists", userTwoGroupStoreStateRecords.rowCount == 0);
}

async function confirmUserOneDataIsCorrect(ctx: TestContext<TestState>)
{

}

export default accountTestSuite;