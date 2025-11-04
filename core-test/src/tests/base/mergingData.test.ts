import { DataType, defaultFilter, defaultGroup, defaultPassword, defaultValue, Filter, FilterConditionType, Group, NameValuePair, NameValuePairType, Password } from "@renderer/Types/DataTypes";
import { api } from "@renderer/API";
import app from "@renderer/Objects/Stores/AppStore";
import { createTestSuite, TestContext, TestSuites } from "@lib/test";
import cryptHelper from "@renderer/Helpers/cryptHelper";
import userManager from "@lib/userManager";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

let mergingDataTestSuite = createTestSuite("Merging Data", TestSuites.MergingData);

// copies vaultic.db to vaultic2.db and then logs into a fresh vaultic.db
async function copyDatabaseAndLogIntoOnlineMode(forTest: string, ctx: TestContext)
{
    //@ts-ignore
    const createResponse: boolean = await api.environment.createNewDatabase("vaultic2");
    ctx.assertTruthy("Create new database worked", createResponse);

    const logInResponse = await userManager.logUserIn(ctx, userManager.defaultUserID);
    ctx.assertTruthy("Log in worked for " + forTest, logInResponse);
}

// overrides vaultic.db with vaultic2.db and logs into vaultic.db
async function swapToSecondDatabaseAndLogIn(forTest: string, ctx: TestContext)
{
    await userManager.logCurrentUserOut();

    // @ts-ignore
    const setAsCurrentResponse = await api.environment.setDatabaseAsCurrent("vaultic2");
    ctx.assertTruthy("Set database as current worked", setAsCurrentResponse === true);

    const logInResponse = await userManager.logUserIn(ctx, userManager.defaultUserID);
    ctx.assertTruthy("Log in worked for " + forTest, logInResponse);
}

const mergingPasswordAddTest = "Merging Added Passwords Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordAddTest, func: async (ctx: TestContext) =>
    {
        const defaultUser = userManager.defaultUser;

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        const offlineDupPasswordOne = defaultPassword();
        offlineDupPasswordOne.l = "Merging Offline Dup Password 1";
        offlineDupPasswordOne.p = "One";

        const offlineDupPasswordTwo = defaultPassword();
        offlineDupPasswordTwo.l = "Merging Offline Dup Password 2";
        offlineDupPasswordTwo.p = "One";

        const offlineSafePasswordOne = defaultPassword();
        offlineSafePasswordOne.l = "Merging Offline Safe Password 1";
        offlineSafePasswordOne.p = "Svoweijiio3282uGsido-==DSF]12:JIOvj";

        await defaultUser.addPassword("Offline dup password 1", ctx, offlineDupPasswordOne, []);
        await defaultUser.addPassword("Offline dup password 2", ctx, offlineDupPasswordTwo, []);
        await defaultUser.addPassword("Offline safe password 1", ctx, offlineSafePasswordOne, []);

        ctx.assertTruthy("Offline dup password one exists in duplicates", app.currentVault.passwordStore.duplicatePasswords[offlineDupPasswordOne.id]);
        ctx.assertTruthy("Offline dup password two exists in duplicates", app.currentVault.passwordStore.duplicatePasswords[offlineDupPasswordTwo.id]);
        ctx.assertEquals("Offline safe password one exists", app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1], 1);

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordAddTest, ctx);

        ctx.assertUndefined("Merged Offline Dup Password one does not exist", app.currentVault.passwordStore.passwordsByID[offlineDupPasswordOne.id]);
        ctx.assertUndefined("Merged Offline Dup Password two does not exist", app.currentVault.passwordStore.passwordsByID[offlineDupPasswordTwo.id]);
        ctx.assertUndefined("Merged Offline Safe Password one does not exist", app.currentVault.passwordStore.passwordsByID[offlineSafePasswordOne.id]);

        ctx.assertEquals("No duplicate passwords", OH.size(app.currentVault.passwordStore.duplicatePasswords), 0);
        ctx.assertEquals("No safe passwords", app.currentVault.passwordStore.currentAndSafePasswordsSafe.length, 0);

        const onlineDupPasswordOne = defaultPassword();
        onlineDupPasswordOne.l = "Merging Online Dup Password 1";
        onlineDupPasswordOne.p = "Two";

        const onlineDupPasswordTwo = defaultPassword();
        onlineDupPasswordTwo.l = "Merging Online Dup Password 2";
        onlineDupPasswordTwo.p = "Two";

        const onlineSafePasswordOne = defaultPassword();
        onlineSafePasswordOne.l = "Merging online Safe Password 1";
        onlineSafePasswordOne.p = "Svoweijiio3282uGsido-==DSF]12:JIOvj";

        await defaultUser.addPassword("Online dup password 1", ctx, onlineDupPasswordOne, []);
        await defaultUser.addPassword("Online dup password 2", ctx, onlineDupPasswordTwo, []);
        await defaultUser.addPassword("Online safe password 1", ctx, onlineSafePasswordOne, []);

        ctx.assertTruthy("Online dup password one exists in duplicates", app.currentVault.passwordStore.duplicatePasswords[onlineDupPasswordOne.id]);
        ctx.assertTruthy("Online dup password two exists in duplicates", app.currentVault.passwordStore.duplicatePasswords[onlineDupPasswordTwo.id]);
        ctx.assertEquals("Online safe password one exists", app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1], 1);

        await swapToSecondDatabaseAndLogIn(mergingPasswordAddTest, ctx);

        ctx.assertTruthy("Merged Offline duplicate Password one exists after merge", app.currentVault.passwordStore.passwordsByID[offlineDupPasswordOne.id]);
        ctx.assertTruthy("Merged Offline duplicate Password two exists after merge", app.currentVault.passwordStore.passwordsByID[offlineDupPasswordTwo.id]);

        ctx.assertTruthy("Merged online duplicate Password one exists after merge", app.currentVault.passwordStore.passwordsByID[onlineDupPasswordOne.id]);
        ctx.assertTruthy("Merged online duplicate Password one exists after merge", app.currentVault.passwordStore.passwordsByID[onlineDupPasswordTwo.id]);

        ctx.assertTruthy("Merged offline safe Password one exists after merge", app.currentVault.passwordStore.passwordsByID[offlineSafePasswordOne.id]);
        ctx.assertTruthy("Merged online safe Password one exists after merge", app.currentVault.passwordStore.passwordsByID[onlineSafePasswordOne.id]);

        ctx.assertTruthy("Merged Offline duplicate Password one exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords[offlineDupPasswordOne.id]);
        ctx.assertTruthy("Merged Offline duplicate Password two exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords[offlineDupPasswordTwo.id]);

        ctx.assertTruthy("Merged online duplicate Password one exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords[onlineDupPasswordOne.id]);
        ctx.assertTruthy("Merged online duplicate Password two exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords[onlineDupPasswordTwo.id]);

        ctx.assertEquals("Safe passwords has 6 values", app.currentVault.passwordStore.currentAndSafePasswordsSafe.length, 6);
        ctx.assertEquals("Current passwords has 6 values", app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length, 6);
    }
});

const mergingSecurityQuestionsAddTest = "Merging Added Security Questions Works";
mergingDataTestSuite.tests.push({
    name: mergingSecurityQuestionsAddTest, func: async (ctx: TestContext) =>
    {
        const defaultUser = userManager.defaultUser;

        const password = defaultPassword();
        password.l = "Merging Added Security Questions Works";

        await defaultUser.addPassword("Merging Added Security Questions Works", ctx, password, []);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword.dataType);

        const securityQuestion = 
        {
            id: "1",
            q: "First",
            a: "yes"
        };

        retrievedPassword.dataType.q["1"] = securityQuestion;
        await defaultUser.updatePassword("Add security question offline", ctx, retrievedPassword, false, [securityQuestion], [], [], [], {});

        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsAddTest, ctx);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        ctx.assertEquals("Retrieved Password security question doesn't exist", OH.size(retrievedPassword.dataType.q), 0);

        const securityQuestion2 = 
        {
            id: "2",
            q: "Second",
            a: "no"
        };

        retrievedPassword.dataType.q["2"] = securityQuestion2;
        await defaultUser.updatePassword("Add security question online", ctx, retrievedPassword, false, [securityQuestion2], [], [], [], {});

        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsAddTest, ctx);

        const afterSyncingPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        ctx.assertTruthy("Merged Security Question one exists", afterSyncingPassword?.q["1"]);
        ctx.assertTruthy("Merged Security Question two exists", afterSyncingPassword?.q["2"]);
    }
});

const mergingFilterGroupsAddForPasswordTest = "Merging Added Filters / Groups for password Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupsAddForPasswordTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.l = "Merging Added Filters / Groups for password Works";

        const filter = defaultFilter(DataType.Passwords);
        filter.n = "Merging Added Filter For Password";
        filter.c["1"] = 
        {
            id: "1",
            p: "d",
            t: FilterConditionType.EqualTo,
            v: "Merging Added Filter For Password"
        };

        const group = defaultGroup(DataType.Passwords);
        group.n = "Merging Added Group For Password";

        const group2 = defaultGroup(DataType.Passwords);
        group2.n = "Merging Added Group For Password";

        await userManager.defaultUser.addPassword("Add Password succeeded", ctx, password, []);
        await userManager.defaultUser.addFilter("Add Filter succeeded", ctx, filter);
        await userManager.defaultUser.addGroup("Add Group 1 succeeded", ctx, group);
        await userManager.defaultUser.addGroup("Add Group 2 succeeded", ctx, group2);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);
        ctx.assertEquals("No groups", OH.size(retrievedPassword.dataType.g), 0);
        ctx.assertEquals("No filters", OH.size(retrievedPassword.dataType.i), 0);

        ctx.assertEquals("No Passwords for Group", OH.size(app.currentVault.groupStore.passwordGroupsByID[group.id].p), 0);
        ctx.assertEquals("No Passwords for Filter", OH.size(app.currentVault.filterStore.passwordFiltersByID[filter.id].p), 0);

        await userManager.defaultUser.updatePassword("Update password offline worked", ctx, retrievedPassword, false, [], [], [], [], { [group.id]: true });
        ctx.assertTruthy("Group has offline password", app.currentVault.groupStore.passwordGroupsByID[group.id].p[retrievedPassword.dataType.id]);

        const retrievedGroup = userManager.defaultUser.getEditableGroup(group2.id, DataType.Passwords);
        await userManager.defaultUser.updateGroup("Update group offline worked", ctx, retrievedGroup, {[ retrievedPassword.dataType.id ]: true });
        ctx.assertTruthy("Password has group", app.currentVault.passwordStore.passwordsByID[password.id].g[retrievedGroup.dataType.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupsAddForPasswordTest, ctx);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        ctx.assertEquals("Offline group doesn't exist for password", OH.size(retrievedPassword?.dataType.g), 0);
        ctx.assertEquals("Group doesn't have password", OH.size(app.currentVault.groupStore.passwordGroupsByID[group.id].p), 0);

        retrievedPassword.dataType.d = "Merging Added Filter For Password";
        await userManager.defaultUser.updatePassword("Update password worked", ctx, retrievedPassword, false, [], [], [], [], {});

        ctx.assertTruthy("Password has filter", app.currentVault.passwordStore.passwordsByID[password.id].i[filter.id]);
        ctx.assertTruthy("Filer has password", app.currentVault.filterStore.passwordFiltersByID[filter.id].p[password.id]);

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupsAddForPasswordTest, ctx);

        const passwordAfterSyncing = app.currentVault.passwordStore.passwordsByID[password.id];

        ctx.assertTruthy("Password has group 1 after merge", passwordAfterSyncing?.g[group.id]);
        ctx.assertTruthy("Password has group 2 after merge", passwordAfterSyncing?.g[group2.id])

        ctx.assertTruthy("Group 1 has password after merge", app.currentVault.groupStore.passwordGroupsByID[group.id].p[passwordAfterSyncing!.id]);
        ctx.assertTruthy("Group 2 has password after merge", app.currentVault.groupStore.passwordGroupsByID[group2.id].p[passwordAfterSyncing!.id]);

        ctx.assertTruthy("Password has filter after merge", passwordAfterSyncing?.i[filter.id]);
        ctx.assertTruthy("Filter has password after merge", app.currentVault.filterStore.passwordFiltersByID[filter.id].p[passwordAfterSyncing!.id]);
    }
});

