import localDatabase from "@lib/localDatabaseBridge";
import { privateServerDB, publicServerDB } from "@lib/serverDatabaseBridge";
import { createTestSuite, TestContext, TestSuites } from "@lib/test";
import userManager, { User } from "@lib/userManager";
import { api } from "@renderer/API";
import app from "@renderer/Objects/Stores/AppStore";
import { Organization } from "@vaultic/shared/Types/DataTypes";
import { UserVaultIDAndVaultID } from "@vaultic/shared/Types/Entities";

let deleteAccountTestSuite = createTestSuite("Delete Account", TestSuites.DeleteAccount);

type TestState =
{
    userOne: User & 
    {
        UserOrganizationIDs: string | undefined;
        UserVaultIDs: string | undefined;   
    },
    userTwo: User &
    {
        AppStoreStateID: number | undefined;
        UserPreferencesStoreStateID: number | undefined;
        UserSharingFromID: number | undefined;
        UserSharingToID: number | undefined;
        OrganizationIDs: string | undefined;
        UserOrganizationIDs: string | undefined;
        UserVaultIDs: string | undefined;
        OrganizationVaultIDs: string | undefined;
        VaultIDs: string | undefined;
        VaultPreferencesStoreStateIDs: string | undefined;
        VaultStoreStateIDs: string | undefined;
        PasswordStoreStateIDs: string | undefined;
        ValueStoreStateIDs: string | undefined;
        FilterStoreStateIDs: string | undefined;
        GroupStoreStateIDs: string | undefined;
    };
};

