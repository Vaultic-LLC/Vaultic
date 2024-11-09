import { DataType, defaultFilter, defaultGroup, defaultPassword, defaultValue, FilterConditionType, NameValuePairType, Password } from "../../src/core/Types/DataTypes";
import { api } from "../../src/core/API";
import app from "../../src/core/Objects/Stores/AppStore";
import { createTestSuite, TestContext } from "../test";
import { Field } from "@vaultic/shared/Types/Fields";

let mergingDataTestSuite = createTestSuite("Merging Data");

const masterKey = "test";
const email = "test@gmail.com";

async function logIntoOfflineMode(forTest: string, ctx: TestContext)
{
    await app.lock();

    const resposne = await api.repositories.users.setCurrentUser(masterKey, email);
    ctx.assertTruthy("Set Current user worked for " + forTest, resposne.success)

    let loadUserResponse = await app.loadUserData(masterKey);
    ctx.assertTruthy("Load user data worked for " + forTest, loadUserResponse);
}

async function copyDatabaseAndLogIntoOnlineMode(forTest: string, ctx: TestContext)
{
    //@ts-ignore
    const createResponse = await api.environment.createNewDatabase("vaultic2");

    await app.lock();
    let logInResponse = await api.helpers.server.logUserIn(masterKey, email, false, true);
    ctx.assertTruthy("Log in worked for " + forTest, logInResponse.success);

    app.isOnline = true;

    const loadUserResponse = await app.loadUserData(masterKey, logInResponse.value?.userDataPayload);
    ctx.assertTruthy("Load user data worked 2 for" + forTest, loadUserResponse);
}

async function swapToSecondDatabaseAndLogIn(forTest: string, ctx: TestContext)
{
    await app.lock();

    // @ts-ignore
    const setAsCurrentResponse = await api.environment.setDatabaseAsCurrent("vaultic2");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const logInResponse = await api.helpers.server.logUserIn(masterKey, email, false, false);
    ctx.assertTruthy("Log in two worked for " + forTest, logInResponse.success);

    app.isOnline = true;

    const loadUserResponse = await app.loadUserData(masterKey, logInResponse.value?.userDataPayload);
    ctx.assertTruthy("Load user data worked 3 for " + forTest, loadUserResponse);
}