const mergingFilterGroupsAddForValueTest = "Merging Added Filters / Groups for value Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupsAddForValueTest, func: async (ctx: TestContext) =>
    {
        const value = defaultValue();
        value.v = "Merging Added Filters / Groups for Value";

        const filter = defaultFilter(DataType.NameValuePairs);
        filter.n = "Merging Added Filter For Value";
        filter.c["1"] =
        {
            id: "1",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "Merging Added Filters / Groups for Value"
        };

        const group = defaultGroup(DataType.NameValuePairs);
        group.n = "Merging Added Filters / Groups for Value";

        const group2 = defaultGroup(DataType.NameValuePairs);
        group2.n = "Merging Added Filters / Groups for Value";

        await userManager.defaultUser.addNameValuePair("Add Value succeeded", ctx, value);
        await userManager.defaultUser.addFilter("Add Filter succeeded", ctx, filter);
        await userManager.defaultUser.addGroup("Add Group 1 succeeded", ctx, group);
        await userManager.defaultUser.addGroup("Add Group 2 succeeded", ctx, group2);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        ctx.assertTruthy("Retrieved Value exists", retrievedValue.dataType);

        ctx.assertEquals("No groups", OH.size(retrievedValue.dataType.g), 0);
        ctx.assertEquals("No filters", OH.size(retrievedValue.dataType.i), 0);

        ctx.assertEquals("No Value for Group", OH.size(app.currentVault.groupStore.valueGroupsByID[group.id].v), 0);
        ctx.assertEquals("No Value for Filter", OH.size(app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v), 0);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        await userManager.defaultUser.updateNameValuePair("Update Value offline worked", ctx, retrievedValue, false, { [group.id]: true });
        ctx.assertTruthy("Group has offline Value", app.currentVault.groupStore.valueGroupsByID[group.id].v[retrievedValue.dataType.id]);

        const retrievedGroup = userManager.defaultUser.getEditableGroup(group2.id, DataType.NameValuePairs);
        await userManager.defaultUser.updateGroup("Update group offline worked", ctx, retrievedGroup, { [retrievedValue.dataType.id]: true });
        ctx.assertTruthy("Value has group", app.currentVault.valueStore.nameValuePairsByID[value.id].g[retrievedGroup.dataType.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupsAddForValueTest, ctx);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value.id);
        ctx.assertEquals("Offline group doesn't exist for Value", OH.size(retrievedValue.dataType.g), 0);
        ctx.assertEquals("Group doesn't have Value", OH.size(app.currentVault.groupStore.valueGroupsByID[group.id].v), 0);

        retrievedValue.dataType.n = "Merging Added Filters / Groups for Value";
        await userManager.defaultUser.updateNameValuePair("Update value works", ctx, retrievedValue, false, {});
        ctx.assertTruthy("Value has filter", app.currentVault.valueStore.nameValuePairsByID[value.id].i[filter.id]);
        ctx.assertTruthy("Filer has Value", app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v[value.id]);

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupsAddForValueTest, ctx);

        const retrievedValueAfterSyncing = app.currentVault.valueStore.nameValuePairsByID[value.id];

        ctx.assertTruthy("Value has group 1 after merge", retrievedValueAfterSyncing?.g[group.id]);
        ctx.assertTruthy("Value has group 2 after merge", retrievedValueAfterSyncing?.g[group2.id])

        ctx.assertTruthy("Group 1 has Value after merge", app.currentVault.groupStore.valueGroupsByID[group.id].v[retrievedValueAfterSyncing!.id]);
        ctx.assertTruthy("Group 2 has Value after merge", app.currentVault.groupStore.valueGroupsByID[group2.id].v[retrievedValueAfterSyncing!.id]);

        ctx.assertTruthy("Value has filter after merge", retrievedValueAfterSyncing?.i[filter.id]);
        ctx.assertTruthy("Filter has Value after merge", app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v[retrievedValueAfterSyncing!.id]);
    }
});