deleteAccountTestSuite.tests.push({
    name: "Delete Account Works", func: async (ctx: TestContext<TestState>) =>
    {
        if (!await setupUsers(ctx)) { return; }
        if (!await createUserData(ctx)) { return; }
        if (!await confirmUserOneData(ctx)) { return; }

        await retrieveUserTwoDataForDeleteConfirmation(ctx);
        await deleteUserTwoAndConfirmDataIsCleanedUp(ctx);
        await confirmUserOneDataIsCorrect(ctx);
        await checkLocalData(ctx);
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

    ctx.state.userOne = userOne as User & 
    {
        UserOrganizationIDs: string | undefined;
        UserVaultIDs: string | undefined;   
    };

    ctx.state.userTwo = userTwo as User & 
    {
        AppStoreStateID: number | undefined;
        UserPreferencesStoreStateID: number | undefined;
        UserSharingFromID: number | undefined;
        UserSharingToID: number | undefined;
        OrganizationIDs: string | undefined;
        UserOrganizationIDs: string | undefined;
        UserVaultIDs: string | undefined;   
        OrganizationVaultIDs: string | undefined;
        VaultIDs: string | undefined;
        VaultPreferencesStoreStateIDs: string | undefined;
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
    const adHocVaultResponse = await app.createNewVault(ctx.state.userTwo.vaulticKey, "Ad hoc", true, true, [], [userOneMember]);
    ctx.assertTruthy("Create new vault succeeded", adHocVaultResponse);

    const orgVaultResponse = await app.createNewVault(ctx.state.userTwo.vaulticKey, "Org Vault", true, true, [], []);
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
    const orgSucceeded = await app.organizations.createOrganization(ctx.state.userTwo.vaulticKey, organization, userVaultIDAndVaultID, [userOneMember]);
    ctx.assertTruthy("Create organization succeeded", orgSucceeded);

    const allowSharingFromUserOneResponse = await api.server.user.updateSettings(undefined, undefined, undefined, [ctx.state.userOne.id]);
    ctx.assertTruthy("Allow sharing from user one succeeded", allowSharingFromUserOneResponse.Success);

    const retreivedOrganization = app.organizations.organizations.value.find(o => o.name == organization.name);
    if (!retreivedOrganization)
    {
        ctx.assertTruthy("Retreived organization exists", false);
        return false;
    }

    return true;
}

async function confirmUserOneData(ctx: TestContext<TestState>): Promise<boolean>
{
    const userOneLogInResponse = await userManager.logUserIn(ctx, ctx.state.userOne.id);
    ctx.assertTruthy("Log in succeeded", userOneLogInResponse);

    const userOneVaults = await publicServerDB.getVaultIDsForUser(ctx.state.userOne.id);
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

    ctx.state.userOne.UserVaultIDs = `${adHocVault.userVaultID},${orgVault.userVaultID}`;
    ctx.state.userOne.UserOrganizationIDs = `${adHocVault.userOrganizationID},${orgVault.userOrganizationID}`;
    
    return true;
}

async function retrieveUserTwoDataForDeleteConfirmation(ctx: TestContext<TestState>)
{
    const userTwoAppStoreStateResponse = await publicServerDB.query<{ AppStoreStateID: number }>(`
        SELECT "AppStoreStateID"
        FROM "AppStoreStates"
        JOIN "UserDatas" on "AppStoreStates"."UserDataID" = "UserDatas"."UserDataID"
        WHERE "UserID" = ${ctx.state.userTwo.id}`);

    ctx.assertTruthy("User two app store state exists", userTwoAppStoreStateResponse.length == 1 && !!userTwoAppStoreStateResponse[0].AppStoreStateID);
    ctx.state.userTwo.AppStoreStateID = userTwoAppStoreStateResponse[0].AppStoreStateID;

    const userTwoUserPreferencesStoreStateResponse = await publicServerDB.query<{ UserPreferencesStoreStateID: number }>(`
        SELECT "UserPreferencesStoreStateID"
        FROM "UserPreferencesStoreStates"
        JOIN "UserDatas" on "UserPreferencesStoreStates"."UserDataID" = "UserDatas"."UserDataID"
        WHERE "UserID" = ${ctx.state.userTwo.id}`);

    ctx.assertTruthy("User two user preferences store state exists", userTwoUserPreferencesStoreStateResponse.length == 1 && !!userTwoUserPreferencesStoreStateResponse[0].UserPreferencesStoreStateID);
    ctx.state.userTwo.UserPreferencesStoreStateID = userTwoUserPreferencesStoreStateResponse[0].UserPreferencesStoreStateID;

    const userTwoAllowSharingFromThisUserResponse = await publicServerDB.query<{ UserSharingID: number }>(`SELECT "UserSharingID" FROM "UserSharings" WHERE "UserIDFrom" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two allow sharing from this user has 1 record", userTwoAllowSharingFromThisUserResponse.length == 1);
    ctx.state.userTwo.UserSharingFromID = userTwoAllowSharingFromThisUserResponse[0].UserSharingID;

    const userTwoAllowSharingToThisUserResponse = await publicServerDB.query<{ UserSharingID: number }>(`SELECT "UserSharingID" FROM "UserSharings" WHERE "UserIDTo" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two allow sharing to this user has 1 record", userTwoAllowSharingToThisUserResponse.length == 1);
    ctx.state.userTwo.UserSharingToID = userTwoAllowSharingToThisUserResponse[0].UserSharingID;

    const userTwoUserOrganizationsResponse = await publicServerDB.query<{ UserOrganizationID: number }>(`SELECT "UserOrganizationID" FROM "UserOrganizations" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two user organizations has 2 records", userTwoUserOrganizationsResponse.length == 1);
    ctx.state.userTwo.UserOrganizationIDs = userTwoUserOrganizationsResponse.map(r => r.UserOrganizationID).join(',');

    const userTwoOrganizationsResponse = await publicServerDB.query<{ OrganizationID: number }>(`SELECT "OrganizationID" FROM "Organizations" WHERE "UserIDOwner" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two organizations has 2 records", userTwoOrganizationsResponse.length == 2);
    ctx.state.userTwo.OrganizationIDs = userTwoOrganizationsResponse.map(r => r.OrganizationID).join(',');

    const userTwoUserVaultsResponse = await publicServerDB.query<{ UserVaultID: number, OrganizationVaultID: number, VaultPreferencesStoreStateID: string }>(`
        SELECT uv."UserVaultID", "OrganizationVaultID", "vp"."VaultPreferencesStoreStateID" 
        FROM "UserVaults" uv
        JOIN "VaultPreferencesStoreStates" vp on vp."UserVaultID" = uv."UserVaultID"
        WHERE "UserOrganizationID" IN (${ctx.state.userTwo.UserOrganizationIDs})`);

    ctx.assertTruthy("User two user vaults has 3 records", userTwoUserVaultsResponse.length == 3);
    ctx.state.userTwo.UserVaultIDs = userTwoUserVaultsResponse.map(r => r.UserVaultID).join(',');
    ctx.state.userTwo.OrganizationVaultIDs = userTwoUserVaultsResponse.map(r => r.OrganizationVaultID).join(',');
    ctx.state.userTwo.VaultPreferencesStoreStateIDs = userTwoUserVaultsResponse.map(r => r.VaultPreferencesStoreStateID).join(',');

    const userTwoOrganizationVaultsResponse = await publicServerDB.query<{ OrganizationVaultID: number, VaultID: number }>(`SELECT "OrganizationVaultID", "VaultID" FROM "OrganizationVaults" WHERE "OrganizationVaultID" IN (${ctx.state.userTwo.OrganizationVaultIDs})`);
    ctx.assertTruthy("User two organization vaults has 3 record", userTwoOrganizationVaultsResponse.length == 3);
    ctx.state.userTwo.VaultIDs = userTwoOrganizationVaultsResponse.map(r => r.VaultID).join(',');

    const userTwoVaultStoresResponse = await publicServerDB.query<{ 
        VaultStoreStateID: Number, 
        PasswordStoreStateID: Number, 
        ValueStoreStateID: Number, 
        FilterStoreStateID: Number, 
        GroupStoreStateID: number}>(`
            SELECT "VaultStoreStateID", "PasswordStoreStateID", "ValueStoreStateID", "FilterStoreStateID", "GroupStoreStateID" 
            FROM "Vaults" v
            JOIN "VaultStoreStates" vas ON vas."VaultID" = v."VaultID"
            JOIN "PasswordStoreStates" pas ON pas."VaultID" = v."VaultID"
            JOIN "ValueStoreStates" val ON val."VaultID" = v."VaultID"
            JOIN "FilterStoreStates" fas ON fas."VaultID" = v."VaultID"
            JOIN "GroupStoreStates" gas ON gas."VaultID" = v."VaultID"
            WHERE v."VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    
    ctx.assertTruthy("User two vault stores has 3 records", userTwoVaultStoresResponse.length == 3);
    ctx.state.userTwo.VaultStoreStateIDs = userTwoVaultStoresResponse.map(r => r.VaultStoreStateID).join(',');
    ctx.state.userTwo.PasswordStoreStateIDs = userTwoVaultStoresResponse.map(r => r.PasswordStoreStateID).join(',');
    ctx.state.userTwo.ValueStoreStateIDs = userTwoVaultStoresResponse.map(r => r.ValueStoreStateID).join(',');
    ctx.state.userTwo.FilterStoreStateIDs = userTwoVaultStoresResponse.map(r => r.FilterStoreStateID).join(',');
    ctx.state.userTwo.GroupStoreStateIDs = userTwoVaultStoresResponse.map(r => r.GroupStoreStateID).join(',');
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
    if (!deleteAccountResponse.success || !deleteAccountResponse.value)
    {
        ctx.assertTruthy("Delete account succeeded", false);
        return;
    }

    await userManager.logCurrentUserOut(true, false, false);

    const userTwoRecord = await publicServerDB.query(`SELECT * FROM "Users" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two doesn't exists", userTwoRecord.length == 0);

    const userTwoLicenseRecord = await publicServerDB.query(`SELECT * FROM "Licenses" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two license doesn't exists", userTwoLicenseRecord.length == 0);

    const userTwoUserDataRecord = await publicServerDB.query(`SELECT * FROM "UserDatas" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two user data doesn't exists", userTwoUserDataRecord.length == 0);

    const userTwoAppStoreStateRecord = await publicServerDB.query(`SELECT * FROM "AppStoreStates" WHERE "AppStoreStateID" = ${ctx.state.userTwo.AppStoreStateID}`);
    ctx.assertTruthy("User two app store state doesn't exists", userTwoAppStoreStateRecord.length == 0);

    const userTwoUserPreferencesStoreStateRecord = await publicServerDB.query(`SELECT * FROM "UserPreferencesStoreStates" WHERE "UserPreferencesStoreStateID" = ${ctx.state.userTwo.UserPreferencesStoreStateID}`);
    ctx.assertTruthy("User two user preferences store state doesn't exists", userTwoUserPreferencesStoreStateRecord.length == 0);

    const userTwoSessionRecord = await publicServerDB.query(`SELECT * FROM "Sessions" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two session doesn't exists", userTwoSessionRecord.length == 0);

    const userTwoStripeDataRecord = await publicServerDB.query(`SELECT * FROM "StripeDatas" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two stripe data doesn't exists", userTwoStripeDataRecord.length == 0);

    const userTwoDesktopDeviceRecord = await publicServerDB.query(`SELECT * FROM "UserDesktopDevices" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two desktop device doesn't exists", userTwoDesktopDeviceRecord.length == 0);

    const userTwoMobileDeviceRecord = await publicServerDB.query(`SELECT * FROM "UserMobileDevices" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two mobile device doesn't exists", userTwoMobileDeviceRecord.length == 0);

    const userTwoBugReportsRecord = await publicServerDB.query(`SELECT * FROM "BugReports" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two bug reports doesn't exists", userTwoBugReportsRecord.length == 0);

    const userTwoAllowSharingFromThisUserRecord = await publicServerDB.query(`SELECT * FROM "UserSharings" WHERE "UserSharingID" = ${ctx.state.userTwo.UserSharingFromID}`);
    ctx.assertTruthy("User two allow sharing from this user doesn't exists", userTwoAllowSharingFromThisUserRecord.length == 0);

    const userTwoAllowSharingToThisUserRecord = await publicServerDB.query(`SELECT * FROM "UserSharings" WHERE "UserSharingID" = ${ctx.state.userTwo.UserSharingToID}`);
    ctx.assertTruthy("User two allow sharing to this user doesn't exists", userTwoAllowSharingToThisUserRecord.length == 0);

    const userTwoOrganizationsRecords = await publicServerDB.query(`SELECT * FROM "Organizations" WHERE "OrganizationID" IN (${ctx.state.userTwo.OrganizationIDs})`);
    ctx.assertTruthy("User two organizations don't exists", userTwoOrganizationsRecords.length == 0);

    const userTwoUserOrganizationsRecords = await publicServerDB.query(`SELECT * FROM "UserOrganizations" WHERE "UserOrganizationID" IN (${ctx.state.userTwo.UserOrganizationIDs})`);
    ctx.assertTruthy("User two user organizations records don't exists", userTwoUserOrganizationsRecords.length == 0);

    const userTwoUserVaultsRecords = await publicServerDB.query(`SELECT * FROM "UserVaults" WHERE "UserVaultID" IN (${ctx.state.userTwo.UserVaultIDs})`);
    ctx.assertTruthy("User two user vaults records don't exists", userTwoUserVaultsRecords.length == 0);

    const userTwoOrganizationVaultsRecords = await publicServerDB.query(`SELECT * FROM "OrganizationVaults" WHERE "OrganizationVaultID" IN (${ctx.state.userTwo.OrganizationVaultIDs})`);
    ctx.assertTruthy("User two organization vaults records don't exists", userTwoOrganizationVaultsRecords.length == 0);

    const userTwoVaultsRecords = await publicServerDB.query(`SELECT * FROM "Vaults" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two vaults records don't exists", userTwoVaultsRecords.length == 0);

    const userTwoVaultPreferencesStoreStateRecords = await publicServerDB.query(`SELECT * FROM "VaultPreferencesStoreStates" WHERE "VaultPreferencesStoreStateID" IN (${ctx.state.userTwo.VaultPreferencesStoreStateIDs})`);
    ctx.assertTruthy("User two vault preferences store state records don't exists", userTwoVaultPreferencesStoreStateRecords.length == 0);

    const userTwoVaultStoreStateRecords = await publicServerDB.query(`SELECT * FROM "VaultStoreStates" WHERE "VaultStoreStateID" IN (${ctx.state.userTwo.VaultStoreStateIDs})`);
    ctx.assertTruthy("User two vault store state records don't exists", userTwoVaultStoreStateRecords.length == 0);

    const userTwoPasswordStoreStateRecords = await publicServerDB.query(`SELECT * FROM "PasswordStoreStates" WHERE "PasswordStoreStateID" IN (${ctx.state.userTwo.PasswordStoreStateIDs})`);
    ctx.assertTruthy("User two password store state records don't exists", userTwoPasswordStoreStateRecords.length == 0);

    const userTwoValueStoreStateRecords = await publicServerDB.query(`SELECT * FROM "ValueStoreStates" WHERE "ValueStoreStateID" IN (${ctx.state.userTwo.ValueStoreStateIDs})`);
    ctx.assertTruthy("User two value store state records don't exists", userTwoValueStoreStateRecords.length == 0);

    const userTwoFilterStoreStateRecords = await publicServerDB.query(`SELECT * FROM "FilterStoreStates" WHERE "FilterStoreStateID" IN (${ctx.state.userTwo.FilterStoreStateIDs})`);
    ctx.assertTruthy("User two filter store state records don't exists", userTwoFilterStoreStateRecords.length == 0);

    const userTwoGroupStoreStateRecords = await publicServerDB.query(`SELECT * FROM "GroupStoreStates" WHERE "GroupStoreStateID" IN (${ctx.state.userTwo.GroupStoreStateIDs})`);
    ctx.assertTruthy("User two group store state records don't exists", userTwoGroupStoreStateRecords.length == 0);

    const userTwoPrivateUserDataRecord = await privateServerDB.query(`SELECT * FROM "PrivateUserDatas" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two private user data doesn't exists", userTwoPrivateUserDataRecord.length == 0);
}

async function confirmUserOneDataIsCorrect(ctx: TestContext<TestState>)
{
    const userOneUserOrganizationsRecords = await publicServerDB.query(`SELECT * FROM "UserOrganizations" WHERE "UserOrganizationID" IN (${ctx.state.userOne.UserOrganizationIDs})`);
    ctx.assertTruthy("User one doesn't have user orgs for user two's org", userOneUserOrganizationsRecords.length == 0);

    const userOneUserVaultsRecords = await publicServerDB.query(`SELECT * FROM "UserVaults" WHERE "UserVaultID" IN (${ctx.state.userOne.UserVaultIDs})`);
    ctx.assertTruthy("User one doesn't have user vaults for user two's vaults", userOneUserVaultsRecords.length == 0);

    const userOneUserOrganizations = await publicServerDB.query(`SELECT * FROM "UserOrganizations" WHERE "UserID" = ${ctx.state.userOne.id}`);
    ctx.assertTruthy("User one still has a user org record", userOneUserOrganizations.length > 0);

    const userOneOrganizations = await publicServerDB.query(`SELECT * FROM "Organizations" WHERE "UserIDOwner" = ${ctx.state.userOne.id}`);
    ctx.assertTruthy("User one still has a org record", userOneOrganizations.length > 0);
}

async function checkLocalData(ctx: TestContext<TestState>)
{
    const userTwoUserLocalResponse = await localDatabase.query(`SELECT * FROM "Users" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two doens't exist in local database", userTwoUserLocalResponse.length == 0);

    const userTwoUserVaults = await localDatabase.query(`SELECT * FROM "UserVaults" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two doesn't have any user vaults", userTwoUserVaults.length == 0);

    const userTwoVaults = await localDatabase.query(`SELECT * FROM "Vaults" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two doesn't have any vaults", userTwoVaults.length == 0);

    const userTwoVaultStoreStates = await localDatabase.query(`SELECT * FROM "VaultStoreStates" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two doesn't have any vault store states", userTwoVaultStoreStates.length == 0);

    const userTwoPasswordStoreStates = await localDatabase.query(`SELECT * FROM "PasswordStoreStates" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two doesn't have any password store states", userTwoPasswordStoreStates.length == 0);

    const userTwoValueStoreStates = await localDatabase.query(`SELECT * FROM "ValueStoreStates" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two doesn't have any value store states", userTwoValueStoreStates.length == 0);

    const userTwoFilterStoreStates = await localDatabase.query(`SELECT * FROM "FilterStoreStates" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two doesn't have any filter store states", userTwoFilterStoreStates.length == 0);

    const userTwoGroupStoreStates = await localDatabase.query(`SELECT * FROM "GroupStoreStates" WHERE "VaultID" IN (${ctx.state.userTwo.VaultIDs})`);
    ctx.assertTruthy("User two doesn't have any group store states", userTwoGroupStoreStates.length == 0);

    const userTwoChangeTrackings = await localDatabase.query(`SELECT * FROM "ChangeTrackings" WHERE "UserID" = ${ctx.state.userTwo.id}`);
    ctx.assertTruthy("User two doesn't have any change trackings", userTwoChangeTrackings.length == 0);
}

export default deleteAccountTestSuite;