const mergingPasswordAddTest = "Merging Added Passwords Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordAddTest, func: async (ctx: TestContext) =>
    {
        await logIntoOfflineMode(mergingPasswordAddTest, ctx);

        const offlineDupPasswordOne = defaultPassword();
        offlineDupPasswordOne.login.value = "Merging Offline Dup Password 1";
        offlineDupPasswordOne.password.value = "One";

        const offlineDupPasswordTwo = defaultPassword();
        offlineDupPasswordTwo.login.value = "Merging Offline Dup Password 2";
        offlineDupPasswordTwo.password.value = "One";

        const offlineSafePasswordOne = defaultPassword();
        offlineSafePasswordOne.login.value = "Merging Offline Safe Password 1";
        offlineSafePasswordOne.password.value = "Svoweijiio3282uGsido-==DSF]12:JIOvj";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, offlineDupPasswordOne);
        ctx.assertTruthy("Add Offline Dup Password 1 succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, offlineDupPasswordTwo);
        ctx.assertTruthy("Add Offline Dup Password 2 succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, offlineSafePasswordOne);
        ctx.assertTruthy("Add Offline Safe Password 1 succeeded", addPasswordSucceeded);

        ctx.assertTruthy("Offline dup password one exists in duplicates", app.currentVault.passwordStore.duplicatePasswords.value.get(offlineDupPasswordOne.id.value));
        ctx.assertTruthy("Offline dup password two exists in duplicates", app.currentVault.passwordStore.duplicatePasswords.value.get(offlineDupPasswordTwo.id.value));
        ctx.assertEquals("Offline safe password one exists", app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1], 1);

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordAddTest, ctx);

        ctx.assertUndefined("Merged Offline Dup Password one does not exist", app.currentVault.passwordStore.passwordsByID.value.get(offlineDupPasswordOne.id.value));
        ctx.assertUndefined("Merged Offline Dup Password two does not exist", app.currentVault.passwordStore.passwordsByID.value.get(offlineDupPasswordTwo.id.value));
        ctx.assertUndefined("Merged Offline Safe Password one does not exist", app.currentVault.passwordStore.passwordsByID.value.get(offlineSafePasswordOne.id.value));

        ctx.assertEquals("No duplicate passwords", app.currentVault.passwordStore.duplicatePasswords.value.size, 0);
        ctx.assertEquals("No safe passwords", app.currentVault.passwordStore.currentAndSafePasswordsSafe.length, 0);

        const onlineDupPasswordOne = defaultPassword();
        onlineDupPasswordOne.login.value = "Merging Online Dup Password 1";
        onlineDupPasswordOne.password.value = "Two";

        const onlineDupPasswordTwo = defaultPassword();
        onlineDupPasswordTwo.login.value = "Merging Online Dup Password 2";
        onlineDupPasswordTwo.password.value = "Two";

        const onlineSafePasswordOne = defaultPassword();
        onlineSafePasswordOne.login.value = "Merging online Safe Password 1";
        onlineSafePasswordOne.password.value = "Svoweijiio3282uGsido-==DSF]12:JIOvj";

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, onlineDupPasswordOne);
        ctx.assertTruthy("Add Online Dup Password 1 succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, onlineDupPasswordTwo);
        ctx.assertTruthy("Add Online Dup Password 2 succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, onlineSafePasswordOne);
        ctx.assertTruthy("Add Online Safe Password 1 succeeded", addPasswordSucceeded);

        ctx.assertTruthy("Online dup password one exists in duplicates", app.currentVault.passwordStore.duplicatePasswords.value.get(onlineDupPasswordOne.id.value));
        ctx.assertTruthy("Online dup password two exists in duplicates", app.currentVault.passwordStore.duplicatePasswords.value.get(onlineDupPasswordTwo.id.value));
        ctx.assertEquals("Online safe password one exists", app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1], 1);

        await swapToSecondDatabaseAndLogIn(mergingPasswordAddTest, ctx);

        ctx.assertTruthy("Merged Offline duplicate Password one exists after merge", app.currentVault.passwordStore.passwordsByID.value.get(offlineDupPasswordOne.id.value));
        ctx.assertTruthy("Merged Offline duplicate Password two exists after merge", app.currentVault.passwordStore.passwordsByID.value.get(offlineDupPasswordTwo.id.value));

        ctx.assertTruthy("Merged online duplicate Password one exists after merge", app.currentVault.passwordStore.passwordsByID.value.get(onlineDupPasswordOne.id.value));
        ctx.assertTruthy("Merged online duplicate Password one exists after merge", app.currentVault.passwordStore.passwordsByID.value.get(onlineDupPasswordTwo.id.value));

        ctx.assertTruthy("Merged offline safe Password one exists after merge", app.currentVault.passwordStore.passwordsByID.value.get(offlineSafePasswordOne.id.value));
        ctx.assertTruthy("Merged online safe Password one exists after merge", app.currentVault.passwordStore.passwordsByID.value.get(onlineSafePasswordOne.id.value));

        ctx.assertTruthy("Merged Offline duplicate Password one exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords.value.get(offlineDupPasswordOne.id.value));
        ctx.assertTruthy("Merged Offline duplicate Password two exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords.value.get(offlineDupPasswordTwo.id.value));

        ctx.assertTruthy("Merged online duplicate Password one exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords.value.get(onlineDupPasswordOne.id.value));
        ctx.assertTruthy("Merged online duplicate Password two exists in duplicates after merge", app.currentVault.passwordStore.duplicatePasswords.value.get(onlineDupPasswordTwo.id.value));

        ctx.assertEquals("Safe passwords has 6 values", app.currentVault.passwordStore.currentAndSafePasswordsSafe.length, 6);
        ctx.assertEquals("Current passwords has 6 values", app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length, 6);
    }
});

const mergingSecurityQuestionsAddTest = "Merging Added Security Questions Works";
mergingDataTestSuite.tests.push({
    name: mergingSecurityQuestionsAddTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.login.value = "Merging Security Questions";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password 1 succeeded", addPasswordSucceeded);

        await logIntoOfflineMode(mergingSecurityQuestionsAddTest, ctx);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);

        retrievedPassword!.value.securityQuestions.value.set("1", new Field({
            id: new Field("1"),
            question: new Field("First"),
            questionLength: new Field(0),
            answer: new Field("yes"),
            answerLength: new Field(0)
        }));

        const addOffline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Add security question offline worked", addOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsAddTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertEquals("Retrieved Password security question doesn't exist", retrievedPassword?.value.securityQuestions.value.size, 0);

        retrievedPassword!.value.securityQuestions.value.set("2", new Field({
            id: new Field("2"),
            question: new Field("Second"),
            questionLength: new Field(0),
            answer: new Field("no"),
            answerLength: new Field(0)
        }));

        const addOnline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Add security question online worked", addOnline);

        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsAddTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        ctx.assertTruthy("Merged Security Question one exists", retrievedPassword?.value.securityQuestions.value.get("1"));
        ctx.assertTruthy("Merged Security Question two exists", retrievedPassword?.value.securityQuestions.value.get("2"));
    }
});