const mergingValueAddTest = "Merging Added Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueAddTest, func: async (ctx: TestContext) =>
    {
        const beforeCurrentSize = app.currentVault.valueStore.currentAndSafeValuesCurrent.length;
        const beforeSafeSize = app.currentVault.valueStore.currentAndSafeValuesSafe.length;
        const beforeSafeValues = app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1];

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        const offlineDupValueOne = defaultValue();
        offlineDupValueOne.n = "Merging Offline Dup Value 1";
        offlineDupValueOne.v = "One";

        const offlineDupValueTwo = defaultValue();
        offlineDupValueTwo.n = "Merging Offline Dup Value 2";
        offlineDupValueTwo.v = "One";

        const offlineSafeValueOne = defaultValue();
        offlineSafeValueOne.y = NameValuePairType.Passcode;
        offlineSafeValueOne.n = "Merging Offline Safe Value 2";
        offlineSafeValueOne.v = "SLDvweilihslvih2ioht829u89oiILSGD]]p][2";

        await userManager.defaultUser.addNameValuePair("Add offline dup Value 1 succeeded", ctx, offlineDupValueOne);
        await userManager.defaultUser.addNameValuePair("Add offline dup Value 2 succeeded", ctx, offlineDupValueTwo);
        await userManager.defaultUser.addNameValuePair("Add offline safe Value 1 succeeded", ctx, offlineSafeValueOne);

        ctx.assertTruthy("Offline dup Value one exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs[offlineDupValueOne.id]);
        ctx.assertTruthy("Offline dup Value two exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs[offlineDupValueTwo.id]);
        ctx.assertEquals("Offline safe Value incremented exists", app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1], beforeSafeValues + 1);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueAddTest, ctx);

        ctx.assertUndefined("Merged Offline Dup Value one does not exist", app.currentVault.valueStore.nameValuePairsByID[offlineDupValueOne.id]);
        ctx.assertUndefined("Merged Offline Dup Value two does not exist", app.currentVault.valueStore.nameValuePairsByID[offlineDupValueTwo.id]);
        ctx.assertUndefined("Merged Offline Safe Value one does not exist", app.currentVault.valueStore.nameValuePairsByID[offlineSafeValueOne.id]);

        ctx.assertEquals("No duplicate values", OH.size(app.currentVault.valueStore.duplicateNameValuePairs), 0);
        ctx.assertEquals("No new safe values", app.currentVault.valueStore.currentAndSafeValuesSafe.length, beforeSafeSize);

        const onlineDupValueOne = defaultValue();
        onlineDupValueOne.n = "Merging online Dup Value 1";
        onlineDupValueOne.v = "One";

        const onlineDupValueTwo = defaultValue();
        onlineDupValueTwo.n = "Merging online Dup Value 2";
        onlineDupValueTwo.v = "One";

        const onlineSafeValueOne = defaultValue();
        onlineSafeValueOne.y = NameValuePairType.Passcode;
        onlineSafeValueOne.n = "Merging online Safe Value 2";
        onlineSafeValueOne.v = "SLDvweilihslvfih2ioht829u89oiILSGD]]p][2";

        await userManager.defaultUser.addNameValuePair("Add online dup Value 1 succeeded", ctx, onlineDupValueOne);
        await userManager.defaultUser.addNameValuePair("Add online dup Value 2 succeeded", ctx, onlineDupValueTwo);
        await userManager.defaultUser.addNameValuePair("Add online safe Value 1 succeeded", ctx, onlineSafeValueOne);

        ctx.assertTruthy("Online dup Value one exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs[onlineDupValueOne.id]);
        ctx.assertTruthy("Online dup Value two exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs[onlineDupValueTwo.id]);
        ctx.assertEquals("Online safe Value incremented exists", app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1], beforeSafeValues + 1);

        await swapToSecondDatabaseAndLogIn(mergingValueAddTest, ctx);

        ctx.assertTruthy("Merged Offline duplicate value one exists after merge", app.currentVault.valueStore.nameValuePairsByID[offlineDupValueOne.id]);
        ctx.assertTruthy("Merged Offline duplicate value two exists after merge", app.currentVault.valueStore.nameValuePairsByID[offlineDupValueTwo.id]);

        ctx.assertTruthy("Merged online duplicate value one exists after merge", app.currentVault.valueStore.nameValuePairsByID[onlineDupValueOne.id]);
        ctx.assertTruthy("Merged online duplicate value one exists after merge", app.currentVault.valueStore.nameValuePairsByID[onlineDupValueTwo.id]);

        ctx.assertTruthy("Merged offline safe value one exists after merge", app.currentVault.valueStore.nameValuePairsByID[offlineSafeValueOne.id]);
        ctx.assertTruthy("Merged online safe value one exists after merge", app.currentVault.valueStore.nameValuePairsByID[onlineSafeValueOne.id]);

        ctx.assertTruthy("Merged Offline duplicate value one exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs[offlineDupValueOne.id]);
        ctx.assertTruthy("Merged Offline duplicate value two exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs[offlineDupValueTwo.id]);

        ctx.assertTruthy("Merged online duplicate value one exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs[onlineDupValueOne.id]);
        ctx.assertTruthy("Merged online duplicate value two exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs[onlineDupValueTwo.id]);

        ctx.assertEquals("Safe values has 6 more values", app.currentVault.valueStore.currentAndSafeValuesSafe.length, beforeSafeSize + 6);
        ctx.assertEquals("Current values has 6 more values", app.currentVault.valueStore.currentAndSafeValuesCurrent.length, beforeCurrentSize + 6);
    }
});

const mergingFilterAddTest = "Merging Added Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterAddTest, func: async (ctx: TestContext) =>
    {
        const beforeEmptyPasswordFilters = OH.size(app.currentVault.filterStore.emptyPasswordFilters);
        const beforeEmptyValueFilters = OH.size(app.currentVault.filterStore.emptyValueFilters);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        const offlineDupEmptypasswordFilterOne = defaultFilter(DataType.Passwords);
        offlineDupEmptypasswordFilterOne.n = "Merging Offline Dup Empty Password Filter 1";

        const offlineDupEmptypasswordFilterTwo = defaultFilter(DataType.Passwords);
        offlineDupEmptypasswordFilterTwo.n = "Merging Offline Dup Empty Password Filter 2";

        const offlineDupEmptyValueFilterOne = defaultFilter(DataType.NameValuePairs);
        offlineDupEmptyValueFilterOne.n = "Merging Offline Dup Empty Value Filter 1";

        const offlineDupEmptyValueFilterTwo = defaultFilter(DataType.NameValuePairs);
        offlineDupEmptyValueFilterTwo.n = "Merging Offline Dup Empty Value Filter 1";

        await userManager.defaultUser.addFilter("Add Offline Dup Empty Password 1 Filter succeeded", ctx, offlineDupEmptypasswordFilterOne);
        await userManager.defaultUser.addFilter("Add Offline Dup Empty Password 2 Filter succeeded", ctx, offlineDupEmptypasswordFilterTwo);
        await userManager.defaultUser.addFilter("Add Offline Dup Empty Value 1 Filter succeeded", ctx, offlineDupEmptyValueFilterOne);
        await userManager.defaultUser.addFilter("Add Offline Dup Empty Value 2 Filter succeeded", ctx, offlineDupEmptyValueFilterTwo);

        ctx.assertTruthy("Offline dup empty password filter one exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters[offlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Offline dup empty password filter two exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters[offlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Offline dup empty value filter one exists in duplicates", app.currentVault.filterStore.duplicateValueFilters[offlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Offline dup empty value filter two exists in duplicates", app.currentVault.filterStore.duplicateValueFilters[offlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Offline dup empty password filter one exists in empties", app.currentVault.filterStore.emptyPasswordFilters[offlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Offline dup empty password filter two exists in empties", app.currentVault.filterStore.emptyPasswordFilters[offlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Offline dup empty value filter one exists in empties", app.currentVault.filterStore.emptyValueFilters[offlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Offline dup empty value filter two exists in empties", app.currentVault.filterStore.emptyValueFilters[offlineDupEmptyValueFilterTwo.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterAddTest, ctx);

        ctx.assertUndefined("Offline dup empty password Filter one does not exist", app.currentVault.filterStore.passwordFiltersByID[offlineDupEmptypasswordFilterOne.id]);
        ctx.assertUndefined("Offline dup empty password Filter two does not exist", app.currentVault.filterStore.passwordFiltersByID[offlineDupEmptypasswordFilterTwo.id]);

        ctx.assertUndefined("Offline dup empty value Filter one does not exist", app.currentVault.filterStore.nameValuePairFiltersByID[offlineDupEmptyValueFilterOne.id]);
        ctx.assertUndefined("Offline dup empty value Filter two does not exist", app.currentVault.filterStore.nameValuePairFiltersByID[offlineDupEmptyValueFilterTwo.id]);

        ctx.assertEquals("No offline duplicate password filters", OH.size(app.currentVault.filterStore.duplicatePasswordFilters), 0);
        ctx.assertEquals("No offline duplicate value filters", OH.size(app.currentVault.filterStore.duplicateValueFilters), 0);

        ctx.assertEquals("No new offline empty password filters", OH.size(app.currentVault.filterStore.emptyPasswordFilters), beforeEmptyPasswordFilters);
        ctx.assertEquals("No new offline empty value filters", OH.size(app.currentVault.filterStore.emptyValueFilters), beforeEmptyValueFilters);

        const onlineDupEmptypasswordFilterOne = defaultFilter(DataType.Passwords);
        onlineDupEmptypasswordFilterOne.n = "Merging Online Dup Empty Password Filter 1";

        const onlineDupEmptypasswordFilterTwo = defaultFilter(DataType.Passwords);
        onlineDupEmptypasswordFilterTwo.n = "Merging Online Dup Empty Password Filter 2";

        const onlineDupEmptyValueFilterOne = defaultFilter(DataType.NameValuePairs);
        onlineDupEmptyValueFilterOne.n = "Merging Online Dup Empty Value Filter 1";

        const onlineDupEmptyValueFilterTwo = defaultFilter(DataType.NameValuePairs);
        onlineDupEmptyValueFilterTwo.n = "Merging Online Dup Empty Value Filter 1";

        await userManager.defaultUser.addFilter("Add Online Dup Empty Password 1 Filter succeeded", ctx, onlineDupEmptypasswordFilterOne);
        await userManager.defaultUser.addFilter("Add Online Dup Empty Password 2 Filter succeeded", ctx, onlineDupEmptypasswordFilterTwo);
        await userManager.defaultUser.addFilter("Add Online Dup Empty Value 1 Filter succeeded", ctx, onlineDupEmptyValueFilterOne);
        await userManager.defaultUser.addFilter("Add Online Dup Empty Value 2 Filter succeeded", ctx, onlineDupEmptyValueFilterTwo);

        ctx.assertTruthy("Online dup empty password filter one exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters[onlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Online dup empty password filter two exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters[onlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Online dup empty value filter one exists in duplicates", app.currentVault.filterStore.duplicateValueFilters[onlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Online dup empty value filter two exists in duplicates", app.currentVault.filterStore.duplicateValueFilters[onlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Online dup empty password filter one exists in empties", app.currentVault.filterStore.emptyPasswordFilters[onlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Online dup empty password filter two exists in empties", app.currentVault.filterStore.emptyPasswordFilters[onlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Online dup empty value filter one exists in empties", app.currentVault.filterStore.emptyValueFilters[onlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Online dup empty value filter two exists in empties", app.currentVault.filterStore.emptyValueFilters[onlineDupEmptyValueFilterTwo.id]);

        await swapToSecondDatabaseAndLogIn(mergingFilterAddTest, ctx);

        ctx.assertTruthy("Merged offline duplicate empty password filter one exists after merge", app.currentVault.filterStore.passwordFiltersByID[offlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty password filter two exists after merge", app.currentVault.filterStore.passwordFiltersByID[offlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Merged offline duplicate empty value filter one exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID[offlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty value filter two exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID[offlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Merged online duplicate empty password filter one exists after merge", app.currentVault.filterStore.passwordFiltersByID[onlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Merged online duplicate empty password filter two exists after merge", app.currentVault.filterStore.passwordFiltersByID[onlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Merged online duplicate empty value filter one exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID[onlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Merged online duplicate empty value filter two exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID[onlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Merged offline duplicate empty password filter one exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters[offlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty password filter two exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters[offlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Merged offline duplicate empty value filter one exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters[offlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty value filter two exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters[offlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Merged online duplicate empty password filter one exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters[onlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Merged online duplicate empty password filter two exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters[onlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Merged online duplicate empty value filter one exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters[onlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Merged online duplicate empty value filter two exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters[onlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Merged offline duplicate empty password filter one exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters[offlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty password filter two exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters[offlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Merged offline duplicate empty value filter one exists in empty after merge", app.currentVault.filterStore.emptyValueFilters[offlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty value filter two exists in empty after merge", app.currentVault.filterStore.emptyValueFilters[offlineDupEmptyValueFilterTwo.id]);

        ctx.assertTruthy("Merged online duplicate empty password filter one exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters[onlineDupEmptypasswordFilterOne.id]);
        ctx.assertTruthy("Merged online duplicate empty password filter two exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters[onlineDupEmptypasswordFilterTwo.id]);
        ctx.assertTruthy("Merged online duplicate empty value filter one exists in empty after merge", app.currentVault.filterStore.emptyValueFilters[onlineDupEmptyValueFilterOne.id]);
        ctx.assertTruthy("Merged online duplicate empty value filter two exists in empty after merge", app.currentVault.filterStore.emptyValueFilters[onlineDupEmptyValueFilterTwo.id]);
    }
});

const mergingFilterConditionsAddTest = "Merging Added Filter Conditions Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterConditionsAddTest, func: async (ctx: TestContext) =>
    {
        const filter = defaultFilter(DataType.Passwords);
        filter.n = "Merging Filter Conditions";

        const addFilterSucceeded = await userManager.defaultUser.addFilter("Add filter succeeded", ctx, filter);
        ctx.assertTruthy("Add filter succeeded", addFilterSucceeded);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);
        ctx.assertTruthy("Retrieved Filter exists", retrievedFilter);

        const addedFilterConditions = [
        {
                id: "1",
                p: "l",
                t: FilterConditionType.Contains,
                v: ""
        }];

        await userManager.defaultUser.updateFilter("Add filter conditions offline worked", ctx, retrievedFilter, addedFilterConditions, []);
        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsAddTest, ctx);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);
        ctx.assertEquals("Retrieved offline Password security question doesn't exist", OH.size(retrievedFilter.dataType.c), 0);

        const addedFilterConditionsTwo = [
        {
                id: "2",
                p: "l",
                t: FilterConditionType.Contains,
                v: ""
        }];

        await userManager.defaultUser.updateFilter("Add filter conditions online worked", ctx, retrievedFilter, addedFilterConditionsTwo, []);
        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsAddTest, ctx);

        const retrievedFilterAfterSyncing = app.currentVault.filterStore.passwordFiltersByID[filter.id];

        ctx.assertTruthy("Merged filter condition one exists", retrievedFilterAfterSyncing?.c["1"]);
        ctx.assertTruthy("Merged filter condition two exists", retrievedFilterAfterSyncing?.c["2"]);
    }
});

const mergingGroupAddTest = "Merging Added Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupAddTest, func: async (ctx: TestContext) =>
    {
        const beforeEmptyPasswordGroupsCount = OH.size(app.currentVault.groupStore.emptyPasswordGroups);
        const beforeDuplicatePasswordGroupsCount = OH.size(app.currentVault.groupStore.duplicatePasswordGroups);
        const beforeDuplicteValueGroupsCount = OH.size(app.currentVault.groupStore.duplicateValueGroups);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        const offlineDupEmptyPasswordGroupOne = defaultGroup(DataType.Passwords);
        offlineDupEmptyPasswordGroupOne.n = "Merging Offline Dup Empty Password Group 1";

        const offlineDupEmptyPasswordGroupTwo = defaultGroup(DataType.Passwords);
        offlineDupEmptyPasswordGroupTwo.n = "Merging Offline Dup Empty Password Group 2";

        const offlineDupEmptyValueGroupOne = defaultGroup(DataType.NameValuePairs);
        offlineDupEmptyValueGroupOne.n = "Merging Offline Dup Empty Value Group 1";

        const offlineDupEmptyValueGroupTwo = defaultGroup(DataType.NameValuePairs);
        offlineDupEmptyValueGroupTwo.n = "Merging Offline Dup Empty Value Group 1";

        await userManager.defaultUser.addGroup("Add Offline Dup Empty Password 1 Group succeeded", ctx, offlineDupEmptyPasswordGroupOne);
        await userManager.defaultUser.addGroup("Add Offline Dup Empty Password 2 Group succeeded", ctx, offlineDupEmptyPasswordGroupTwo);
        await userManager.defaultUser.addGroup("Add Offline Dup Empty Value 1 Group succeeded", ctx, offlineDupEmptyValueGroupOne);
        await userManager.defaultUser.addGroup("Add Offline Dup Empty Value 2 Group succeeded", ctx, offlineDupEmptyValueGroupTwo);

        ctx.assertTruthy("Offline dup empty password Group one exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups[offlineDupEmptyPasswordGroupOne.id]);
        ctx.assertTruthy("Offline dup empty password Group two exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups[offlineDupEmptyPasswordGroupTwo.id]);
        ctx.assertTruthy("Offline dup empty value Group one exists in duplicates", app.currentVault.groupStore.duplicateValueGroups[offlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Offline dup empty value Group two exists in duplicates", app.currentVault.groupStore.duplicateValueGroups[offlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Offline dup empty password Group one exists in empties", app.currentVault.groupStore.emptyPasswordGroups[offlineDupEmptyPasswordGroupOne.id]);
        ctx.assertTruthy("Offline dup empty password Group two exists in empties", app.currentVault.groupStore.emptyPasswordGroups[offlineDupEmptyPasswordGroupTwo.id]);
        ctx.assertTruthy("Offline dup empty value Group one exists in empties", app.currentVault.groupStore.emptyValueGroups[offlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Offline dup empty value Group two exists in empties", app.currentVault.groupStore.emptyValueGroups[offlineDupEmptyValueGroupTwo.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingGroupAddTest, ctx);

        ctx.assertUndefined("Offline dup empty password Group one does not exist", app.currentVault.groupStore.passwordGroupsByID[offlineDupEmptyPasswordGroupOne.id]);
        ctx.assertUndefined("Offline dup empty password Group two does not exist", app.currentVault.groupStore.passwordGroupsByID[offlineDupEmptyPasswordGroupTwo.id]);

        ctx.assertUndefined("Offline dup empty value Group one does not exist", app.currentVault.groupStore.valueGroupsByID[offlineDupEmptyValueGroupOne.id]);
        ctx.assertUndefined("Offline dup empty value Group two does not exist", app.currentVault.groupStore.valueGroupsByID[offlineDupEmptyValueGroupTwo.id]);

        ctx.assertEquals("No new offline duplicate password Group", OH.size(app.currentVault.groupStore.duplicatePasswordGroups), beforeDuplicatePasswordGroupsCount);
        ctx.assertEquals("No new offline duplicate value Group", OH.size(app.currentVault.groupStore.duplicateValueGroups), beforeDuplicteValueGroupsCount);

        ctx.assertEquals("No added offline empty password Group", OH.size(app.currentVault.groupStore.emptyPasswordGroups), beforeEmptyPasswordGroupsCount);
        ctx.assertEquals("No offline empty value Group", OH.size(app.currentVault.groupStore.emptyValueGroups), 0);

        const onlineDupEmptypasswordGroupOne = defaultGroup(DataType.Passwords);
        onlineDupEmptypasswordGroupOne.n = "Merging Online Dup Empty Password Group 1";

        const onlineDupEmptypasswordGroupTwo = defaultGroup(DataType.Passwords);
        onlineDupEmptypasswordGroupTwo.n = "Merging Online Dup Empty Password Group 2";

        const onlineDupEmptyValueGroupOne = defaultGroup(DataType.NameValuePairs);
        onlineDupEmptyValueGroupOne.n = "Merging Online Dup Empty Value Group 1";

        const onlineDupEmptyValueGroupTwo = defaultGroup(DataType.NameValuePairs);
        onlineDupEmptyValueGroupTwo.n = "Merging Online Dup Empty Value Group 1";

        await userManager.defaultUser.addGroup("Add Online Dup Empty Password 1 Group succeeded", ctx, onlineDupEmptypasswordGroupOne);
        await userManager.defaultUser.addGroup("Add Online Dup Empty Password 2 Group succeeded", ctx, onlineDupEmptypasswordGroupTwo);
        await userManager.defaultUser.addGroup("Add Online Dup Empty Value 1 Group succeeded", ctx, onlineDupEmptyValueGroupOne);
        await userManager.defaultUser.addGroup("Add Online Dup Empty Value 2 Group succeeded", ctx, onlineDupEmptyValueGroupTwo);

        ctx.assertTruthy("Online dup empty password Group one exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups[onlineDupEmptypasswordGroupOne.id]);
        ctx.assertTruthy("Online dup empty password Group two exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups[onlineDupEmptypasswordGroupTwo.id]);
        ctx.assertTruthy("Online dup empty value Group one exists in duplicates", app.currentVault.groupStore.duplicateValueGroups[onlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Online dup empty value Group two exists in duplicates", app.currentVault.groupStore.duplicateValueGroups[onlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Online dup empty password Group one exists in empties", app.currentVault.groupStore.emptyPasswordGroups[onlineDupEmptypasswordGroupOne.id]);
        ctx.assertTruthy("Online dup empty password Group two exists in empties", app.currentVault.groupStore.emptyPasswordGroups[onlineDupEmptypasswordGroupTwo.id]);
        ctx.assertTruthy("Online dup empty value Group one exists in empties", app.currentVault.groupStore.emptyValueGroups[onlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Online dup empty value Group two exists in empties", app.currentVault.groupStore.emptyValueGroups[onlineDupEmptyValueGroupTwo.id]);

        await swapToSecondDatabaseAndLogIn(mergingGroupAddTest, ctx);

        ctx.assertTruthy("Merged offline duplicate empty password Group one exists after merge", app.currentVault.groupStore.passwordGroupsByID[offlineDupEmptyPasswordGroupOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty password Group two exists after merge", app.currentVault.groupStore.passwordGroupsByID[offlineDupEmptyPasswordGroupTwo.id]);
        ctx.assertTruthy("Merged offline duplicate empty value Group one exists after merge", app.currentVault.groupStore.valueGroupsByID[offlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty value Group two exists after merge", app.currentVault.groupStore.valueGroupsByID[offlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Merged online duplicate empty password Group one exists after merge", app.currentVault.groupStore.passwordGroupsByID[onlineDupEmptypasswordGroupOne.id]);
        ctx.assertTruthy("Merged online duplicate empty password Group two exists after merge", app.currentVault.groupStore.passwordGroupsByID[onlineDupEmptypasswordGroupTwo.id]);
        ctx.assertTruthy("Merged online duplicate empty value Group one exists after merge", app.currentVault.groupStore.valueGroupsByID[onlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Merged online duplicate empty value Group two exists after merge", app.currentVault.groupStore.valueGroupsByID[onlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Merged offline duplicate empty password Group one exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups[offlineDupEmptyPasswordGroupOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty password Group two exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups[offlineDupEmptyPasswordGroupTwo.id]);
        ctx.assertTruthy("Merged offline duplicate empty value Group one exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups[offlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty value Group two exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups[offlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Merged online duplicate empty password Group one exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups[onlineDupEmptypasswordGroupOne.id]);
        ctx.assertTruthy("Merged online duplicate empty password Group two exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups[onlineDupEmptypasswordGroupTwo.id]);
        ctx.assertTruthy("Merged online duplicate empty value Group one exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups[onlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Merged online duplicate empty value Group two exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups[onlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Merged offline duplicate empty password Group one exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups[offlineDupEmptyPasswordGroupOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty password Group two exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups[offlineDupEmptyPasswordGroupTwo.id]);
        ctx.assertTruthy("Merged offline duplicate empty value Group one exists in empty after merge", app.currentVault.groupStore.emptyValueGroups[offlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Merged offline duplicate empty value Group two exists in empty after merge", app.currentVault.groupStore.emptyValueGroups[offlineDupEmptyValueGroupTwo.id]);

        ctx.assertTruthy("Merged online duplicate empty password Group one exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups[onlineDupEmptypasswordGroupOne.id]);
        ctx.assertTruthy("Merged online duplicate empty password Group two exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups[onlineDupEmptypasswordGroupTwo.id]);
        ctx.assertTruthy("Merged online duplicate empty value Group one exists in empty after merge", app.currentVault.groupStore.emptyValueGroups[onlineDupEmptyValueGroupOne.id]);
        ctx.assertTruthy("Merged online duplicate empty value Group two exists in empty after merge", app.currentVault.groupStore.emptyValueGroups[onlineDupEmptyValueGroupTwo.id]);
    }
});

const mergingPasswordUpdatesTest = "Merging Updated Passwords Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordUpdatesTest, func: async (ctx: TestContext) =>
    {
        const dupPasswordOne = defaultPassword();
        dupPasswordOne.l = "MMerging Updated Duplidate Password 1";
        dupPasswordOne.p = "Merging Updated Duplidate Password 1";

        const dupPasswordTwo = defaultPassword();
        dupPasswordTwo.l = "Merging Updated Duplicate password 2";
        dupPasswordTwo.p = "Merging Updated Duplidate Password 1";

        const dupPasswordThree = defaultPassword();
        dupPasswordThree.l = "MMerging Updated Duplidate Password 3";
        dupPasswordThree.p = "Merging Updated Duplidate Password 2";

        const dupPasswordFour = defaultPassword();
        dupPasswordFour.l = "Merging Updated Duplicate password 4";
        dupPasswordFour.p = "Merging Updated Duplidate Password 2";

        const dupPasswordFive = defaultPassword();
        dupPasswordFive.l = "MMerging Updated Duplidate Password 5";
        dupPasswordFive.p = "Merging Updated Duplidate Password 3";

        const dupPasswordSix = defaultPassword();
        dupPasswordSix.l = "Merging Updated Duplicate password 6";
        dupPasswordSix.p = "Merging Updated Duplidate Password 3";

        await userManager.defaultUser.addPassword("Add Dup Password one succeeded", ctx, dupPasswordOne);
        await userManager.defaultUser.addPassword("Add Dup Password two succeeded", ctx, dupPasswordTwo);
        await userManager.defaultUser.addPassword("Add Dup Password three succeeded", ctx, dupPasswordThree);
        await userManager.defaultUser.addPassword("Add Dup Password four succeeded", ctx, dupPasswordFour);
        await userManager.defaultUser.addPassword("Add Dup Password five succeeded", ctx, dupPasswordFive);
        await userManager.defaultUser.addPassword("Add Dup Password six succeeded", ctx, dupPasswordSix);

        ctx.assertTruthy("Dup password 1 exists after add", app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("Dup password 2 exists after add", app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);
        ctx.assertTruthy("Dup password 3 exists after add", app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("Dup password 4 exists after add", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);
        ctx.assertTruthy("Dup password 5 exists after add", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Dup password 6 exists after add", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordOne.id);
        retrievedPassword.dataType.d = "first";
        retrievedPassword.dataType.e = "test@test.com";
        retrievedPassword.dataType.p = "updated";

        await userManager.defaultUser.updatePassword("Update Offline Password succeeded", ctx, retrievedPassword, true, [], [], [], [], {});

        ctx.assertTruthy("Duplicate password one doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("Duplicate password two doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordFive.id);
        retrievedPassword.dataType.p = "test 3";

        await userManager.defaultUser.updatePassword("Update Offline Password succeeded", ctx, retrievedPassword, true, [], [], [], [], {});

        ctx.assertTruthy("Duplicate password 5 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Duplicate password 6 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordUpdatesTest, ctx);

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordOne.id);

        const result = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedPassword.dataType.p);
        ctx.assertEquals("retrieved password password was not updated", result.value, "Merging Updated Duplidate Password 1");
        ctx.assertEquals("retrieved password domain is empty", retrievedPassword.dataType.d, "");
        ctx.assertEquals("retrieved password email is empty", retrievedPassword.dataType.e, "");

        ctx.assertTruthy("Dup password 1 exists on online", app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("Dup password 2 exists on online", app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);
        ctx.assertTruthy("Dup password 3 exists on online", app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("Dup password 4 exists on online", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);
        ctx.assertTruthy("Dup password 5 exists on online", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Dup password 6 exists on online", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        retrievedPassword.dataType.d = "second";
        retrievedPassword.dataType.a = "info";
        retrievedPassword.dataType.p = "updated 2";

        await userManager.defaultUser.updatePassword("Update Online Password 1 succeeded", ctx, retrievedPassword, true, [], [], [], [], {});
        
        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordThree.id);
        retrievedPassword.dataType.p = "test 2";

        await userManager.defaultUser.updatePassword("Update Online Password 3 succeeded", ctx, retrievedPassword, true, [], [], [], [], {});

        ctx.assertTruthy("Dup password 3 doesn't exists on online 2", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("Dup password 4 doesn't exists on online 2", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);
        
        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordFive.id);
        retrievedPassword.dataType.p = "test 4";

        await userManager.defaultUser.updatePassword("Update Online Password 5 succeeded", ctx, retrievedPassword, true, [], [], [], [], {});

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordSix.id);
        retrievedPassword.dataType.p = "test 4";

        await userManager.defaultUser.updatePassword("Update Online Password 6 succeeded", ctx, retrievedPassword, true, [], [], [], [], {});

        ctx.assertTruthy("Dup password 5 exists on online 2", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Dup password 6 exists on online 2", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        await swapToSecondDatabaseAndLogIn(mergingPasswordUpdatesTest, ctx);

        const finalPassword = app.currentVault.passwordStore.passwordsByID[dupPasswordOne.id];

        const decryptResult = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, finalPassword.p);
        ctx.assertEquals("merged password password is updated 2", decryptResult.value, "updated 2");
        ctx.assertEquals("merged password domain is second", finalPassword.d, "second");
        ctx.assertEquals("merged password email is test@test.com", finalPassword.e, "test@test.com");
        ctx.assertEquals("merged password info is info", finalPassword.a, "info");

        // was deleted offline
        ctx.assertTruthy("merged duplicate password one doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("merged duplicate password two doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);

        // we deleted online
        ctx.assertTruthy("merged duplicate password three doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("merged duplicate password four doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);

        // was edited online after they were deleted offline, they should still be there
        ctx.assertTruthy("merged duplicate password 5 exist", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("merged duplicate password 6 exist", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);
    }
});

const mergingSecurityQuestionsUpdateTest = "Merging Updated Security Questions Works";
mergingDataTestSuite.tests.push({
    name: mergingSecurityQuestionsUpdateTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.l = "Merging Updated Security Questions Works";

        const addedSecurityQuestions = [
        {
            id: "1",
            q: "zero",
            a: "zero",
        }];

        await userManager.defaultUser.addPassword("Add Password 1 succeeded", ctx, password, addedSecurityQuestions);

        const savedPassword = app.currentVault.passwordStore.passwordsByID[password.id];
        ctx.assertTruthy("Password security question 1 id is set", savedPassword!.q["1"]!.id != undefined);
        ctx.assertTruthy("Password security question 1 question is set", savedPassword!.q["1"]!.q != undefined);
        ctx.assertTruthy("Password security question 1 answer is set", savedPassword!.q["1"]!.a != undefined);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        let securityQuestion = retrievedPassword.dataType.q["1"];
        securityQuestion!.q = "first";

        await userManager.defaultUser.updatePassword("Update Offline Password succeeded", ctx, retrievedPassword, false, [], [securityQuestion], [], [], {});
        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsUpdateTest, ctx);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        let decryptResult = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedPassword.dataType.q["1"]!.q);
        ctx.assertEquals("Retrieved Password security question isn't updated", decryptResult.value, "zero");

        securityQuestion!.q = "second";
        securityQuestion!.a = "second";

        await userManager.defaultUser.updatePassword("Update Online Password succeeded", ctx, retrievedPassword, false, [], [securityQuestion], [securityQuestion], [], {});
        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsUpdateTest, ctx);

        const retrievedPasswordAfterSyncing = app.currentVault.passwordStore.passwordsByID[password.id];
        securityQuestion = retrievedPasswordAfterSyncing.q["1"];

        const decryptedQuestion = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, securityQuestion!.q);
        const decryptedAnswer = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, securityQuestion!.a);

        ctx.assertEquals("Merged Security Question question is second", decryptedQuestion.value, "second");
        ctx.assertEquals("Merged Security Question answer is second", decryptedAnswer.value, "second");
    }
});

const mergingValueUpdatesTest = "Merging Updated Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueUpdatesTest, func: async (ctx: TestContext) =>
    {
        const dupValueOne = defaultValue();
        dupValueOne.n = "MMerging Updated Duplidate Value 1";
        dupValueOne.v = "Merging Updated Duplidate Value 1";

        const dupValueTwo = defaultValue();
        dupValueTwo.n = "Merging Updated Duplicate Value 2";
        dupValueTwo.v = "Merging Updated Duplidate Value 1";

        const dupValueThree = defaultValue();
        dupValueThree.n = "MMerging Updated Duplidate Value 3";
        dupValueThree.v = "Merging Updated Duplidate Value 2";

        const dupValueFour = defaultValue();
        dupValueFour.n = "Merging Updated Duplicate Value 4";
        dupValueFour.v = "Merging Updated Duplidate Value 2";

        const dupValueFive = defaultValue();
        dupValueFive.n = "MMerging Updated Duplidate Value 5";
        dupValueFive.v = "Merging Updated Duplidate Value 3";

        const dupValueSix = defaultValue();
        dupValueSix.n = "Merging Updated Duplicate Value 6";
        dupValueSix.v = "Merging Updated Duplidate Value 3";

        await userManager.defaultUser.addNameValuePair("Add Dup Value one succeeded", ctx, dupValueOne);
        await userManager.defaultUser.addNameValuePair("Add Dup Value two succeeded", ctx, dupValueTwo);
        await userManager.defaultUser.addNameValuePair("Add Dup Value three succeeded", ctx, dupValueThree);
        await userManager.defaultUser.addNameValuePair("Add Dup Value four succeeded", ctx, dupValueFour);
        await userManager.defaultUser.addNameValuePair("Add Dup Value five succeeded", ctx, dupValueFive);
        await userManager.defaultUser.addNameValuePair("Add Dup Value six succeeded", ctx, dupValueSix);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let valueState = app.currentVault.valueStore.cloneState();

        let retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueOne.id);
        retrievedValue.dataType.n = "first";
        retrievedValue.dataType.y = NameValuePairType.Passphrase;
        retrievedValue.dataType.v = "updated";

        await userManager.defaultUser.updateNameValuePair("Update Offline Value 1 succeeded", ctx, retrievedValue, true, {});

        ctx.assertTruthy("Duplicate Value one doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("Duplicate Value two doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueFive.id);
        retrievedValue.dataType.v = "test 3";

        await userManager.defaultUser.updateNameValuePair("Update Offline Value 5 succeeded", ctx, retrievedValue, true, {});

        ctx.assertTruthy("Duplicate Value 5 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Duplicate Value 6 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueUpdatesTest, ctx);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueOne.id);

        let decryptedResult = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedValue.dataType.v);
        ctx.assertEquals("retrieved value value isn't updated", decryptedResult.value, "Merging Updated Duplidate Value 1");
        ctx.assertEquals("retrieved Value name isn't updated", retrievedValue.dataType.n, "MMerging Updated Duplidate Value 1");
        ctx.assertUndefined("retrieved Value valueType isn't updated", retrievedValue.dataType.y);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        retrievedValue.dataType.n = "second";
        retrievedValue.dataType.a = "info";
        retrievedValue.dataType.v = "updated 2";

        await userManager.defaultUser.updateNameValuePair("Update Online Value 1 succeeded", ctx, retrievedValue, true, {});

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueThree.id);
        retrievedValue.dataType.v = "test 2";

        await userManager.defaultUser.updateNameValuePair("Update Online Value 3 succeeded", ctx, retrievedValue, true, {});

        ctx.assertTruthy("Dup Value 3 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("Dup Value 4 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueFive.id);
        retrievedValue.dataType.v = "test 4";

        await userManager.defaultUser.updateNameValuePair("Update Online Value 5 succeeded", ctx, retrievedValue, true, {});

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueSix.id);
        retrievedValue.dataType.v = "test 4";

        await userManager.defaultUser.updateNameValuePair("Update Online Value 6 succeeded", ctx, retrievedValue, true, {});

        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        await swapToSecondDatabaseAndLogIn(mergingValueUpdatesTest, ctx);

        const retrievedValueAfterSyncing = app.currentVault.valueStore.nameValuePairsByID[dupValueOne.id];
        decryptedResult = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedValueAfterSyncing.v);

        ctx.assertEquals("merged value value is updated 2", decryptedResult.value, "updated 2");
        ctx.assertEquals("merged Value name is second", retrievedValueAfterSyncing.n, "second");
        ctx.assertEquals("merged Value email is test@test.com", retrievedValueAfterSyncing.y, NameValuePairType.Passphrase);
        ctx.assertEquals("merged Value info is info", retrievedValueAfterSyncing.a, "info");

        // was deleted offline
        ctx.assertTruthy("merged duplicate Value one doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("merged duplicate Value two doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);

        // we deleted online
        ctx.assertTruthy("merged duplicate Value three doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("merged duplicate Value four doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);

        // was edited online after they were deleted offline, they should still be there
        ctx.assertTruthy("merged duplicate Value 5 exist", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("merged duplicate Value 6 exist", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);
    }
});

const mergingFilterUpdatesTest = "Merging Updated Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterUpdatesTest, func: async (ctx: TestContext) =>
    {
        const filterOne = defaultFilter(DataType.Passwords);
        filterOne.n = "MMerging Updated Filter 1";

        const filterTwo = defaultFilter(DataType.Passwords);
        filterTwo.n = "Merging Updated Filter 2";

        const filterThree = defaultFilter(DataType.NameValuePairs);
        filterThree.n = "Merging Updated Filter 3";

        await userManager.defaultUser.addFilter("Add Filter one succeeded", ctx, filterOne);
        await userManager.defaultUser.addFilter("Add Filter two succeeded", ctx, filterTwo);
        await userManager.defaultUser.addFilter("Add Filter three succeeded", ctx, filterThree);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filterOne.id, DataType.Passwords);
        retrievedFilter.dataType.n = "first";

        await userManager.defaultUser.updateFilter("Update Offline Filter 1 succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterTwo.id, DataType.Passwords);
        retrievedFilter.dataType.n = "first";

        await userManager.defaultUser.updateFilter("Update Offline Filter 2 succeeded", ctx, retrievedFilter, [], []);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterUpdatesTest, ctx);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterTwo.id, DataType.Passwords);
        ctx.assertEquals("retrieved Filter name isn't updated", retrievedFilter.dataType.n, "Merging Updated Filter 2");

        retrievedFilter.dataType.n = "second";
        await userManager.defaultUser.updateFilter("Update Offline Filter 2 succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterThree.id, DataType.NameValuePairs);

        retrievedFilter.dataType.n = "second";
        await userManager.defaultUser.updateFilter("Update Offline Filter 3 succeeded", ctx, retrievedFilter, [], []);

        await swapToSecondDatabaseAndLogIn(mergingFilterUpdatesTest, ctx);

        let retrievedFilterAfterSyncing = app.currentVault.filterStore.passwordFiltersByID[filterOne.id];
        ctx.assertEquals("merged Filter one name is first", retrievedFilterAfterSyncing.n, "first");

        retrievedFilterAfterSyncing = app.currentVault.filterStore.passwordFiltersByID[filterTwo.id];
        ctx.assertEquals("merged Filter two name is second", retrievedFilterAfterSyncing.n, "second");

        retrievedFilterAfterSyncing = app.currentVault.filterStore.nameValuePairFiltersByID[filterThree.id];
        ctx.assertEquals("merged Filter three name is second", retrievedFilterAfterSyncing.n, "second");
    }
});

const mergingFilterConditionsUpdateTest = "Merging Update Filter Conditions Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterConditionsUpdateTest, func: async (ctx: TestContext) =>
    {
        const filter = defaultFilter(DataType.Passwords);
        filter.n = "Merging Filter Conditions";
        filter.c["1"] = 
        {
            id: "1",
            p: "l",
            t: FilterConditionType.Contains,
            v: "0"
        };

        await userManager.defaultUser.addFilter("Add Filter succeeded", ctx, filter);
        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);
        let filterCondition = retrievedFilter.dataType.c["1"];
        filterCondition.p = "d";
        filterCondition.t = FilterConditionType.StartsWith;

        await userManager.defaultUser.updateFilter("Update Filter Conditions offline worked", ctx, retrievedFilter, [], []);
        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsUpdateTest, ctx);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);
        filterCondition = retrievedFilter.dataType.c["1"];

        ctx.assertEquals("Filter Condition property isn't updated", filterCondition?.p, "l");

        filterCondition!.t = FilterConditionType.EndsWith;
        filterCondition!.v = "second";

        await userManager.defaultUser.updateFilter("Update Filter Conditions online worked", ctx, retrievedFilter, [], []);
        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsUpdateTest, ctx);

        const retrievedFilterAfterSyncing = app.currentVault.filterStore.passwordFiltersByID[filter.id];
        filterCondition = retrievedFilterAfterSyncing.c["1"];

        ctx.assertEquals("Merged filter condition property is d", filterCondition?.p, "d");
        ctx.assertEquals("Merged filter condition filterType is EndsWith", filterCondition?.t, FilterConditionType.EndsWith);
        ctx.assertEquals("Merged filter condition value is second", filterCondition?.v, "second");
    }
});

const mergingGroupUpdatesTest = "Merging Updated Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupUpdatesTest, func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.n = "MMerging Updated Group 1";

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.n = "Merging Updated Group 2";

        const groupThree = defaultGroup(DataType.NameValuePairs);
        groupThree.n = "Merging Updated Group 3";

        await userManager.defaultUser.addGroup("Add Group one succeeded", ctx, groupOne);
        await userManager.defaultUser.addGroup("Add Group two succeeded", ctx, groupTwo);
        await userManager.defaultUser.addGroup("Add Group three succeeded", ctx, groupThree);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedGroup = userManager.defaultUser.getEditableGroup(groupOne.id, DataType.Passwords);
        retrievedGroup.dataType.n = "first";

        await userManager.defaultUser.updateGroup("Update Offline Group 1 succeeded", ctx, retrievedGroup, {});

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupTwo.id, DataType.Passwords);
        retrievedGroup.dataType.n = "first";

        await userManager.defaultUser.updateGroup("Update Offline Group 2 succeeded", ctx, retrievedGroup, {});
        await copyDatabaseAndLogIntoOnlineMode(mergingGroupUpdatesTest, ctx);

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupTwo.id, DataType.Passwords);

        ctx.assertEquals("retrieved Group name isn't updated", retrievedGroup.dataType.n, "Merging Updated Group 2");

        retrievedGroup.dataType.n = "second";
        await userManager.defaultUser.updateGroup("Update Offline Group 2 succeeded", ctx, retrievedGroup, {});

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupThree.id, DataType.NameValuePairs);

        retrievedGroup.dataType.n = "second";
        await userManager.defaultUser.updateGroup("Update Offline Group 3 succeeded", ctx, retrievedGroup, {});

        await swapToSecondDatabaseAndLogIn(mergingGroupUpdatesTest, ctx);

        let retrievedGroupAfterSyncing = app.currentVault.groupStore.passwordGroupsByID[groupOne.id];
        ctx.assertEquals("merged Group one name is first", retrievedGroupAfterSyncing.n, "first");

        retrievedGroupAfterSyncing = app.currentVault.groupStore.passwordGroupsByID[groupTwo.id];
        ctx.assertEquals("merged Group two name is second", retrievedGroupAfterSyncing.n, "second");

        retrievedGroupAfterSyncing = app.currentVault.groupStore.valueGroupsByID[groupThree.id];
        ctx.assertEquals("merged Group three name is second", retrievedGroupAfterSyncing.n, "second");
    }
});

const mergingPasswordDeleteTest = "Merging Deleted Passwords Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordDeleteTest, func: async (ctx: TestContext) =>
    {
        const dupPasswordOne = defaultPassword();
        dupPasswordOne.l = "MMerging Delete Duplidate Password 1";
        dupPasswordOne.p = "Merging Delete Duplidate Password 1";

        const dupPasswordTwo = defaultPassword();
        dupPasswordTwo.l = "Merging Delete Duplicate password 2";
        dupPasswordTwo.p = "Merging Delete Duplidate Password 1";

        const dupPasswordThree = defaultPassword();
        dupPasswordThree.l = "MMerging Delete Duplidate Password 3";
        dupPasswordThree.p = "Merging Delete Duplidate Password 2";

        const dupPasswordFour = defaultPassword();
        dupPasswordFour.l = "Merging Delete Duplicate password 4";
        dupPasswordFour.p = "Merging Delete Duplidate Password 2";

        const dupPasswordFive = defaultPassword();
        dupPasswordFive.l = "MMerging Delete Duplidate Password 5";
        dupPasswordFive.p = "Merging Delete Duplidate Password 3";

        const dupPasswordSix = defaultPassword();
        dupPasswordSix.l = "Merging Delete Duplicate password 6";
        dupPasswordSix.p = "Merging Delete Duplidate Password 3";

        await userManager.defaultUser.addPassword("Add Dup Password one succeeded", ctx, dupPasswordOne);
        await userManager.defaultUser.addPassword("Add Dup Password two succeeded", ctx, dupPasswordTwo);
        await userManager.defaultUser.addPassword("Add Dup Password three succeeded", ctx, dupPasswordThree);
        await userManager.defaultUser.addPassword("Add Dup Password four succeeded", ctx, dupPasswordFour);
        await userManager.defaultUser.addPassword("Add Dup Password five succeeded", ctx, dupPasswordFive);
        await userManager.defaultUser.addPassword("Add Dup Password six succeeded", ctx, dupPasswordSix);

        ctx.assertTruthy("Dup password 1 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("Dup password 2 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);
        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordOne.id);
        await userManager.defaultUser.deletePassword("Delete Offline Password 1 succeeded", ctx, retrievedPassword.dataType);

        ctx.assertTruthy("Duplicate password one doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("Duplicate password two doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordTwo.id);
        retrievedPassword.dataType.d = "updated";

        await userManager.defaultUser.updatePassword("Update Offline Password 2 succeeded", ctx, retrievedPassword, false, [], [], [], [], {});

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordFive.id);
        await userManager.defaultUser.deletePassword("Delete Offline Password 5 succeeded", ctx, retrievedPassword.dataType);

        ctx.assertTruthy("Duplicate password 5 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Duplicate password 6 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordDeleteTest, ctx);

        ctx.assertTruthy("password 1 exists", app.currentVault.passwordStore.passwordsByID[dupPasswordOne.id]);
        ctx.assertTruthy("password 5 exists", app.currentVault.passwordStore.passwordsByID[dupPasswordFive.id]);

        ctx.assertTruthy("Dup password 1 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("Dup password 2 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);
        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordTwo.id);;
        await userManager.defaultUser.deletePassword("Delete Online Password 2 succeeded", ctx, retrievedPassword.dataType);

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordThree.id);;
        await userManager.defaultUser.deletePassword("Delete Online Password 3 succeeded", ctx, retrievedPassword.dataType);

        retrievedPassword = userManager.defaultUser.getEditablePassword(dupPasswordFive.id);;
        retrievedPassword.dataType.d = "test 2";

        await userManager.defaultUser.updatePassword("Update Online Password 5 succeeded", ctx, retrievedPassword, false, [], [], [], [], {});

        ctx.assertTruthy("Dup password 3 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("Dup password 4 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);

        await swapToSecondDatabaseAndLogIn(mergingPasswordDeleteTest, ctx);

        // was deleted offline
        ctx.assertTruthy("merged password one doesnt exist", !app.currentVault.passwordStore.passwordsByID[dupPasswordOne.id]);
        ctx.assertTruthy("merged duplicate password one doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordOne.id]);
        ctx.assertTruthy("merged duplicate password two doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordTwo.id]);

        // was deleted online
        ctx.assertTruthy("merged password 2 doesn't exists", !app.currentVault.passwordStore.passwordsByID[dupPasswordTwo.id]);
        ctx.assertTruthy("merged password three doesnt exist", !app.currentVault.passwordStore.passwordsByID[dupPasswordThree.id]);
        ctx.assertTruthy("merged duplicate password three doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordThree.id]);
        ctx.assertTruthy("merged duplicate password four doesnt exist", !app.currentVault.passwordStore.duplicatePasswords[dupPasswordFour.id]);

        // was edited online after it was deleted offline, it should still be there
        ctx.assertTruthy("merged password five exist", app.currentVault.passwordStore.passwordsByID[dupPasswordFive.id]);
        ctx.assertTruthy("merged duplicate password 5 exist", app.currentVault.passwordStore.duplicatePasswords[dupPasswordFive.id]);
        ctx.assertTruthy("merged duplicate password 6 exist", app.currentVault.passwordStore.duplicatePasswords[dupPasswordSix.id]);
    }
});

const mergingSecurityQuestionsDeleteTest = "Merging Deleted Security Questions Works";
mergingDataTestSuite.tests.push({
    name: mergingSecurityQuestionsDeleteTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.l = "Merging Deleted Security Questions Works";

        const securityQuesitonsOnes = [
        {
            id: "1",
            q: "zero",
            a: "zero",
        },
        {
            id: "2",
            q: "zero",
            a: "zero",
        },
        {
            id: "3",
            q: "zero",
            a: "zero",
        }];


        await userManager.defaultUser.addPassword("Add Password 1 succeeded", ctx, password, securityQuesitonsOnes);
        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        ctx.assertEquals("Password has 3 security questions", OH.size(retrievedPassword.dataType.q), 3);

        await userManager.defaultUser.updatePassword("Update Password 1 succeeded", ctx, retrievedPassword, false, [], [], [], ["1", "2"], {});
        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsDeleteTest, ctx);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password.id);
        ctx.assertEquals("Password has 3 security questions", OH.size(retrievedPassword.dataType.q), 3);

        retrievedPassword.dataType.q["2"].a = "updated";

        await userManager.defaultUser.updatePassword("Update Password 1 succeeded", ctx, retrievedPassword, false, [], [], [retrievedPassword.dataType.q["2"]], ["3"], {});
        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsDeleteTest, ctx);

        const retrievedPasswordAfterSyncing = app.currentVault.passwordStore.passwordsByID[password.id];

        ctx.assertTruthy("Merged Security Question one doesn't exist", !retrievedPasswordAfterSyncing.q["1"]);
        ctx.assertTruthy("Merged Security Question two does exist", retrievedPasswordAfterSyncing.q["2"]);
        ctx.assertTruthy("Merged Security Question three doesn't exist", !retrievedPasswordAfterSyncing.q["3"]);

        const securityQuestion = retrievedPasswordAfterSyncing.q["2"];
        const decryptedAnswer = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, securityQuestion.a);

        ctx.assertEquals("Merged Security Question answer is updated", decryptedAnswer.value, "updated");
    }
});

const mergingFilterGroupDeleteForPasswordTest = "Merging Deleted Filters / Groups for password Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupDeleteForPasswordTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.d = "Merging Deleted Filters / Groups for password Works";
        password.p = "Merging Deleted Filters / Groups for password Works";
        password.e = "Merging Deleted Filters / Groups for password Works";
        password.f = "Merging Deleted Filters / Groups for password Works";
        password.a = "Merging Deleted Filters / Groups for password Works";
        password.l = "Merging Deleted Filters / Groups for password Works";

        const filter = defaultFilter(DataType.Passwords);
        filter.n = "Merging Deleted Filters / Groups for password Works";
        filter.c["1"] = {
            id: "1",
            p: "d",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for password Works"
        };

        const filter2 = defaultFilter(DataType.Passwords);
        filter2.n = "Merging Deleted Filters / Groups for password Works";
        filter2.c["2"] = {
            id: "2",
            p: "d",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for password Works"
        };

        const filter3 = defaultFilter(DataType.Passwords);
        filter3.n = "Merging Deleted Filters / Groups for password Works";
        filter3.c["3"] = {
            id: "3",
            p: "d",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for password Works"
        };

        const filter4 = defaultFilter(DataType.Passwords);
        filter4.n = "Merging Deleted Filters / Groups for password Works";
        filter4.c["4"] = {
            id: "4",
            p: "d",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for password Works"
        };

        const group = defaultGroup(DataType.Passwords);
        group.n = "Merging Deleted Filters / Groups for password Works";

        const group2 = defaultGroup(DataType.Passwords);
        group2.n = "Merging Deleted Filters / Groups for password Works";

        const group3 = defaultGroup(DataType.Passwords);
        group3.n = "Merging Deleted Filters / Groups for password Works";

        const group4 = defaultGroup(DataType.Passwords);
        group4.n = "Merging Deleted Filters / Groups for password Works";

        await userManager.defaultUser.addFilter("Add Filter 1 succeeded", ctx, filter);
        await userManager.defaultUser.addFilter("Add Filter 2 succeeded", ctx, filter2);
        await userManager.defaultUser.addFilter("Add Filter 3 succeeded", ctx, filter3);
        await userManager.defaultUser.addFilter("Add Filter 4 succeeded", ctx, filter4);
        await userManager.defaultUser.addGroup("Add Group 1 succeeded", ctx, group);
        await userManager.defaultUser.addGroup("Add Group 2 succeeded", ctx, group2);
        await userManager.defaultUser.addGroup("Add Group 3 succeeded", ctx, group3);
        await userManager.defaultUser.addGroup("Add Group 4 succeeded", ctx, group4);

        password.g[group.id] = true;
        password.g[group2.id] = true;
        password.g[group3.id] = true;
        password.g[group4.id] = true;

        await userManager.defaultUser.addPassword("Add password succeeded", ctx, password);
        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);
        ctx.assertTruthy("offline password has filter 1", retrievedPassword.i[filter.id]);
        ctx.assertTruthy("offline password has filter 2", retrievedPassword.i[filter2.id]);
        ctx.assertTruthy("offline password has filter 3", retrievedPassword.i[filter3.id]);
        ctx.assertTruthy("offline password has filter 4", retrievedPassword.i[filter4.id]);

        ctx.assertTruthy("offline password has group 1", retrievedPassword.g[group.id]);
        ctx.assertTruthy("offline password has group 2", retrievedPassword.g[group2.id]);
        ctx.assertTruthy("offline password has group 3", retrievedPassword.g[group3.id]);
        ctx.assertTruthy("offline password has group 4", retrievedPassword.g[group4.id]);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete filter 1 succeeded", ctx, retrievedFilter.dataType);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter2.id, DataType.Passwords);
        retrievedFilter.dataType.n = "Updated";
        await userManager.defaultUser.updateFilter("Update filter 2 offline succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter3.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete filter 3 offline succeeded", ctx, retrievedFilter.dataType);

        let retrievedGroup = userManager.defaultUser.getEditableGroup(group.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete group 1 succeeded", ctx, retrievedGroup.dataType);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group2.id, DataType.Passwords);
        retrievedGroup.dataType.n = "Updated";
        await userManager.defaultUser.updateGroup("Update group 2 offline succeeded", ctx, retrievedGroup, retrievedGroup.dataType.p);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group3.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete group 3 offline succeeded", ctx, retrievedGroup.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        ctx.assertTruthy("offline password doesn't have filter 1", !retrievedPassword?.i[filter.id]);
        ctx.assertTruthy("offline password has filter 2", retrievedPassword?.i[filter2.id]);
        ctx.assertTruthy("offline password doesn't have filter 3", !retrievedPassword?.i[filter3.id]);
        ctx.assertTruthy("offline password has filter 4", retrievedPassword?.i[filter4.id]);

        ctx.assertTruthy("offline password doesn't have group 1", !retrievedPassword?.g[group.id]);
        ctx.assertTruthy("offline password has group 2", retrievedPassword?.g[group2.id]);
        ctx.assertTruthy("offline password doesn't have group 3", !retrievedPassword?.g[group3.id]);
        ctx.assertTruthy("offline password has group 4", retrievedPassword?.g[group4.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupDeleteForPasswordTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];
        ctx.assertTruthy("online password has filter 1", retrievedPassword?.i[filter.id]);
        ctx.assertTruthy("online password has filter 2", retrievedPassword?.i[filter2.id]);
        ctx.assertTruthy("online password has filter 3", retrievedPassword?.i[filter3.id]);
        ctx.assertTruthy("online password has filter 4", retrievedPassword?.i[filter4.id]);

        ctx.assertTruthy("online password has group 1", retrievedPassword?.g[group.id]);
        ctx.assertTruthy("online password has group 2", retrievedPassword?.g[group2.id]);
        ctx.assertTruthy("online password has group 3", retrievedPassword?.g[group3.id]);
        ctx.assertTruthy("online password has group 4", retrievedPassword?.g[group4.id]);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter2.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete filter 2 online succeeded", ctx, retrievedFilter.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter3.id, DataType.Passwords);
        retrievedFilter.dataType.n = "Updated";
        await userManager.defaultUser.updateFilter("Update filter 3 online succeeded", ctx, retrievedFilter, [], []);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter4.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete filter 4 online succeeded", ctx, retrievedFilter.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        retrievedGroup = userManager.defaultUser.getEditableGroup(group2.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete group 2 online succeeded", ctx, retrievedGroup.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        retrievedGroup = userManager.defaultUser.getEditableGroup(group3.id, DataType.Passwords);
        retrievedGroup.dataType.n = "Updated";
        await userManager.defaultUser.updateGroup("Update group 3 online succeeded", ctx, retrievedGroup, retrievedGroup.dataType.p);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        retrievedGroup = userManager.defaultUser.getEditableGroup(group4.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete group 4 online succeeded", ctx, retrievedGroup.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];

        ctx.assertTruthy("online password has filter 1", retrievedPassword?.i[filter.id]);
        ctx.assertTruthy("online password doesn't have filter 2", !retrievedPassword?.i[filter2.id]);
        ctx.assertTruthy("online password has filter 3", retrievedPassword?.i[filter3.id]);
        ctx.assertTruthy("online password doesn't have filter 4", !retrievedPassword?.i[filter4.id]);

        ctx.assertTruthy("online password has group 1", retrievedPassword?.g[group.id]);
        ctx.assertTruthy("online password doesn't have group 2", !retrievedPassword?.g[group2.id]);
        ctx.assertTruthy("online password has group 3", retrievedPassword?.g[group3.id]);
        ctx.assertTruthy("online password doesn't have group 4", !retrievedPassword?.g[group4.id]);

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupDeleteForPasswordTest, ctx);

        ctx.assertTruthy("Filter 1 doesn't exist", !app.currentVault.filterStore.passwordFiltersByID[filter.id]);
        ctx.assertTruthy("Filter 2 doesn't exist", !app.currentVault.filterStore.passwordFiltersByID[filter2.id]);
        ctx.assertTruthy("Filter 3 does exist", app.currentVault.filterStore.passwordFiltersByID[filter3.id]);
        ctx.assertTruthy("Filter 4 doesn't exist", !app.currentVault.filterStore.passwordFiltersByID[filter4.id]);

        ctx.assertTruthy("Group 1 doesn't exist", !app.currentVault.groupStore.passwordGroupsByID[group.id]);
        ctx.assertTruthy("Group 2 doesn't exist", !app.currentVault.groupStore.passwordGroupsByID[group2.id]);
        ctx.assertTruthy("Group 3 does exist", app.currentVault.groupStore.passwordGroupsByID[group3.id]);
        ctx.assertTruthy("Group 4 doesn't exist", !app.currentVault.groupStore.passwordGroupsByID[group4.id]);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID[password.id];
        ctx.assertTruthy("Password doesn't have filter 1", !retrievedPassword?.i[filter.id]);
        ctx.assertTruthy("Password doesn't have filter 2", !retrievedPassword?.i[filter2.id]);
        ctx.assertTruthy("Password does have filter 3", retrievedPassword?.i[filter3.id]);
        ctx.assertTruthy("Password doesn't have filter 4", !retrievedPassword?.i[filter4.id]);

        ctx.assertTruthy("Password doesn't have group 1", !retrievedPassword?.g[group.id]);
        ctx.assertTruthy("Password doesn't have group 2", !retrievedPassword?.g[group2.id]);
        ctx.assertTruthy("Password does has group 3", retrievedPassword?.g[group3.id]);
        ctx.assertTruthy("Password doesn't have group 4", !retrievedPassword?.g[group4.id]);
    }
});