const mergingFilterGroupsAddForPasswordTest = "Merging Added Filters / Groups for password Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupsAddForPasswordTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.login.value = "Merging Added Filters / Groups for Password";

        const filter = defaultFilter(DataType.Passwords);
        filter.name.value = "Merging Added Filter For Password";
        filter.conditions.value.set("1", new Field({
            id: new Field("1"),
            property: new Field("domain"),
            filterType: new Field(FilterConditionType.EqualTo),
            value: new Field("Merging Added Filter For Password")
        }));

        const group = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Added Group For Password";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password succeeded", addPasswordSucceeded);

        const addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter succeeded", addedFilterSucceeded);

        const addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group succeeded", addedGroupSucceeded);

        await logIntoOfflineMode(mergingFilterGroupsAddForPasswordTest, ctx);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);
        ctx.assertEquals("No groups", retrievedPassword?.value.groups.value.size, 0);
        ctx.assertEquals("No filters", retrievedPassword?.value.filters.value.size, 0);

        ctx.assertEquals("No Passwords for Group", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.size, 0);
        ctx.assertEquals("No Passwords for Filter", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)?.value.passwords.value.size, 0);

        const clonedPassword: Password = JSON.vaulticParse(JSON.vaulticStringify(retrievedPassword!.value));
        clonedPassword.groups.value.set(group.id.value, new Field(group.id.value));

        const addOffline = await app.currentVault.passwordStore.updatePassword(masterKey, clonedPassword, false, [], []);
        ctx.assertTruthy("Update password offline worked", addOffline);
        ctx.assertTruthy("Group has offline password", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.has(clonedPassword.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupsAddForPasswordTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertEquals("Offline group doesn't exist for password", retrievedPassword?.value.groups.value.size, 0);
        ctx.assertEquals("Group doesn't have password", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.size, 0);

        retrievedPassword!.value.domain.value = "Merging Added Filter For Password";

        const addOnline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);

        ctx.assertTruthy("Update password worked", addOnline);
        ctx.assertTruthy("Password has filter", app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("Filer has password", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)?.value.passwords.value.has(password.id.value));

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupsAddForPasswordTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        ctx.assertTruthy("Password has group after merge", retrievedPassword?.value.groups.value.get(group.id.value));
        ctx.assertTruthy("Group has password after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.has(retrievedPassword!.value.id.value));

        ctx.assertTruthy("Password has filter after merge", retrievedPassword?.value.filters.value.get(filter.id.value));
        ctx.assertTruthy("Filter has password after merge", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)?.value.passwords.value.has(retrievedPassword!.value.id.value));
    }
});

const mergingValueAddTest = "Merging Added Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueAddTest, func: async (ctx: TestContext) =>
    {
        await logIntoOfflineMode(mergingValueAddTest, ctx);

        const offlineDupValueOne = defaultValue();
        offlineDupValueOne.name.value = "Merging Offline Dup Value 1";
        offlineDupValueOne.value.value = "One";

        const offlineDupValueTwo = defaultValue();
        offlineDupValueTwo.name.value = "Merging Offline Dup Value 2";
        offlineDupValueTwo.value.value = "One";

        const offlineSafeValueOne = defaultValue();
        offlineSafeValueOne.valueType.value = NameValuePairType.Passcode;
        offlineSafeValueOne.name.value = "Merging Offline Safe Value 2";
        offlineSafeValueOne.value.value = "SLDvweilihslvih2ioht829u89oiILSGD]]p][2";

        let addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, offlineDupValueOne);
        ctx.assertTruthy("Add offline dup Value 1 succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, offlineDupValueTwo);
        ctx.assertTruthy("Add offline dup Value 2 succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, offlineSafeValueOne);
        ctx.assertTruthy("Add offline safe Value 1 succeeded", addValueSucceeded);

        ctx.assertTruthy("Offline dup Value one exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs.value.get(offlineDupValueOne.id.value));
        ctx.assertTruthy("Offline dup Value two exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs.value.get(offlineDupValueTwo.id.value));
        ctx.assertEquals("Offline safe Value one exists", app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1], 1);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueAddTest, ctx);

        ctx.assertUndefined("Merged Offline Dup Value one does not exist", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineDupValueOne.id.value));
        ctx.assertUndefined("Merged Offline Dup Value two does not exist", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineDupValueTwo.id.value));
        ctx.assertUndefined("Merged Offline Safe Value one does not exist", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineSafeValueOne.id.value));

        ctx.assertEquals("No duplicate values", app.currentVault.valueStore.duplicateNameValuePairs.value.size, 0);
        ctx.assertEquals("No safe values", app.currentVault.valueStore.currentAndSafeValuesSafe.length, 0);

        const onlineDupValueOne = defaultValue();
        onlineDupValueOne.name.value = "Merging online Dup Value 1";
        onlineDupValueOne.value.value = "One";

        const onlineDupValueTwo = defaultValue();
        onlineDupValueTwo.name.value = "Merging online Dup Value 2";
        onlineDupValueTwo.value.value = "One";

        const onlineSafeValueOne = defaultValue();
        onlineSafeValueOne.valueType.value = NameValuePairType.Passcode;
        onlineSafeValueOne.name.value = "Merging online Safe Value 2";
        onlineSafeValueOne.value.value = "SLDvweilihslvfih2ioht829u89oiILSGD]]p][2";

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, onlineDupValueOne);
        ctx.assertTruthy("Add offline dup Value 1 succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, onlineDupValueTwo);
        ctx.assertTruthy("Add offline dup Value 2 succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, onlineSafeValueOne);
        ctx.assertTruthy("Add offline safe Value 1 succeeded", addValueSucceeded);

        ctx.assertTruthy("Online dup Value one exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs.value.get(onlineDupValueOne.id.value));
        ctx.assertTruthy("Online dup Value two exists in duplicates", app.currentVault.valueStore.duplicateNameValuePairs.value.get(onlineDupValueTwo.id.value));
        ctx.assertEquals("Online safe Value one exists", app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1], 1);

        await swapToSecondDatabaseAndLogIn(mergingValueAddTest, ctx);

        ctx.assertTruthy("Merged Offline duplicate value one exists after merge", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineDupValueOne.id.value));
        ctx.assertTruthy("Merged Offline duplicate value two exists after merge", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineDupValueTwo.id.value));

        ctx.assertTruthy("Merged online duplicate value one exists after merge", app.currentVault.valueStore.nameValuePairsByID.value.get(onlineDupValueOne.id.value));
        ctx.assertTruthy("Merged online duplicate value one exists after merge", app.currentVault.valueStore.nameValuePairsByID.value.get(onlineDupValueTwo.id.value));

        ctx.assertTruthy("Merged offline safe value one exists after merge", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineSafeValueOne.id.value));
        ctx.assertTruthy("Merged online safe value one exists after merge", app.currentVault.valueStore.nameValuePairsByID.value.get(onlineSafeValueOne.id.value));

        ctx.assertTruthy("Merged Offline duplicate value one exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs.value.get(offlineDupValueOne.id.value));
        ctx.assertTruthy("Merged Offline duplicate value two exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs.value.get(offlineDupValueTwo.id.value));

        ctx.assertTruthy("Merged online duplicate value one exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs.value.get(onlineDupValueOne.id.value));
        ctx.assertTruthy("Merged online duplicate value two exists in duplicates after merge", app.currentVault.valueStore.duplicateNameValuePairs.value.get(onlineDupValueTwo.id.value));

        ctx.assertEquals("Safe values has 6 values", app.currentVault.valueStore.currentAndSafeValuesSafe.length, 6);
        ctx.assertEquals("Current values has 6 values", app.currentVault.valueStore.currentAndSafeValuesCurrent.length, 6);
    }
});