const mergingFilterGroupDeleteForValueTest = "Merging Deleted Filters / Groups for value Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupDeleteForValueTest, func: async (ctx: TestContext) =>
    {
        await userManager.logUserIn(ctx, userManager.defaultUserID);

        const Value = defaultValue();
        Value.n = "Merging Deleted Filters / Groups for Value Works";

        const filter = defaultFilter(DataType.NameValuePairs);
        filter.n = "Merging Deleted Filters / Groups for Value Works";
        filter.c["1"] = {
            id: "1",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for Value Works"
        };

        const filter2 = defaultFilter(DataType.NameValuePairs);
        filter2.n = "Merging Deleted Filters / Groups for Value Works";
        filter2.c["2"] = {
            id: "2",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for Value Works"
        };

        const filter3 = defaultFilter(DataType.NameValuePairs);
        filter3.n = "Merging Deleted Filters / Groups for Value Works";
        filter3.c["3"] = {
            id: "3",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for Value Works"
        };

        const filter4 = defaultFilter(DataType.NameValuePairs);
        filter4.n = "Merging Deleted Filters / Groups for Value Works";
        filter4.c["4"] = {
            id: "4",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Filters / Groups for Value Works"
        };

        const group = defaultGroup(DataType.NameValuePairs);
        group.n = "Merging Added Group For Value";

        const group2 = defaultGroup(DataType.NameValuePairs);
        group2.n = "Merging Added Group For Value";

        const group3 = defaultGroup(DataType.NameValuePairs);
        group3.n = "Merging Added Group For Value";

        const group4 = defaultGroup(DataType.NameValuePairs);
        group4.n = "Merging Added Group For Value";

        await userManager.defaultUser.addFilter("Add Filter 1 succeeded", ctx, filter);
        await userManager.defaultUser.addFilter("Add Filter 2 succeeded", ctx, filter2);
        await userManager.defaultUser.addFilter("Add Filter 3 succeeded", ctx, filter3);
        await userManager.defaultUser.addFilter("Add Filter 4 succeeded", ctx, filter4);

        await userManager.defaultUser.addGroup("Add Group 1 succeeded", ctx, group);
        await userManager.defaultUser.addGroup("Add Group 2 succeeded", ctx, group2);
        await userManager.defaultUser.addGroup("Add Group 3 succeeded", ctx, group3);
        await userManager.defaultUser.addGroup("Add Group 4 succeeded", ctx, group4);

        Value.g[group.id] = true;
        Value.g[group2.id] = true;
        Value.g[group3.id] = true;
        Value.g[group4.id] = true;

        await userManager.defaultUser.addNameValuePair("Add Value succeeded", ctx, Value);
        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedValue = app.currentVault.valueStore.nameValuePairsByID[Value.id];
        ctx.assertTruthy("Retrieved Value exists", retrievedValue);
        ctx.assertEquals("offline Value has 4 groups", OH.size(retrievedValue?.g), 4);
        ctx.assertEquals("offline Value has 4 filters", OH.size(retrievedValue?.i), 4);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteFilter("Delete filter 1 succeeded", ctx, retrievedFilter.dataType);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter2.id, DataType.NameValuePairs);
        retrievedFilter.dataType.n = "Updated";
        await userManager.defaultUser.updateFilter("Update filter 2 offline succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter3.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteFilter("Delete filter 3 offline succeeded", ctx, retrievedFilter.dataType);

        let retrievedGroup = userManager.defaultUser.getEditableGroup(group.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteGroup("Delete group 1 succeeded", ctx, retrievedGroup.dataType);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group2.id, DataType.NameValuePairs);
        retrievedGroup.dataType.n = "Updated";
        await userManager.defaultUser.updateGroup("Update group 2 offline succeeded", ctx, retrievedGroup, retrievedGroup.dataType.v);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group3.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteGroup("Delete group 3 offline succeeded", ctx, retrievedGroup.dataType);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID[Value.id];
        ctx.assertEquals("Value only has 2 filters", OH.size(retrievedValue?.i), 2);
        ctx.assertEquals("Value only has 2 groups", OH.size(retrievedValue?.g), 2);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupDeleteForValueTest, ctx);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID[Value.id];
        ctx.assertEquals("online Value has 4 groups", OH.size(retrievedValue?.g), 4);
        ctx.assertEquals("onlilne Value has 4 filters", OH.size(retrievedValue?.i), 4);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter2.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteFilter("Delete filter 2 online succeeded", ctx, retrievedFilter.dataType);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter3.id, DataType.NameValuePairs);
        retrievedFilter.dataType.n = "Updated";
        await userManager.defaultUser.updateFilter("Update filter 3 online succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter4.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteFilter("Delete filter 4 online succeeded", ctx, retrievedFilter.dataType);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group2.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteGroup("Delete group 1 online succeeded", ctx, retrievedGroup.dataType);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group3.id, DataType.NameValuePairs);
        retrievedGroup.dataType.n = "Updated";
        await userManager.defaultUser.updateGroup("Update group 3 online succeeded", ctx, retrievedGroup, retrievedGroup.dataType.v);

        retrievedGroup = userManager.defaultUser.getEditableGroup(group4.id, DataType.NameValuePairs);
        await userManager.defaultUser.deleteGroup("Delete group 4 online succeeded", ctx, retrievedGroup.dataType);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID[Value.id];
        ctx.assertEquals("Value only has 2 filters", OH.size(retrievedValue?.i), 2);
        ctx.assertEquals("Value only has 2 groups", OH.size(retrievedValue?.g), 2);

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupDeleteForValueTest, ctx);

        ctx.assertTruthy("Filter 1 doesn't exist", !app.currentVault.filterStore.nameValuePairFiltersByID[filter.id]);
        ctx.assertTruthy("Filter 2 doesn't exist", !app.currentVault.filterStore.nameValuePairFiltersByID[filter2.id]);
        ctx.assertTruthy("Filter 3 does exist", app.currentVault.filterStore.nameValuePairFiltersByID[filter3.id]);
        ctx.assertTruthy("Filter 4 doesn't exist", !app.currentVault.filterStore.nameValuePairFiltersByID[filter4.id]);

        ctx.assertTruthy("Group 1 doesn't exist", !app.currentVault.groupStore.valueGroupsByID[group.id]);
        ctx.assertTruthy("Group 2 doesn't exist", !app.currentVault.groupStore.valueGroupsByID[group2.id]);
        ctx.assertTruthy("Group 3 does exist", app.currentVault.groupStore.valueGroupsByID[group3.id]);
        ctx.assertTruthy("Group 4 doesn't exist", !app.currentVault.groupStore.valueGroupsByID[group4.id]);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID[Value.id];
        ctx.assertTruthy("Value doesn't has filter 1", !retrievedValue?.i[filter.id]);
        ctx.assertTruthy("Value doesn't has filter 2", !retrievedValue?.i[filter2.id]);
        ctx.assertTruthy("Value does has filter 3", retrievedValue?.i[filter3.id]);
        ctx.assertTruthy("Value doesn't has filter 4", !retrievedValue?.i[filter4.id]);

        ctx.assertTruthy("Value doesn't has group 1", !retrievedValue?.g[group.id]);
        ctx.assertTruthy("Value doesn't has group 2", !retrievedValue?.g[group2.id]);
        ctx.assertTruthy("Value does has group 3", retrievedValue?.g[group3.id]);
        ctx.assertTruthy("Value doesn't has group 4", !retrievedValue?.g[group4.id]);
    }
});

const mergingValueDeleteTest = "Merging Deleted Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueDeleteTest, func: async (ctx: TestContext) =>
    {
        const dupValueOne = defaultValue();
        dupValueOne.n = "MMerging Delete Duplidate Value 1";
        dupValueOne.v = "Merging Delete Duplidate Value 1";

        const dupValueTwo = defaultValue();
        dupValueTwo.n = "Merging Delete Duplicate Value 2";
        dupValueTwo.v = "Merging Delete Duplidate Value 1";

        const dupValueThree = defaultValue();
        dupValueThree.n = "MMerging Delete Duplidate Value 3";
        dupValueThree.v = "Merging Delete Duplidate Value 2";

        const dupValueFour = defaultValue();
        dupValueFour.n = "Merging Delete Duplicate Value 4";
        dupValueFour.v = "Merging Delete Duplidate Value 2";

        const dupValueFive = defaultValue();
        dupValueFive.n = "MMerging Delete Duplidate Value 5";
        dupValueFive.v = "Merging Delete Duplidate Value 3";

        const dupValueSix = defaultValue();
        dupValueSix.n = "Merging Delete Duplicate Value 6";
        dupValueSix.v = "Merging Delete Duplidate Value 3";

        await userManager.defaultUser.addNameValuePair("Add Dup Value one succeeded", ctx, dupValueOne);
        await userManager.defaultUser.addNameValuePair("Add Dup Value two succeeded", ctx, dupValueTwo);
        await userManager.defaultUser.addNameValuePair("Add Dup Value three succeeded", ctx, dupValueThree);
        await userManager.defaultUser.addNameValuePair("Add Dup Value four succeeded", ctx, dupValueFour);
        await userManager.defaultUser.addNameValuePair("Add Dup Value five succeeded", ctx, dupValueFive);
        await userManager.defaultUser.addNameValuePair("Add Dup Value six succeeded", ctx, dupValueSix);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueOne.id);

        await userManager.defaultUser.deleteNameValuePair("Delete Offline Value 1 succeeded", ctx, retrievedValue.dataType);

        ctx.assertTruthy("Duplicate Value one doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("Duplicate Value two doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueTwo.id);
        retrievedValue.dataType.n = "updated";

        await userManager.defaultUser.updateNameValuePair("Update online Value 2 succeeded", ctx, retrievedValue, false, {});

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueFive.id);

        await userManager.defaultUser.deleteNameValuePair("Delete Offline Value 5 succeeded", ctx, retrievedValue.dataType);

        ctx.assertTruthy("Duplicate Value 5 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Duplicate Value 6 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueDeleteTest, ctx);

        ctx.assertTruthy("Value 1 exists", app.currentVault.valueStore.nameValuePairsByID[dupValueOne.id]);
        ctx.assertTruthy("Value 5 exists", app.currentVault.valueStore.nameValuePairsByID[dupValueFive.id]);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueTwo.id);
        await userManager.defaultUser.deleteNameValuePair("Delete online Value 2 succeeded", ctx, retrievedValue.dataType);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueThree.id);
        await userManager.defaultUser.deleteNameValuePair("Delete online Value 3 succeeded", ctx, retrievedValue.dataType);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(dupValueFive.id);
        retrievedValue.dataType.n = "test 2";
        await userManager.defaultUser.updateNameValuePair("Update online Value 5 succeeded", ctx, retrievedValue, false, {});

        ctx.assertTruthy("Dup Value 3 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("Dup Value 4 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);

        await swapToSecondDatabaseAndLogIn(mergingValueDeleteTest, ctx);

        // was deleted offline
        ctx.assertTruthy("merged Value one doesnt exist", !app.currentVault.valueStore.nameValuePairsByID[dupValueOne.id]);
        ctx.assertTruthy("merged duplicate Value one doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueOne.id]);
        ctx.assertTruthy("merged duplicate Value two doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueTwo.id]);

        // was deleted online
        ctx.assertTruthy("merged Value three doesnt exist", !app.currentVault.valueStore.nameValuePairsByID[dupValueThree.id]);
        ctx.assertTruthy("merged duplicate Value three doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueThree.id]);
        ctx.assertTruthy("merged duplicate Value four doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs[dupValueFour.id]);

        // was edited online after it was deleted offline, it should still be there
        ctx.assertTruthy("merged Value five exist", app.currentVault.valueStore.nameValuePairsByID[dupValueFive.id]);
        ctx.assertTruthy("merged duplicate Value 5 exist", app.currentVault.valueStore.duplicateNameValuePairs[dupValueFive.id]);
        ctx.assertTruthy("merged duplicate Value 6 exist", app.currentVault.valueStore.duplicateNameValuePairs[dupValueSix.id]);
    }
});

const mergingFilterDeleteTest = "Merging Deleted Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterDeleteTest, func: async (ctx: TestContext) =>
    {
        const filterOne = defaultFilter(DataType.Passwords);
        filterOne.n = "MMerging Updated Filter 1";

        const filterTwo = defaultFilter(DataType.Passwords);
        filterTwo.n = "Merging Updated Filter 2";

        const filterThree = defaultFilter(DataType.Passwords);
        filterThree.n = "Merging Updated Filter 3";

        const filterFour = defaultFilter(DataType.Passwords);
        filterFour.n = "Merging Updated Filter 4";

        await userManager.defaultUser.addFilter("Add Filter one succeeded", ctx, filterOne);
        await userManager.defaultUser.addFilter("Add Filter two succeeded", ctx, filterTwo);
        await userManager.defaultUser.addFilter("Add Filter three succeeded", ctx, filterThree);
        await userManager.defaultUser.addFilter("Add Filter four succeeded", ctx, filterFour);

        ctx.assertTruthy("Filter 1 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterOne.id]);
        ctx.assertTruthy("Filter 2 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterTwo.id]);
        ctx.assertTruthy("Filter 3 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterThree.id]);
        ctx.assertTruthy("Filter 4 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterFour.id]);

        ctx.assertTruthy("Filter 1 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterOne.id]);
        ctx.assertTruthy("Filter 2 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterTwo.id]);
        ctx.assertTruthy("Filter 3 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterThree.id]);
        ctx.assertTruthy("Filter 4 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterFour.id]);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filterOne.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete Offline Filter 1 succeeded", ctx, retrievedFilter.dataType);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterTwo.id, DataType.Passwords);
        retrievedFilter.dataType.n = "updated";
        await userManager.defaultUser.updateFilter("Update Offline Filter 2 succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterThree.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete Offline Filter 3 succeeded", ctx, retrievedFilter.dataType);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterDeleteTest, ctx);

        ctx.assertTruthy("Filter 1 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterOne.id]);
        ctx.assertTruthy("Filter 2 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterTwo.id]);
        ctx.assertTruthy("Filter 3 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterThree.id]);
        ctx.assertTruthy("Filter 4 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters[filterFour.id]);

        ctx.assertTruthy("Filter 1 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterOne.id]);
        ctx.assertTruthy("Filter 2 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterTwo.id]);
        ctx.assertTruthy("Filter 3 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterThree.id]);
        ctx.assertTruthy("Filter 4 is empty", app.currentVault.filterStore.emptyPasswordFilters[filterFour.id]);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterTwo.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete online Filter 2 succeeded", ctx, retrievedFilter.dataType);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterThree.id, DataType.Passwords);
        retrievedFilter.dataType.n = "updated";
        await userManager.defaultUser.updateFilter("updated online Filter 3 succeeded", ctx, retrievedFilter, [], []);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filterFour.id, DataType.Passwords);
        await userManager.defaultUser.deleteFilter("Delete online Filter 4 succeeded", ctx, retrievedFilter.dataType);

        await swapToSecondDatabaseAndLogIn(mergingFilterDeleteTest, ctx);

        ctx.assertTruthy("merged Filter one doesn't exist", !app.currentVault.filterStore.passwordFiltersByID[filterOne.id]);
        ctx.assertTruthy("merged Filter two doesn't exist", !app.currentVault.filterStore.passwordFiltersByID[filterTwo.id]);
        ctx.assertTruthy("merged Filter three does exist", app.currentVault.filterStore.passwordFiltersByID[filterThree.id]);
        ctx.assertTruthy("merged Filter four doesn't exist", !app.currentVault.filterStore.passwordFiltersByID[filterFour.id]);
    }
});

const mergingFilterConditionsDeleteTest = "Merging Deleted Filter Conditions Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterConditionsDeleteTest, func: async (ctx: TestContext) =>
    {
        const filter = defaultFilter(DataType.Passwords);
        filter.n = "Merging Filter Conditions";
        filter.c["1"] = {
            id: "1",
            p: "l",
            t: FilterConditionType.Contains,
            v: "0"
        };

        filter.c["2"] = {
            id: "2",
            p: "l",
            t: FilterConditionType.Contains,
            v: "0"
        };

        filter.c["3"] = {
            id: "3",
            p: "l",
            t: FilterConditionType.Contains,
            v: "0"
        };

        filter.c["4"] = {
            id: "4",
            p: "l",
            t: FilterConditionType.Contains,
            v: "0"
        };

        await userManager.defaultUser.addFilter("Add filter succeeded", ctx, filter);
        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);

        let filterCondition = retrievedFilter.dataType.c["2"];
        filterCondition!.v = "updated";

        await userManager.defaultUser.updateFilter("Update filter condition offline worked", ctx, retrievedFilter, [], ["1", "3"]);
        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsDeleteTest, ctx);

        retrievedFilter = userManager.defaultUser.getEditableFilter(filter.id, DataType.Passwords);

        filterCondition = retrievedFilter.dataType.c["3"];
        filterCondition!.v = "updated";

        await userManager.defaultUser.updateFilter("Update filter condition offline worked", ctx, retrievedFilter, [], ["2", "4"]);
        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsDeleteTest, ctx);

        let retrievedFilterAferSyncing = app.currentVault.filterStore.passwordFiltersByID[filter.id];

        ctx.assertTruthy("Merged Filter condition doesn't have id 1", !retrievedFilterAferSyncing.c["1"]);
        ctx.assertTruthy("Merged Filter condition doesn't have id 2", !retrievedFilterAferSyncing.c["2"]);
        ctx.assertTruthy("Merged Filter condition does have id 3", retrievedFilterAferSyncing.c["3"]);
        ctx.assertTruthy("Merged Filter condition doesn't have id 4", !retrievedFilterAferSyncing.c["4"]);
    }
});

const mergingGroupDeleteTest = "Merging Deleted Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupDeleteTest, func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.n = "MMerging Updated Group 1";

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.n = "Merging Updated Group 2";

        const groupThree = defaultGroup(DataType.Passwords);
        groupThree.n = "Merging Updated Group 3";

        const groupFour = defaultGroup(DataType.Passwords);
        groupFour.n = "Merging Updated Group 4";

        await userManager.defaultUser.addGroup("Add Group one succeeded", ctx, groupOne);
        await userManager.defaultUser.addGroup("Add Group two succeeded", ctx, groupTwo);
        await userManager.defaultUser.addGroup("Add Group three succeeded", ctx, groupThree);
        await userManager.defaultUser.addGroup("Add Group four succeeded", ctx, groupFour);

        ctx.assertTruthy("Group 1 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupOne.id]);
        ctx.assertTruthy("Group 2 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupTwo.id]);
        ctx.assertTruthy("Group 3 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupThree.id]);
        ctx.assertTruthy("Group 4 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupFour.id]);

        ctx.assertTruthy("Group 1 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupOne.id]);
        ctx.assertTruthy("Group 2 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupTwo.id]);
        ctx.assertTruthy("Group 3 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupThree.id]);
        ctx.assertTruthy("Group 4 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupFour.id]);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedGroup = userManager.defaultUser.getEditableGroup(groupOne.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete Offline Group 1 succeeded", ctx, retrievedGroup.dataType);

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupTwo.id, DataType.Passwords);
        retrievedGroup.dataType.n = "updated";
        await userManager.defaultUser.updateGroup("Update Offline Group 2 succeeded", ctx, retrievedGroup, retrievedGroup.dataType.p);

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupThree.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete Offline Group 3 succeeded", ctx, retrievedGroup.dataType);

        await copyDatabaseAndLogIntoOnlineMode(mergingGroupDeleteTest, ctx);

        ctx.assertTruthy("Group 1 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupOne.id]);
        ctx.assertTruthy("Group 2 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupTwo.id]);
        ctx.assertTruthy("Group 3 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupThree.id]);
        ctx.assertTruthy("Group 4 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups[groupFour.id]);

        ctx.assertTruthy("Group 1 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupOne.id]);
        ctx.assertTruthy("Group 2 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupTwo.id]);
        ctx.assertTruthy("Group 3 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupThree.id]);
        ctx.assertTruthy("Group 4 is empty", app.currentVault.groupStore.emptyPasswordGroups[groupFour.id]);

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupTwo.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete online Group 2 succeeded", ctx, retrievedGroup.dataType);

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupThree.id, DataType.Passwords);
        retrievedGroup.dataType.n = "updated";
        await userManager.defaultUser.updateGroup("updated online Group 3 succeeded", ctx, retrievedGroup, retrievedGroup.dataType.p);

        retrievedGroup = userManager.defaultUser.getEditableGroup(groupFour.id, DataType.Passwords);
        await userManager.defaultUser.deleteGroup("Delete online Group 4 succeeded", ctx, retrievedGroup.dataType);

        await swapToSecondDatabaseAndLogIn(mergingGroupDeleteTest, ctx);

        ctx.assertTruthy("merged Group one doesn't exist", !app.currentVault.groupStore.passwordGroupsByID[groupOne.id]);
        ctx.assertTruthy("merged Group two doesn't exist", !app.currentVault.groupStore.passwordGroupsByID[groupTwo.id]);
        ctx.assertTruthy("merged Group three does exist", app.currentVault.groupStore.passwordGroupsByID[groupThree.id]);
        ctx.assertTruthy("merged Group four doesn't exist", !app.currentVault.groupStore.passwordGroupsByID[groupFour.id]);
    }
});

const mergingPasswordDeletesForGroupFilterTest = "Merging Deleted Password for Filters / Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordDeletesForGroupFilterTest, func: async (ctx: TestContext) =>
    {
        const group = defaultGroup(DataType.Passwords);
        group.n = "Merging Deleted Password for Filters / Groups Works";

        const filter = defaultFilter(DataType.Passwords);
        filter.c["1"] = {
            id: "1",
            p: "d",
            t: FilterConditionType.Contains,
            v: "Merging Deleted Password for Filters / Groups Works"
        };

        await userManager.defaultUser.addGroup("Add Group succeeded", ctx, group);
        await userManager.defaultUser.addFilter("Add Filter succeeded", ctx, filter);

        const password1 = defaultPassword();
        password1.p = "1";
        password1.d = "Merging Deleted Password for Filters / Groups Works";
        password1.g[group.id] = true;

        const password2 = defaultPassword();
        password2.p = "2";
        password2.d = "Merging Deleted Password for Filters / Groups Works";
        password2.g[group.id] = true;

        const password3 = defaultPassword();
        password3.p = "3";
        password3.d = "Merging Deleted Password for Filters / Groups Works";
        password3.g[group.id] = true;

        const password4 = defaultPassword();
        password4.p = "4";
        password4.d = "Merging Deleted Password for Filters / Groups Works";
        password4.g[group.id] = true;

        await userManager.defaultUser.addPassword("Add Password 1 succeeded", ctx, password1);
        await userManager.defaultUser.addPassword("Add Password 2 succeeded", ctx, password2);
        await userManager.defaultUser.addPassword("Add Password 3 succeeded", ctx, password3);
        await userManager.defaultUser.addPassword("Add Password 4 succeeded", ctx, password4);

        ctx.assertEquals("StartGroup has 4 passwords", OH.size(app.currentVault.groupStore.passwordGroupsByID[group.id].p), 4);
        ctx.assertEquals("Start Filter has 4 passwords", OH.size(app.currentVault.filterStore.passwordFiltersByID[filter.id].p), 4);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedPassword = userManager.defaultUser.getEditablePassword(password1.id);
        await userManager.defaultUser.deletePassword("Offline Delete password 1 succeeded", ctx, retrievedPassword.dataType);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password2.id);        
        retrievedPassword.dataType.l = "Updated Merging Deleted Password for Filters / Groups Works 2";
        await userManager.defaultUser.updatePassword("Offline Updated password 2 succeeded", ctx, retrievedPassword, false, [], [], [], [], {});

        retrievedPassword = userManager.defaultUser.getEditablePassword(password3.id);        
        await userManager.defaultUser.deletePassword("Offline Delete password 3 succeeded", ctx, retrievedPassword.dataType);

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordDeletesForGroupFilterTest, ctx);

        ctx.assertEquals("Online Group has 4 passwords", OH.size(app.currentVault.groupStore.passwordGroupsByID[group.id].p), 4);
        ctx.assertEquals("Online Filter has 4 passwords", OH.size(app.currentVault.filterStore.passwordFiltersByID[filter.id].p), 4);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password2.id);        
        await userManager.defaultUser.deletePassword("Online deleted password 2 succeeded", ctx, retrievedPassword.dataType);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password3.id);        
        retrievedPassword.dataType.l = "Updated Merging Deleted Password for Filters / Groups Works 3";
        await userManager.defaultUser.updatePassword("Online Updated password 3 succeeded", ctx, retrievedPassword, false, [], [], [], [], password3.g);

        retrievedPassword = userManager.defaultUser.getEditablePassword(password4.id);        
        await userManager.defaultUser.deletePassword("Online deleted password 4 succeeded", ctx, retrievedPassword.dataType);

        await swapToSecondDatabaseAndLogIn(mergingPasswordDeletesForGroupFilterTest, ctx);

        ctx.assertTruthy("Password 1 doesn't exist", !app.currentVault.passwordStore.passwordsByID[password1.id]);
        ctx.assertTruthy("Password 2 doesn't exist", !app.currentVault.passwordStore.passwordsByID[password2.id]);
        ctx.assertTruthy("Password 3 does exist", app.currentVault.passwordStore.passwordsByID[password3.id]);
        ctx.assertTruthy("Password 4 doesn't exist", !app.currentVault.passwordStore.passwordsByID[password4.id]);

        ctx.assertTruthy("Group doesn't have password 1", !app.currentVault.groupStore.passwordGroupsByID[group.id].p[password1.id]);
        ctx.assertTruthy("Group doesn't have password 2", !app.currentVault.groupStore.passwordGroupsByID[group.id].p[password2.id]);
        ctx.assertTruthy("Group has password 3", app.currentVault.groupStore.passwordGroupsByID[group.id].p[password3.id]);
        ctx.assertTruthy("Group doesn't have password 4", !app.currentVault.groupStore.passwordGroupsByID[group.id].p[password4.id]);

        ctx.assertTruthy("Filter doesn't have password 1", !app.currentVault.filterStore.passwordFiltersByID[filter.id].p[password1.id]);
        ctx.assertTruthy("Filter doesn't have password 2", !app.currentVault.filterStore.passwordFiltersByID[filter.id].p[password2.id]);
        ctx.assertTruthy("Filter has password 3", app.currentVault.filterStore.passwordFiltersByID[filter.id].p[password3.id]);
        ctx.assertTruthy("Filter doesn't have password 4", !app.currentVault.filterStore.passwordFiltersByID[filter.id].p[password4.id]);
    }
});

const mergingValueDeletesForGroupFilterTest = "Merging Deleted Values for Filters / Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingValueDeletesForGroupFilterTest, func: async (ctx: TestContext) =>
    {
        const group = defaultGroup(DataType.NameValuePairs);
        group.n = "Merging Deleted Values for Filters / Groups Works";

        const filter = defaultFilter(DataType.NameValuePairs);
        filter.c["1"] = {
            id: "1",
            p: "n",
            t: FilterConditionType.EqualTo,
            v: "Merging Deleted Values for Filters / Groups Works"
        };

        await userManager.defaultUser.addGroup("Add Group succeeded", ctx, group);
        await userManager.defaultUser.addFilter("Add Filter succeeded", ctx, filter);

        const value1 = defaultValue();
        value1.v = "1";
        value1.n = "Merging Deleted Values for Filters / Groups Works";
        value1.g[group.id] = true;

        const value2 = defaultValue();
        value2.v = "2";
        value2.n = "Merging Deleted Values for Filters / Groups Works";
        value2.g[group.id] = true;

        const value3 = defaultValue();
        value3.v = "3";
        value3.n = "Merging Deleted Values for Filters / Groups Works";
        value3.g[group.id] = true;

        const value4 = defaultValue();
        value4.v = "4";
        value4.n = "Merging Deleted Values for Filters / Groups Works";
        value4.g[group.id] = true;

        await userManager.defaultUser.addNameValuePair("Add Value 1 succeeded", ctx, value1);
        await userManager.defaultUser.addNameValuePair("Add Value 2 succeeded", ctx, value2);
        await userManager.defaultUser.addNameValuePair("Add Value 3 succeeded", ctx, value3);
        await userManager.defaultUser.addNameValuePair("Add Value 4 succeeded", ctx, value4);

        ctx.assertEquals("Group has 4 values", OH.size(app.currentVault.groupStore.valueGroupsByID[group.id].v), 4);
        ctx.assertEquals("Filter has 4 values", OH.size(app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v), 4);

        await userManager.logUserInOffline(ctx, userManager.defaultUserID);

        let retrievedValue = userManager.defaultUser.getEditableNameValuePair(value1.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Value 1 succeeded", ctx, retrievedValue.dataType);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value2.id);
        retrievedValue.dataType.y = NameValuePairType.Passcode;
        await userManager.defaultUser.updateNameValuePair("Updated Value 2 succeeded", ctx, retrievedValue, false, value2.g);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value3.id);
        await userManager.defaultUser.deleteNameValuePair("Delete Value 3 succeeded", ctx, retrievedValue.dataType);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueDeletesForGroupFilterTest, ctx);

        ctx.assertEquals("Group has 4 values", OH.size(app.currentVault.groupStore.valueGroupsByID[group.id].v), 4);
        ctx.assertEquals("Filter has 4 values", OH.size(app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v), 4);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value2.id);
        await userManager.defaultUser.deleteNameValuePair("deleted Value 2 succeeded", ctx, retrievedValue.dataType);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value3.id);
        retrievedValue.dataType.y = NameValuePairType.Information;
        await userManager.defaultUser.updateNameValuePair("Updated Value 3 succeeded", ctx, retrievedValue, false, value3.g);

        retrievedValue = userManager.defaultUser.getEditableNameValuePair(value4.id);
        await userManager.defaultUser.deleteNameValuePair("deleted Value 4 succeeded", ctx, retrievedValue.dataType);

        await swapToSecondDatabaseAndLogIn(mergingValueDeletesForGroupFilterTest, ctx);

        ctx.assertTruthy("Value 1 doesn't exist", !app.currentVault.valueStore.nameValuePairsByID[value1.id]);
        ctx.assertTruthy("Value 2 doesn't exist", !app.currentVault.valueStore.nameValuePairsByID[value2.id]);
        ctx.assertTruthy("Value 3 does exist", app.currentVault.valueStore.nameValuePairsByID[value3.id]);
        ctx.assertTruthy("Value 4 doesn't exist", !app.currentVault.valueStore.nameValuePairsByID[value4.id]);

        ctx.assertTruthy("Group doesn't have Value 1", !app.currentVault.groupStore.valueGroupsByID[group.id].v[value1.id]);
        ctx.assertTruthy("Group doesn't have Value 2", !app.currentVault.groupStore.valueGroupsByID[group.id].v[value2.id]);
        ctx.assertTruthy("Group has Value 3", app.currentVault.groupStore.valueGroupsByID[group.id].v[value3.id]);
        ctx.assertTruthy("Group doesn't have Value 4", !app.currentVault.groupStore.valueGroupsByID[group.id].v[value4.id]);

        ctx.assertTruthy("Filter doesn't have Value 1", !app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v[value1.id]);
        ctx.assertTruthy("Filter doesn't have Value 2", !app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v[value2.id]);
        ctx.assertTruthy("Filter has Value 3", app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v[value3.id]);
        ctx.assertTruthy("Filter doesn't have Value 4", !app.currentVault.filterStore.nameValuePairFiltersByID[filter.id].v[value4.id]);
    }
});

// TODO: add tests for vaultStore -> loginHistory, appStore -> colorPalettes, userPreferencesStore -> pinnedDataTypes etc
// complex objects




mergingDataTestSuite.tests.push({
    name: "Log out and log back in works after all merging tests", func: async (ctx: TestContext) =>
    {
        await userManager.logCurrentUserOut();
        const logInResponse = await userManager.logUserIn(ctx, userManager.defaultUserID!);
        ctx.assertTruthy("Log in succeeded", logInResponse);
    }
});

mergingDataTestSuite.tests.push({
    name: "Delete local database all log back in works after all merging tests", func: async (ctx: TestContext) =>
    {
        await userManager.logCurrentUserOut();
        const recreateDatabase = await api.environment.recreateDatabase();
        ctx.assertTruthy("Recreate database succeeded", recreateDatabase);

        const logInResponse = await userManager.logUserIn(ctx, userManager.defaultUserID!);
        ctx.assertTruthy("Log in succeeded", logInResponse);
    }
});


export default mergingDataTestSuite;