const mergingFilterAddTest = "Merging Added Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterAddTest, func: async (ctx: TestContext) =>
    {
        const beforeEmptyPasswordFilters = app.currentVault.filterStore.emptyPasswordFilters.value.size;

        await logIntoOfflineMode(mergingFilterAddTest, ctx);

        const offlineDupEmptypasswordFilterOne = defaultFilter(DataType.Passwords);
        offlineDupEmptypasswordFilterOne.name.value = "Merging Offline Dup Empty Password Filter 1";

        const offlineDupEmptypasswordFilterTwo = defaultFilter(DataType.Passwords);
        offlineDupEmptypasswordFilterTwo.name.value = "Merging Offline Dup Empty Password Filter 2";

        const offlineDupEmptyValueFilterOne = defaultFilter(DataType.NameValuePairs);
        offlineDupEmptyValueFilterOne.name.value = "Merging Offline Dup Empty Value Filter 1";

        const offlineDupEmptyValueFilterTwo = defaultFilter(DataType.NameValuePairs);
        offlineDupEmptyValueFilterTwo.name.value = "Merging Offline Dup Empty Value Filter 1";

        let addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, offlineDupEmptypasswordFilterOne);
        ctx.assertTruthy("Add Offline Dup Empty Password 1 Filter succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, offlineDupEmptypasswordFilterTwo);
        ctx.assertTruthy("Add Offline Dup Empty Password 2 Filter succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, offlineDupEmptyValueFilterOne);
        ctx.assertTruthy("Add Offline Dup Empty Value 1 Filter succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, offlineDupEmptyValueFilterTwo);
        ctx.assertTruthy("Add Offline Dup Empty Value 2 Filter succeeded", addFilterSucceeded);

        ctx.assertTruthy("Offline dup empty password filter one exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters.value.get(offlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Offline dup empty password filter two exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters.value.get(offlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Offline dup empty value filter one exists in duplicates", app.currentVault.filterStore.duplicateValueFilters.value.get(offlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Offline dup empty value filter two exists in duplicates", app.currentVault.filterStore.duplicateValueFilters.value.get(offlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Offline dup empty password filter one exists in empties", app.currentVault.filterStore.emptyPasswordFilters.value.get(offlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Offline dup empty password filter two exists in empties", app.currentVault.filterStore.emptyPasswordFilters.value.get(offlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Offline dup empty value filter one exists in empties", app.currentVault.filterStore.emptyValueFilters.value.get(offlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Offline dup empty value filter two exists in empties", app.currentVault.filterStore.emptyValueFilters.value.get(offlineDupEmptyValueFilterTwo.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterAddTest, ctx);

        ctx.assertUndefined("Offline dup empty password Filter one does not exist", app.currentVault.filterStore.passwordFiltersByID.value.get(offlineDupEmptypasswordFilterOne.id.value));
        ctx.assertUndefined("Offline dup empty password Filter two does not exist", app.currentVault.filterStore.passwordFiltersByID.value.get(offlineDupEmptypasswordFilterTwo.id.value));

        ctx.assertUndefined("Offline dup empty value Filter one does not exist", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(offlineDupEmptyValueFilterOne.id.value));
        ctx.assertUndefined("Offline dup empty value Filter two does not exist", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(offlineDupEmptyValueFilterTwo.id.value));

        ctx.assertEquals("No offline duplicate password filters", app.currentVault.filterStore.duplicatePasswordFilters.value.size, 0);
        ctx.assertEquals("No offline duplicate value filters", app.currentVault.filterStore.duplicateValueFilters.value.size, 0);

        ctx.assertEquals("No new offline empty password filters", app.currentVault.filterStore.emptyPasswordFilters.value.size, beforeEmptyPasswordFilters);
        ctx.assertEquals("No offline empty value filters", app.currentVault.filterStore.emptyValueFilters.value.size, 0);

        const onlineDupEmptypasswordFilterOne = defaultFilter(DataType.Passwords);
        onlineDupEmptypasswordFilterOne.name.value = "Merging Online Dup Empty Password Filter 1";

        const onlineDupEmptypasswordFilterTwo = defaultFilter(DataType.Passwords);
        onlineDupEmptypasswordFilterTwo.name.value = "Merging Online Dup Empty Password Filter 2";

        const onlineDupEmptyValueFilterOne = defaultFilter(DataType.NameValuePairs);
        onlineDupEmptyValueFilterOne.name.value = "Merging Online Dup Empty Value Filter 1";

        const onlineDupEmptyValueFilterTwo = defaultFilter(DataType.NameValuePairs);
        onlineDupEmptyValueFilterTwo.name.value = "Merging Online Dup Empty Value Filter 1";

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, onlineDupEmptypasswordFilterOne);
        ctx.assertTruthy("Add Online Dup Empty Password 1 Filter succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, onlineDupEmptypasswordFilterTwo);
        ctx.assertTruthy("Add Online Dup Empty Password 2 Filter succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, onlineDupEmptyValueFilterOne);
        ctx.assertTruthy("Add Online Dup Empty Value 1 Filter succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, onlineDupEmptyValueFilterTwo);
        ctx.assertTruthy("Add Online Dup Empty Value 2 Filter succeeded", addFilterSucceeded);

        ctx.assertTruthy("Online dup empty password filter one exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters.value.get(onlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Online dup empty password filter two exists in duplicates", app.currentVault.filterStore.duplicatePasswordFilters.value.get(onlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Online dup empty value filter one exists in duplicates", app.currentVault.filterStore.duplicateValueFilters.value.get(onlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Online dup empty value filter two exists in duplicates", app.currentVault.filterStore.duplicateValueFilters.value.get(onlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Online dup empty password filter one exists in empties", app.currentVault.filterStore.emptyPasswordFilters.value.get(onlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Online dup empty password filter two exists in empties", app.currentVault.filterStore.emptyPasswordFilters.value.get(onlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Online dup empty value filter one exists in empties", app.currentVault.filterStore.emptyValueFilters.value.get(onlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Online dup empty value filter two exists in empties", app.currentVault.filterStore.emptyValueFilters.value.get(onlineDupEmptyValueFilterTwo.id.value));

        await swapToSecondDatabaseAndLogIn(mergingFilterAddTest, ctx);

        ctx.assertTruthy("Merged offline duplicate empty password filter one exists after merge", app.currentVault.filterStore.passwordFiltersByID.value.get(offlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty password filter two exists after merge", app.currentVault.filterStore.passwordFiltersByID.value.get(offlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value filter one exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(offlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value filter two exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(offlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Merged online duplicate empty password filter one exists after merge", app.currentVault.filterStore.passwordFiltersByID.value.get(onlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty password filter two exists after merge", app.currentVault.filterStore.passwordFiltersByID.value.get(onlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Merged online duplicate empty value filter one exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(onlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty value filter two exists after merge", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(onlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Merged offline duplicate empty password filter one exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters.value.get(offlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty password filter two exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters.value.get(offlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value filter one exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters.value.get(offlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value filter two exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters.value.get(offlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Merged online duplicate empty password filter one exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters.value.get(onlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty password filter two exists in duplicates after merge", app.currentVault.filterStore.duplicatePasswordFilters.value.get(onlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Merged online duplicate empty value filter one exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters.value.get(onlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty value filter two exists in duplicates after merge", app.currentVault.filterStore.duplicateValueFilters.value.get(onlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Merged offline duplicate empty password filter one exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters.value.get(offlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty password filter two exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters.value.get(offlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value filter one exists in empty after merge", app.currentVault.filterStore.emptyValueFilters.value.get(offlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value filter two exists in empty after merge", app.currentVault.filterStore.emptyValueFilters.value.get(offlineDupEmptyValueFilterTwo.id.value));

        ctx.assertTruthy("Merged online duplicate empty password filter one exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters.value.get(onlineDupEmptypasswordFilterOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty password filter two exists in empty after merge", app.currentVault.filterStore.emptyPasswordFilters.value.get(onlineDupEmptypasswordFilterTwo.id.value));
        ctx.assertTruthy("Merged online duplicate empty value filter one exists in empty after merge", app.currentVault.filterStore.emptyValueFilters.value.get(onlineDupEmptyValueFilterOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty value filter two exists in empty after merge", app.currentVault.filterStore.emptyValueFilters.value.get(onlineDupEmptyValueFilterTwo.id.value));
    }
});

const mergingFilterConditionsAddTest = "Merging Added Filter Conditions Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterConditionsAddTest, func: async (ctx: TestContext) =>
    {
        const filter = defaultFilter(DataType.Passwords);
        filter.name.value = "Merging Filter Conditions";

        const addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add filter succeeded", addFilterSucceeded);

        await logIntoOfflineMode(mergingFilterConditionsAddTest, ctx);

        let retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value);
        ctx.assertTruthy("Retrieved Filter exists", retrievedFilter);

        retrievedFilter!.value.conditions.value.set("1", new Field({
            id: new Field("1"),
            property: new Field("login"),
            filterType: new Field(FilterConditionType.Contains),
            value: new Field("")
        }));

        const addOffline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Add filter condiiton offline worked", addOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsAddTest, ctx);

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value);
        ctx.assertEquals("Retrieved offline Password security question doesn't exist", retrievedFilter?.value.conditions.value.size, 0);

        retrievedFilter!.value.conditions.value.set("2", new Field({
            id: new Field("2"),
            property: new Field("login"),
            filterType: new Field(FilterConditionType.Contains),
            value: new Field("")
        }));

        const addOnline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Add filter conditions online worked", addOnline);

        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsAddTest, ctx);

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value);

        ctx.assertTruthy("Merged filter condition one exists", retrievedFilter?.value.conditions.value.get("1"));
        ctx.assertTruthy("Merged filter condition two exists", retrievedFilter?.value.conditions.value.get("2"));
    }
});

const mergingGroupAddTest = "Merging Added Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupAddTest, func: async (ctx: TestContext) =>
    {
        const beforeEmptyGroupsCount = app.currentVault.groupStore.emptyPasswordGroups.value.size;

        await logIntoOfflineMode(mergingGroupAddTest, ctx);

        const offlineDupEmptyPasswordGroupOne = defaultGroup(DataType.Passwords);
        offlineDupEmptyPasswordGroupOne.name.value = "Merging Offline Dup Empty Password Group 1";

        const offlineDupEmptyPasswordGroupTwo = defaultGroup(DataType.Passwords);
        offlineDupEmptyPasswordGroupTwo.name.value = "Merging Offline Dup Empty Password Group 2";

        const offlineDupEmptyValueGroupOne = defaultGroup(DataType.NameValuePairs);
        offlineDupEmptyValueGroupOne.name.value = "Merging Offline Dup Empty Value Group 1";

        const offlineDupEmptyValueGroupTwo = defaultGroup(DataType.NameValuePairs);
        offlineDupEmptyValueGroupTwo.name.value = "Merging Offline Dup Empty Value Group 1";

        let addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, offlineDupEmptyPasswordGroupOne);
        ctx.assertTruthy("Add Offline Dup Empty Password 1 Group succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, offlineDupEmptyPasswordGroupTwo);
        ctx.assertTruthy("Add Offline Dup Empty Password 2 Group succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, offlineDupEmptyValueGroupOne);
        ctx.assertTruthy("Add Offline Dup Empty Value 1 Group succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, offlineDupEmptyValueGroupTwo);
        ctx.assertTruthy("Add Offline Dup Empty Value 2 Group succeeded", addGroupSucceeded);

        ctx.assertTruthy("Offline dup empty password Group one exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups.value.get(offlineDupEmptyPasswordGroupOne.id.value));
        ctx.assertTruthy("Offline dup empty password Group two exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups.value.get(offlineDupEmptyPasswordGroupTwo.id.value));
        ctx.assertTruthy("Offline dup empty value Group one exists in duplicates", app.currentVault.groupStore.duplicateValueGroups.value.get(offlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Offline dup empty value Group two exists in duplicates", app.currentVault.groupStore.duplicateValueGroups.value.get(offlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Offline dup empty password Group one exists in empties", app.currentVault.groupStore.emptyPasswordGroups.value.get(offlineDupEmptyPasswordGroupOne.id.value));
        ctx.assertTruthy("Offline dup empty password Group two exists in empties", app.currentVault.groupStore.emptyPasswordGroups.value.get(offlineDupEmptyPasswordGroupTwo.id.value));
        ctx.assertTruthy("Offline dup empty value Group one exists in empties", app.currentVault.groupStore.emptyValueGroups.value.get(offlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Offline dup empty value Group two exists in empties", app.currentVault.groupStore.emptyValueGroups.value.get(offlineDupEmptyValueGroupTwo.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingGroupAddTest, ctx);

        ctx.assertUndefined("Offline dup empty password Group one does not exist", app.currentVault.groupStore.passwordGroupsByID.value.get(offlineDupEmptyPasswordGroupOne.id.value));
        ctx.assertUndefined("Offline dup empty password Group two does not exist", app.currentVault.groupStore.passwordGroupsByID.value.get(offlineDupEmptyPasswordGroupTwo.id.value));

        ctx.assertUndefined("Offline dup empty value Group one does not exist", app.currentVault.groupStore.valueGroupsByID.value.get(offlineDupEmptyValueGroupOne.id.value));
        ctx.assertUndefined("Offline dup empty value Group two does not exist", app.currentVault.groupStore.valueGroupsByID.value.get(offlineDupEmptyValueGroupTwo.id.value));

        ctx.assertEquals("No offline duplicate password Group", app.currentVault.groupStore.duplicatePasswordGroups.value.size, 0);
        ctx.assertEquals("No offline duplicate value Group", app.currentVault.groupStore.duplicateValueGroups.value.size, 0);

        ctx.assertEquals("No added offline empty password Group", app.currentVault.groupStore.emptyPasswordGroups.value.size, beforeEmptyGroupsCount);
        ctx.assertEquals("No offline empty value Group", app.currentVault.groupStore.emptyValueGroups.value.size, 0);

        const onlineDupEmptypasswordGroupOne = defaultGroup(DataType.Passwords);
        onlineDupEmptypasswordGroupOne.name.value = "Merging Online Dup Empty Password Group 1";

        const onlineDupEmptypasswordGroupTwo = defaultGroup(DataType.Passwords);
        onlineDupEmptypasswordGroupTwo.name.value = "Merging Online Dup Empty Password Group 2";

        const onlineDupEmptyValueGroupOne = defaultGroup(DataType.NameValuePairs);
        onlineDupEmptyValueGroupOne.name.value = "Merging Online Dup Empty Value Group 1";

        const onlineDupEmptyValueGroupTwo = defaultGroup(DataType.NameValuePairs);
        onlineDupEmptyValueGroupTwo.name.value = "Merging Online Dup Empty Value Group 1";

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, onlineDupEmptypasswordGroupOne);
        ctx.assertTruthy("Add Online Dup Empty Password 1 Group succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, onlineDupEmptypasswordGroupTwo);
        ctx.assertTruthy("Add Online Dup Empty Password 2 Group succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, onlineDupEmptyValueGroupOne);
        ctx.assertTruthy("Add Online Dup Empty Value 1 Group succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, onlineDupEmptyValueGroupTwo);
        ctx.assertTruthy("Add Online Dup Empty Value 2 Group succeeded", addGroupSucceeded);

        ctx.assertTruthy("Online dup empty password Group one exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups.value.get(onlineDupEmptypasswordGroupOne.id.value));
        ctx.assertTruthy("Online dup empty password Group two exists in duplicates", app.currentVault.groupStore.duplicatePasswordGroups.value.get(onlineDupEmptypasswordGroupTwo.id.value));
        ctx.assertTruthy("Online dup empty value Group one exists in duplicates", app.currentVault.groupStore.duplicateValueGroups.value.get(onlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Online dup empty value Group two exists in duplicates", app.currentVault.groupStore.duplicateValueGroups.value.get(onlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Online dup empty password Group one exists in empties", app.currentVault.groupStore.emptyPasswordGroups.value.get(onlineDupEmptypasswordGroupOne.id.value));
        ctx.assertTruthy("Online dup empty password Group two exists in empties", app.currentVault.groupStore.emptyPasswordGroups.value.get(onlineDupEmptypasswordGroupTwo.id.value));
        ctx.assertTruthy("Online dup empty value Group one exists in empties", app.currentVault.groupStore.emptyValueGroups.value.get(onlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Online dup empty value Group two exists in empties", app.currentVault.groupStore.emptyValueGroups.value.get(onlineDupEmptyValueGroupTwo.id.value));

        await swapToSecondDatabaseAndLogIn(mergingGroupAddTest, ctx);

        ctx.assertTruthy("Merged offline duplicate empty password Group one exists after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(offlineDupEmptyPasswordGroupOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty password Group two exists after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(offlineDupEmptyPasswordGroupTwo.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value Group one exists after merge", app.currentVault.groupStore.valueGroupsByID.value.get(offlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value Group two exists after merge", app.currentVault.groupStore.valueGroupsByID.value.get(offlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Merged online duplicate empty password Group one exists after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(onlineDupEmptypasswordGroupOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty password Group two exists after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(onlineDupEmptypasswordGroupTwo.id.value));
        ctx.assertTruthy("Merged online duplicate empty value Group one exists after merge", app.currentVault.groupStore.valueGroupsByID.value.get(onlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty value Group two exists after merge", app.currentVault.groupStore.valueGroupsByID.value.get(onlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Merged offline duplicate empty password Group one exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups.value.get(offlineDupEmptyPasswordGroupOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty password Group two exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups.value.get(offlineDupEmptyPasswordGroupTwo.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value Group one exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups.value.get(offlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value Group two exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups.value.get(offlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Merged online duplicate empty password Group one exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups.value.get(onlineDupEmptypasswordGroupOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty password Group two exists in duplicates after merge", app.currentVault.groupStore.duplicatePasswordGroups.value.get(onlineDupEmptypasswordGroupTwo.id.value));
        ctx.assertTruthy("Merged online duplicate empty value Group one exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups.value.get(onlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty value Group two exists in duplicates after merge", app.currentVault.groupStore.duplicateValueGroups.value.get(onlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Merged offline duplicate empty password Group one exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups.value.get(offlineDupEmptyPasswordGroupOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty password Group two exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups.value.get(offlineDupEmptyPasswordGroupTwo.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value Group one exists in empty after merge", app.currentVault.groupStore.emptyValueGroups.value.get(offlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Merged offline duplicate empty value Group two exists in empty after merge", app.currentVault.groupStore.emptyValueGroups.value.get(offlineDupEmptyValueGroupTwo.id.value));

        ctx.assertTruthy("Merged online duplicate empty password Group one exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups.value.get(onlineDupEmptypasswordGroupOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty password Group two exists in empty after merge", app.currentVault.groupStore.emptyPasswordGroups.value.get(onlineDupEmptypasswordGroupTwo.id.value));
        ctx.assertTruthy("Merged online duplicate empty value Group one exists in empty after merge", app.currentVault.groupStore.emptyValueGroups.value.get(onlineDupEmptyValueGroupOne.id.value));
        ctx.assertTruthy("Merged online duplicate empty value Group two exists in empty after merge", app.currentVault.groupStore.emptyValueGroups.value.get(onlineDupEmptyValueGroupTwo.id.value));
    }
});

const mergingPasswordUpdatesTest = "Merging Updated Passwords Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordUpdatesTest, func: async (ctx: TestContext) =>
    {
        const dupPasswordOne = defaultPassword();
        dupPasswordOne.login.value = "MMerging Updated Duplidate Password 1";
        dupPasswordOne.password.value = "Merging Updated Duplidate Password 1";

        const dupPasswordTwo = defaultPassword();
        dupPasswordTwo.login.value = "Merging Updated Duplicate password 2";
        dupPasswordTwo.password.value = "Merging Updated Duplidate Password 1";

        const dupPasswordThree = defaultPassword();
        dupPasswordThree.login.value = "MMerging Updated Duplidate Password 3";
        dupPasswordThree.password.value = "Merging Updated Duplidate Password 2";

        const dupPasswordFour = defaultPassword();
        dupPasswordFour.login.value = "Merging Updated Duplicate password 4";
        dupPasswordFour.password.value = "Merging Updated Duplidate Password 2";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordOne);
        ctx.assertTruthy("Add Dup Password one succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordTwo);
        ctx.assertTruthy("Add Dup Password two succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordThree);
        ctx.assertTruthy("Add Dup Password three succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordFour);
        ctx.assertTruthy("Add Dup Password four succeeded", addPasswordSucceeded);

        ctx.assertTruthy("Dup password one exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Dup password two exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        const addedDomainTime = app.currentVault.passwordStore.passwordsByID.value.get(dupPasswordOne.id.value)?.value.domain.lastModifiedTime;

        await logIntoOfflineMode(mergingPasswordUpdatesTest, ctx);

        let passwordState = app.currentVault.passwordStore.cloneState();
        let retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordOne.id.value)!;
        retrievedPassword.value.domain.value = "first";
        retrievedPassword.value.email.value = "test@test.com";
        retrievedPassword.value.password.value = "updated";

        let updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        const updatedDomainTime = app.currentVault.passwordStore.passwordsByID.value.get(dupPasswordOne.id.value)?.value.domain.lastModifiedTime;

        ctx.assertTruthy("Update Offline Password succeeded", updatePasswordSucceeded);

        ctx.assertTruthy("Duplicate password one doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Duplicate password two doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordUpdatesTest, ctx);

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordOne.id.value)!;
        ctx.assertEquals("retrieved password domain is empty", retrievedPassword.value.domain.value, "");
        ctx.assertEquals("retrieved password email is empty", retrievedPassword.value.domain.value, "");

        ctx.assertTruthy("Dup password one exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Dup password two exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        retrievedPassword.value.domain.value = "second";
        retrievedPassword.value.additionalInformation.value = "info";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        const updatedDomainTimeTwo = app.currentVault.passwordStore.passwordsByID.value.get(dupPasswordOne.id.value)?.value.domain.lastModifiedTime;

        ctx.assertTruthy("Update online Password succeeded", addPasswordSucceeded);

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordThree.id.value)!;
        retrievedPassword.value.password.value = "test 2";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update online Password succeeded", updatePasswordSucceeded);

        ctx.assertTruthy("Dup password 3 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        await swapToSecondDatabaseAndLogIn(mergingPasswordUpdatesTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(dupPasswordOne.id.value)!;
        ctx.assertEquals("merged password domain is second", retrievedPassword.value.domain.value, "second");
        ctx.assertEquals("merged password email is test@test.com", retrievedPassword.value.email.value, "test@test.com");
        ctx.assertEquals("merged password info is info", retrievedPassword.value.additionalInformation.value, "info");

        ctx.assertTruthy("merged duplicate password one doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("merged duplicate password two doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("merged duplicate password three doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("merged duplicate password four doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));
    }
});

export default mergingDataTestSuite;