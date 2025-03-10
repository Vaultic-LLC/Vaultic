import { DataType, defaultFilter, defaultGroup, defaultPassword, defaultValue, Filter, FilterCondition, FilterConditionType, Group, NameValuePair, NameValuePairType, Password } from "../../src/core/Types/DataTypes";
import { api } from "../../src/core/API";
import app from "../../src/core/Objects/Stores/AppStore";
import { createTestSuite, TestContext } from "../test";
import { Field } from "@vaultic/shared/Types/Fields";
import cryptHelper from "../../src/core/Helpers/cryptHelper";

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

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(offlineDupPasswordOne.id.value);
        ctx.assertTruthy("Password id is set", retrievedPassword?.id != undefined);
        ctx.assertTruthy("Password additional info id is set", retrievedPassword?.value.additionalInformation.id != undefined);
        ctx.assertTruthy("Password containsLogin id is set", retrievedPassword?.value.containsLogin.id != undefined);
        ctx.assertTruthy("Password domain id is set", retrievedPassword?.value.domain.id != undefined);
        ctx.assertTruthy("Password email id is set", retrievedPassword?.value.email.id != undefined);
        ctx.assertTruthy("Password filters id is set", retrievedPassword?.value.filters.id != undefined);
        ctx.assertTruthy("Password groups id is set", retrievedPassword?.value.groups.id != undefined);
        ctx.assertTruthy("Password id id is set", retrievedPassword?.value.id.id != undefined);
        ctx.assertTruthy("Password isVaultic id is set", retrievedPassword?.value.isVaultic.id != undefined);
        ctx.assertTruthy("Password isWeak id is set", retrievedPassword?.value.isWeak.id != undefined);
        ctx.assertTruthy("Password isWeakMessage id is set", retrievedPassword?.value.isWeakMessage.id != undefined);
        ctx.assertTruthy("Password lastModifiedTime id is set", retrievedPassword?.value.lastModifiedTime.id != undefined);
        ctx.assertTruthy("Password login id is set", retrievedPassword?.value.login.id != undefined);
        ctx.assertTruthy("Password password id is set", retrievedPassword?.value.password.id != undefined);
        ctx.assertTruthy("Password passwordFor id is set", retrievedPassword?.value.passwordFor.id != undefined);
        ctx.assertTruthy("Password passwordLength id is set", retrievedPassword?.value.passwordLength.id != undefined);
        ctx.assertTruthy("Password securityQuestions id is set", retrievedPassword?.value.securityQuestions.id != undefined);

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
        password.login.value = "Merging Added Security Questions Works";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password 1 succeeded", addPasswordSucceeded);

        await logIntoOfflineMode(mergingSecurityQuestionsAddTest, ctx);

        let retrievedPassword: Field<Password> = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)));
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);

        retrievedPassword!.value.securityQuestions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            question: WebFieldConstructor.create("First"),
            questionLength: WebFieldConstructor.create(0),
            answer: WebFieldConstructor.create("yes"),
            answerLength: WebFieldConstructor.create(0)
        }));

        const addOffline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Add security question offline worked", addOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsAddTest, ctx);

        retrievedPassword = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)));
        ctx.assertEquals("Retrieved Password security question doesn't exist", retrievedPassword?.value.securityQuestions.value.size, 0);

        retrievedPassword!.value.securityQuestions.value.set("2", WebFieldConstructor.create({
            id: WebFieldConstructor.create("2"),
            question: WebFieldConstructor.create("Second"),
            questionLength: WebFieldConstructor.create(0),
            answer: WebFieldConstructor.create("no"),
            answerLength: WebFieldConstructor.create(0)
        }));

        const addOnline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Add security question online worked", addOnline);

        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsAddTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)!;

        ctx.assertTruthy("Merged Security Question one exists", retrievedPassword?.value.securityQuestions.value.has("1"));
        ctx.assertTruthy("Merged Security Question two exists", retrievedPassword?.value.securityQuestions.value.has("2"));
    }
});

const mergingFilterGroupsAddForPasswordTest = "Merging Added Filters / Groups for password Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupsAddForPasswordTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.login.value = "Merging Added Filters / Groups for password Works";

        const filter = defaultFilter(DataType.Passwords);
        filter.name.value = "Merging Added Filter For Password";
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("domain"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Added Filter For Password")
        }));

        const group = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Added Group For Password";

        const group2 = defaultGroup(DataType.Passwords);
        group2.name.value = "Merging Added Group For Password";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password succeeded", addPasswordSucceeded);

        const addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter succeeded", addedFilterSucceeded);

        let addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group 1 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group2);
        ctx.assertTruthy("Add Group 2 succeeded", addedGroupSucceeded);

        await logIntoOfflineMode(mergingFilterGroupsAddForPasswordTest, ctx);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);
        ctx.assertEquals("No groups", retrievedPassword?.value.groups.value.size, 0);
        ctx.assertEquals("No filters", retrievedPassword?.value.filters.value.size, 0);

        ctx.assertEquals("No Passwords for Group", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.size, 0);
        ctx.assertEquals("No Passwords for Filter", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)?.value.passwords.value.size, 0);

        const clonedPassword: Password = JSON.vaulticParse(JSON.vaulticStringify(retrievedPassword!.value));
        clonedPassword.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        let updateOffline = await app.currentVault.passwordStore.updatePassword(masterKey, clonedPassword, false, [], []);
        ctx.assertTruthy("Update password offline worked", updateOffline);
        ctx.assertTruthy("Group has offline password", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.has(clonedPassword.id.value));

        const clonedGroup: Group = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.groupStore.passwordGroupsByID.value.get(group2.id.value)!.value));
        clonedGroup.passwords.value.set(clonedPassword.id.value, WebFieldConstructor.create(clonedPassword.id.value));

        updateOffline = await app.currentVault.groupStore.updateGroup(masterKey, clonedGroup);
        ctx.assertTruthy("Update group offline worked", updateOffline);
        ctx.assertTruthy("Password has group", app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)?.value.groups.value.has(clonedGroup.id.value));

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

        ctx.assertTruthy("Password has group 1 after merge", retrievedPassword?.value.groups.value.get(group.id.value));
        ctx.assertTruthy("Password has group 2 after merge", retrievedPassword?.value.groups.value.get(group2.id.value))

        ctx.assertTruthy("Group 1 has password after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)?.value.passwords.value.has(retrievedPassword!.value.id.value));
        ctx.assertTruthy("Group 2 has password after merge", app.currentVault.groupStore.passwordGroupsByID.value.get(group2.id.value)?.value.passwords.value.has(retrievedPassword!.value.id.value));

        ctx.assertTruthy("Password has filter after merge", retrievedPassword?.value.filters.value.get(filter.id.value));
        ctx.assertTruthy("Filter has password after merge", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)?.value.passwords.value.has(retrievedPassword!.value.id.value));
    }
});

const mergingFilterGroupsAddForValueTest = "Merging Added Filters / Groups for value Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupsAddForValueTest, func: async (ctx: TestContext) =>
    {
        const value = defaultValue();
        value.value.value = "Merging Added Filters / Groups for Value";

        const filter = defaultFilter(DataType.NameValuePairs);
        filter.name.value = "Merging Added Filter For Value";
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("name"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Added Filters / Groups for Value")
        }));

        const group = defaultGroup(DataType.NameValuePairs);
        group.name.value = "Merging Added Filters / Groups for Value";

        const group2 = defaultGroup(DataType.NameValuePairs);
        group2.name.value = "Merging Added Filters / Groups for Value";

        let addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, value);
        ctx.assertTruthy("Add Value succeeded", addValueSucceeded);

        const addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter succeeded", addedFilterSucceeded);

        let addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group 1 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group2);
        ctx.assertTruthy("Add Group 2 succeeded", addedGroupSucceeded);

        await logIntoOfflineMode(mergingFilterGroupsAddForValueTest, ctx);

        let retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(value.id.value);
        ctx.assertTruthy("Retrieved Value exists", retrievedValue);
        ctx.assertEquals("No groups", retrievedValue?.value.groups.value.size, 0);
        ctx.assertEquals("No filters", retrievedValue?.value.filters.value.size, 0);

        ctx.assertEquals("No Value for Group", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)?.value.values.value.size, 0);
        ctx.assertEquals("No Value for Filter", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)?.value.values.value.size, 0);

        const clonedValue: NameValuePair = JSON.vaulticParse(JSON.vaulticStringify(retrievedValue!.value));
        clonedValue.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        let updateOffline = await app.currentVault.valueStore.updateNameValuePair(masterKey, clonedValue, false);
        ctx.assertTruthy("Update Value offline worked", updateOffline);
        ctx.assertTruthy("Group has offline Value", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)?.value.values.value.has(clonedValue.id.value));

        const clonedGroup: Group = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.groupStore.valueGroupsByID.value.get(group2.id.value)!.value));
        clonedGroup.values.value.set(clonedValue.id.value, WebFieldConstructor.create(clonedValue.id.value));

        updateOffline = await app.currentVault.groupStore.updateGroup(masterKey, clonedGroup);
        ctx.assertTruthy("Update group offline worked", updateOffline);
        ctx.assertTruthy("Value has group", app.currentVault.valueStore.nameValuePairsByID.value.get(value.id.value)?.value.groups.value.has(clonedGroup.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupsAddForValueTest, ctx);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(value.id.value);
        ctx.assertEquals("Offline group doesn't exist for Value", retrievedValue?.value.groups.value.size, 0);
        ctx.assertEquals("Group doesn't have Value", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)?.value.values.value.size, 0);

        retrievedValue!.value.name.value = "Merging Added Filters / Groups for Value";
        const updateOnline = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, false);

        ctx.assertTruthy("Update Value worked", updateOnline);
        ctx.assertTruthy("Value has filter", app.currentVault.valueStore.nameValuePairsByID.value.get(value.id.value)?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("Filer has Value", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)?.value.values.value.has(value.id.value));

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupsAddForValueTest, ctx);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(value.id.value);

        ctx.assertTruthy("Value has group 1 after merge", retrievedValue?.value.groups.value.get(group.id.value));
        ctx.assertTruthy("Value has group 2 after merge", retrievedValue?.value.groups.value.get(group2.id.value))

        ctx.assertTruthy("Group 1 has Value after merge", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)?.value.values.value.has(retrievedValue!.value.id.value));
        ctx.assertTruthy("Group 2 has Value after merge", app.currentVault.groupStore.valueGroupsByID.value.get(group2.id.value)?.value.values.value.has(retrievedValue!.value.id.value));

        ctx.assertTruthy("Value has filter after merge", retrievedValue?.value.filters.value.get(filter.id.value));
        ctx.assertTruthy("Filter has Value after merge", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)?.value.values.value.has(retrievedValue!.value.id.value));
    }
});

const mergingValueAddTest = "Merging Added Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueAddTest, func: async (ctx: TestContext) =>
    {
        const beforeCurrentSize = app.currentVault.valueStore.currentAndSafeValuesCurrent.length;
        const beforeSafeSize = app.currentVault.valueStore.currentAndSafeValuesSafe.length;
        const beforeSafeValues = app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1];

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
        ctx.assertEquals("Offline safe Value incremented exists", app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1], beforeSafeValues + 1);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueAddTest, ctx);

        ctx.assertUndefined("Merged Offline Dup Value one does not exist", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineDupValueOne.id.value));
        ctx.assertUndefined("Merged Offline Dup Value two does not exist", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineDupValueTwo.id.value));
        ctx.assertUndefined("Merged Offline Safe Value one does not exist", app.currentVault.valueStore.nameValuePairsByID.value.get(offlineSafeValueOne.id.value));

        ctx.assertEquals("No duplicate values", app.currentVault.valueStore.duplicateNameValuePairs.value.size, 0);
        ctx.assertEquals("No new safe values", app.currentVault.valueStore.currentAndSafeValuesSafe.length, beforeSafeSize);

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
        ctx.assertEquals("Online safe Value incremented exists", app.currentVault.valueStore.currentAndSafeValuesSafe[app.currentVault.valueStore.currentAndSafeValuesSafe.length - 1], beforeSafeValues + 1);

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

        ctx.assertEquals("Safe values has 6 more values", app.currentVault.valueStore.currentAndSafeValuesSafe.length, beforeSafeSize + 6);
        ctx.assertEquals("Current values has 6 more values", app.currentVault.valueStore.currentAndSafeValuesCurrent.length, beforeCurrentSize + 6);
    }
});

const mergingFilterAddTest = "Merging Added Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterAddTest, func: async (ctx: TestContext) =>
    {
        const beforeEmptyPasswordFilters = app.currentVault.filterStore.emptyPasswordFilters.value.size;
        const beforeEmptyValueFilters = app.currentVault.filterStore.emptyValueFilters.value.size;

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
        ctx.assertEquals("No new offline empty value filters", app.currentVault.filterStore.emptyValueFilters.value.size, beforeEmptyValueFilters);

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

        let retrievedFilter: Field<Filter> = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)));
        ctx.assertTruthy("Retrieved Filter exists", retrievedFilter);

        retrievedFilter!.value.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("login"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("")
        }));

        const addOffline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Add filter condiiton offline worked", addOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsAddTest, ctx);

        retrievedFilter = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)));
        ctx.assertEquals("Retrieved offline Password security question doesn't exist", retrievedFilter?.value.conditions.value.size, 0);

        retrievedFilter!.value.conditions.value.set("2", WebFieldConstructor.create({
            id: WebFieldConstructor.create("2"),
            property: WebFieldConstructor.create("login"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("")
        }));

        const addOnline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Add filter conditions online worked", addOnline);

        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsAddTest, ctx);

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!;

        ctx.assertTruthy("Merged filter condition one exists", retrievedFilter?.value.conditions.value.get("1"));
        ctx.assertTruthy("Merged filter condition two exists", retrievedFilter?.value.conditions.value.get("2"));
    }
});

const mergingGroupAddTest = "Merging Added Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupAddTest, func: async (ctx: TestContext) =>
    {
        const beforeEmptyPasswordGroupsCount = app.currentVault.groupStore.emptyPasswordGroups.value.size;
        const beforeDuplicatePasswordGroupsCount = app.currentVault.groupStore.duplicatePasswordGroups.value.size;
        const beforeDuplicteValueGroupsCount = app.currentVault.groupStore.duplicateValueGroups.value.size;

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

        ctx.assertEquals("No new offline duplicate password Group", app.currentVault.groupStore.duplicatePasswordGroups.value.size, beforeDuplicatePasswordGroupsCount);
        ctx.assertEquals("No new offline duplicate value Group", app.currentVault.groupStore.duplicateValueGroups.value.size, beforeDuplicteValueGroupsCount);

        ctx.assertEquals("No added offline empty password Group", app.currentVault.groupStore.emptyPasswordGroups.value.size, beforeEmptyPasswordGroupsCount);
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

        const dupPasswordFive = defaultPassword();
        dupPasswordFive.login.value = "MMerging Updated Duplidate Password 5";
        dupPasswordFive.password.value = "Merging Updated Duplidate Password 3";

        const dupPasswordSix = defaultPassword();
        dupPasswordSix.login.value = "Merging Updated Duplicate password 6";
        dupPasswordSix.password.value = "Merging Updated Duplidate Password 3";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordOne);
        ctx.assertTruthy("Add Dup Password one succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordTwo);
        ctx.assertTruthy("Add Dup Password two succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordThree);
        ctx.assertTruthy("Add Dup Password three succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordFour);
        ctx.assertTruthy("Add Dup Password four succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordFive);
        ctx.assertTruthy("Add Dup Password five succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordSix);
        ctx.assertTruthy("Add Dup Password six succeeded", addPasswordSucceeded);

        ctx.assertTruthy("Dup password 1 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Dup password 2 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));
        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        await logIntoOfflineMode(mergingPasswordUpdatesTest, ctx);

        let passwordState = app.currentVault.passwordStore.cloneState();
        let retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordOne.id.value)!;
        retrievedPassword.value.domain.value = "first";
        retrievedPassword.value.email.value = "test@test.com";
        retrievedPassword.value.password.value = "updated";

        const beforePasswordsByIDUpdateTime = passwordState.passwordsByID.lastModifiedTime;
        const beforePasswordUpateTime = retrievedPassword.lastModifiedTime;
        const beforeDomainUpdateTime = retrievedPassword.value.domain.lastModifiedTime;
        const beforeEmailUpdateTime = retrievedPassword.value.email.lastModifiedTime;
        const beforePasswordUPdateTime = retrievedPassword.value.password.lastModifiedTime;

        let updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update Offline Password succeeded", updatePasswordSucceeded);

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordOne.id.value)!;

        const afterPasswordsByIDUpdateTime = passwordState.passwordsByID.lastModifiedTime;
        const afterPasswordUpateTime = retrievedPassword.lastModifiedTime;
        const afterDomainUpdateTime = retrievedPassword.value.domain.lastModifiedTime;
        const afterEmailUpdateTime = retrievedPassword.value.email.lastModifiedTime;
        const afterPasswordUPdateTime = retrievedPassword.value.password.lastModifiedTime;

        ctx.assertTruthy("PasswordsByID lastModifiedTime was updated after password update", afterPasswordsByIDUpdateTime > beforePasswordsByIDUpdateTime);
        ctx.assertTruthy("Password lastModifiedTime was updated after update", afterPasswordUpateTime > beforePasswordUpateTime);
        ctx.assertTruthy("Domain lastModifiedTime was updated after update", afterDomainUpdateTime > beforeDomainUpdateTime);
        ctx.assertTruthy("Email lastModifiedTime was updated after update", afterEmailUpdateTime > beforeEmailUpdateTime);
        ctx.assertTruthy("Password Password lastModifiedTime was updated after update", afterPasswordUPdateTime > beforePasswordUPdateTime);

        ctx.assertTruthy("Duplicate password one doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Duplicate password two doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));

        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordFive.id.value)!;
        retrievedPassword.value.password.value = "test 3";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update Offline Password succeeded", updatePasswordSucceeded);

        ctx.assertTruthy("Duplicate password 5 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Duplicate password 6 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordUpdatesTest, ctx);

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordOne.id.value)!;

        const result = await cryptHelper.decrypt(masterKey, retrievedPassword.value.password.value);
        ctx.assertEquals("retrieved password password was not updated", result.value, "Merging Updated Duplidate Password 1");
        ctx.assertEquals("retrieved password domain is empty", retrievedPassword.value.domain.value, "");
        ctx.assertEquals("retrieved password email is empty", retrievedPassword.value.domain.value, "");

        ctx.assertTruthy("Dup password 1 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Dup password 2 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));
        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        retrievedPassword.value.domain.value = "second";
        retrievedPassword.value.additionalInformation.value = "info";
        retrievedPassword.value.password.value = "updated 2";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update online Password succeeded", addPasswordSucceeded);

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordThree.id.value)!;
        retrievedPassword.value.password.value = "test 2";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update online Password succeeded", updatePasswordSucceeded);

        ctx.assertTruthy("Dup password 3 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordFive.id.value)!;
        retrievedPassword.value.password.value = "test 4";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update online Password 5 succeeded", updatePasswordSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordSix.id.value)!;
        retrievedPassword.value.password.value = "test 4";

        updatePasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, true, [], []);
        ctx.assertTruthy("Update online Password 6 succeeded", updatePasswordSucceeded);

        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        await swapToSecondDatabaseAndLogIn(mergingPasswordUpdatesTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(dupPasswordOne.id.value)!;

        const decryptResult = await cryptHelper.decrypt(masterKey, retrievedPassword.value.password.value);
        ctx.assertEquals("merged password password is updated 2", decryptResult.value, "updated 2");
        ctx.assertEquals("merged password domain is second", retrievedPassword.value.domain.value, "second");
        ctx.assertEquals("merged password email is test@test.com", retrievedPassword.value.email.value, "test@test.com");
        ctx.assertEquals("merged password info is info", retrievedPassword.value.additionalInformation.value, "info");

        // was deleted offline
        ctx.assertTruthy("merged duplicate password one doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("merged duplicate password two doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));

        // we deleted online
        ctx.assertTruthy("merged duplicate password three doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("merged duplicate password four doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        // was edited online after they were deleted offline, they should still be there
        ctx.assertTruthy("merged duplicate password 5 exist", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("merged duplicate password 6 exist", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));
    }
});

const mergingSecurityQuestionsUpdateTest = "Merging Updated Security Questions Works";
mergingDataTestSuite.tests.push({
    name: mergingSecurityQuestionsUpdateTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.login.value = "Merging Updated Security Questions Works";
        password.securityQuestions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            question: WebFieldConstructor.create("zero"),
            questionLength: WebFieldConstructor.create(0),
            answer: WebFieldConstructor.create("zero"),
            answerLength: WebFieldConstructor.create(0)
        }));

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password 1 succeeded", addPasswordSucceeded);

        const savedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("Password security question 1 id is set", savedPassword!.value.securityQuestions.value.get("1")!.id != undefined);
        ctx.assertTruthy("Password security question 1 id id is set", savedPassword!.value.securityQuestions.value.get("1")!.value.id.id != undefined);
        ctx.assertTruthy("Password security question 1 question id is set", savedPassword!.value.securityQuestions.value.get("1")!.value.question.id != undefined);
        ctx.assertTruthy("Password security question 1 questionLength id is set", savedPassword!.value.securityQuestions.value.get("1")!.value.questionLength.id != undefined);
        ctx.assertTruthy("Password security question 1 answer id is set", savedPassword!.value.securityQuestions.value.get("1")!.value.answer.id != undefined);
        ctx.assertTruthy("Password security question 1 answerLength id is set", savedPassword!.value.securityQuestions.value.get("1")!.value.answerLength.id != undefined);

        await logIntoOfflineMode(mergingSecurityQuestionsUpdateTest, ctx);

        let retrievedPassword: Field<Password> = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)));
        let securityQuestion = retrievedPassword.value.securityQuestions.value.get("1");
        securityQuestion!.value.question.value = "first";

        const updateOffline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, ["1"], []);
        ctx.assertTruthy("Add security question offline worked", updateOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsUpdateTest, ctx);

        retrievedPassword = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)));
        let decryptResult = await cryptHelper.decrypt(masterKey, retrievedPassword.value.securityQuestions.value.get("1")!.value.question.value);
        ctx.assertEquals("Retrieved Password security question isn't updated", decryptResult.value, "zero");

        securityQuestion = retrievedPassword.value.securityQuestions.value.get("1");
        securityQuestion!.value.question.value = "second";
        securityQuestion!.value.answer.value = "second";

        const updateOnline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, ["1"], ["1"]);
        ctx.assertTruthy("Add security question online worked", updateOnline);

        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsUpdateTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)!;
        securityQuestion = retrievedPassword.value.securityQuestions.value.get("1");

        const decryptedQuestion = await cryptHelper.decrypt(masterKey, securityQuestion!.value.question.value);
        const decryptedAnswer = await cryptHelper.decrypt(masterKey, securityQuestion!.value.answer.value);

        ctx.assertEquals("Merged Security Question question is second", decryptedQuestion.value, "second");
        ctx.assertEquals("Merged Security Question answer is second", decryptedAnswer.value, "second");
    }
});

const mergingValueUpdatesTest = "Merging Updated Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueUpdatesTest, func: async (ctx: TestContext) =>
    {
        const dupValueOne = defaultValue();
        dupValueOne.name.value = "MMerging Updated Duplidate Value 1";
        dupValueOne.value.value = "Merging Updated Duplidate Value 1";

        const dupValueTwo = defaultValue();
        dupValueTwo.name.value = "Merging Updated Duplicate Value 2";
        dupValueTwo.value.value = "Merging Updated Duplidate Value 1";

        const dupValueThree = defaultValue();
        dupValueThree.name.value = "MMerging Updated Duplidate Value 3";
        dupValueThree.value.value = "Merging Updated Duplidate Value 2";

        const dupValueFour = defaultValue();
        dupValueFour.name.value = "Merging Updated Duplicate Value 4";
        dupValueFour.value.value = "Merging Updated Duplidate Value 2";

        const dupValueFive = defaultValue();
        dupValueFive.name.value = "MMerging Updated Duplidate Value 5";
        dupValueFive.value.value = "Merging Updated Duplidate Value 3";

        const dupValueSix = defaultValue();
        dupValueSix.name.value = "Merging Updated Duplicate Value 6";
        dupValueSix.value.value = "Merging Updated Duplidate Value 3";

        let addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueOne);
        ctx.assertTruthy("Add Dup Value one succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueTwo);
        ctx.assertTruthy("Add Dup Value two succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueThree);
        ctx.assertTruthy("Add Dup Value three succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueFour);
        ctx.assertTruthy("Add Dup Value four succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueFive);
        ctx.assertTruthy("Add Dup Value five succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueSix);
        ctx.assertTruthy("Add Dup Value six succeeded", addValueSucceeded);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        await logIntoOfflineMode(mergingValueUpdatesTest, ctx);

        let valueState = app.currentVault.valueStore.cloneState();

        let retrievedValue = valueState.valuesByID.value.get(dupValueOne.id.value)!;
        retrievedValue.value.name.value = "first";
        retrievedValue.value.valueType.value = NameValuePairType.Passphrase;
        retrievedValue.value.value.value = "updated";

        let updateValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, true);

        ctx.assertTruthy("Update Offline Value succeeded", updateValueSucceeded);

        ctx.assertTruthy("Duplicate Value one doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Duplicate Value two doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));

        retrievedValue = valueState.valuesByID.value.get(dupValueFive.id.value)!;
        retrievedValue.value.value.value = "test 3";

        updateValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, true);
        ctx.assertTruthy("Update Offline Value succeeded", updateValueSucceeded);

        ctx.assertTruthy("Duplicate Value 5 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Duplicate Value 6 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingValueUpdatesTest, ctx);

        valueState = app.currentVault.valueStore.cloneState();
        retrievedValue = valueState.valuesByID.value.get(dupValueOne.id.value)!;

        let decryptedResult = await cryptHelper.decrypt(masterKey, retrievedValue.value.value.value);
        ctx.assertEquals("retrieved value value isn't updated", decryptedResult.value, "Merging Updated Duplidate Value 1");
        ctx.assertEquals("retrieved Value name isn't updated", retrievedValue.value.name.value, "MMerging Updated Duplidate Value 1");
        ctx.assertUndefined("retrieved Value valueType isn't updated", retrievedValue.value.valueType.value);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        retrievedValue.value.name.value = "second";
        retrievedValue.value.additionalInformation.value = "info";
        retrievedValue.value.value.value = "updated 2";

        updateValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, true);
        ctx.assertTruthy("Update online Value succeeded", addValueSucceeded);

        valueState = app.currentVault.valueStore.cloneState();
        retrievedValue = valueState.valuesByID.value.get(dupValueThree.id.value)!;
        retrievedValue.value.value.value = "test 2";

        updateValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, true);
        ctx.assertTruthy("Update online Value succeeded", updateValueSucceeded);

        ctx.assertTruthy("Dup Value 3 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("Dup Value 4 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));

        retrievedValue = valueState.valuesByID.value.get(dupValueFive.id.value)!;
        retrievedValue.value.value.value = "test 4";

        updateValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, true);
        ctx.assertTruthy("Update online Value 5 succeeded", updateValueSucceeded);

        retrievedValue = valueState.valuesByID.value.get(dupValueSix.id.value)!;
        retrievedValue.value.value.value = "test 4";

        updateValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, true);
        ctx.assertTruthy("Update online Value 6 succeeded", updateValueSucceeded);

        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        await swapToSecondDatabaseAndLogIn(mergingValueUpdatesTest, ctx);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(dupValueOne.id.value)!;
        decryptedResult = await cryptHelper.decrypt(masterKey, retrievedValue.value.value.value);

        ctx.assertEquals("merged value value is updated 2", decryptedResult.value, "updated 2");
        ctx.assertEquals("merged Value name is second", retrievedValue.value.name.value, "second");
        ctx.assertEquals("merged Value email is test@test.com", retrievedValue.value.valueType.value, NameValuePairType.Passphrase);
        ctx.assertEquals("merged Value info is info", retrievedValue.value.additionalInformation.value, "info");

        // was deleted offline
        ctx.assertTruthy("merged duplicate Value one doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("merged duplicate Value two doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));

        // we deleted online
        ctx.assertTruthy("merged duplicate Value three doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("merged duplicate Value four doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));

        // was edited online after they were deleted offline, they should still be there
        ctx.assertTruthy("merged duplicate Value 5 exist", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("merged duplicate Value 6 exist", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));
    }
});

const mergingFilterUpdatesTest = "Merging Updated Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterUpdatesTest, func: async (ctx: TestContext) =>
    {
        const filterOne = defaultFilter(DataType.Passwords);
        filterOne.name.value = "MMerging Updated Filter 1";

        const filterTwo = defaultFilter(DataType.Passwords);
        filterTwo.name.value = "Merging Updated Filter 2";

        const filterThree = defaultFilter(DataType.NameValuePairs);
        filterThree.name.value = "Merging Updated Filter 3";

        let addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterOne);
        ctx.assertTruthy("Add Filter one succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterTwo);
        ctx.assertTruthy("Add Filter two succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterThree);
        ctx.assertTruthy("Add Filter two succeeded", addFilterSucceeded);

        await logIntoOfflineMode(mergingFilterUpdatesTest, ctx);

        let filterState = app.currentVault.filterStore.cloneState();

        let retrievedFilter = filterState.passwordFiltersByID.value.get(filterOne.id.value)!;
        retrievedFilter.value.name.value = "first";

        let updateValueSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update Offline Filter 1 succeeded", updateValueSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filterTwo.id.value)!;
        retrievedFilter.value.name.value = "first";

        updateValueSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update Offline Filter 2 succeeded", updateValueSucceeded);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterUpdatesTest, ctx);

        filterState = app.currentVault.filterStore.cloneState();
        retrievedFilter = filterState.passwordFiltersByID.value.get(filterTwo.id.value)!;

        ctx.assertEquals("retrieved Filter name isn't updated", retrievedFilter.value.name.value, "Merging Updated Filter 2");

        retrievedFilter.value.name.value = "second";
        updateValueSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update Offline Filter 2 succeeded", updateValueSucceeded);

        retrievedFilter = filterState.valueFiltersByID.value.get(filterThree.id.value)!;

        retrievedFilter.value.name.value = "second";
        updateValueSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update Offline Filter 3 succeeded", updateValueSucceeded);

        await swapToSecondDatabaseAndLogIn(mergingFilterUpdatesTest, ctx);

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filterOne.id.value)!;
        ctx.assertEquals("merged Filter one name is first", retrievedFilter.value.name.value, "first");

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filterTwo.id.value)!;
        ctx.assertEquals("merged Filter two name is second", retrievedFilter.value.name.value, "second");

        retrievedFilter = app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filterThree.id.value)!;
        ctx.assertEquals("merged Filter three name is second", retrievedFilter.value.name.value, "second");
    }
});

const mergingFilterConditionsUpdateTest = "Merging Update Filter Conditions Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterConditionsUpdateTest, func: async (ctx: TestContext) =>
    {
        const filter = defaultFilter(DataType.Passwords);
        filter.name.value = "Merging Filter Conditions";
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("0"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("0")
        }));

        const addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add filter succeeded", addFilterSucceeded);

        await logIntoOfflineMode(mergingFilterConditionsUpdateTest, ctx);

        let retrievedFilter: Field<Filter> = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)));
        let filterCondition = retrievedFilter.value.conditions.value.get("1");
        filterCondition!.value.property.value = "first";
        filterCondition!.value.filterType.value = FilterConditionType.StartsWith;

        const updateOffline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter condiiton offline worked", updateOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsUpdateTest, ctx);

        retrievedFilter = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)));
        filterCondition = retrievedFilter.value.conditions.value.get("1");

        ctx.assertEquals("Filter Condition property isn't updated", filterCondition?.value.property.value, "0");

        filterCondition!.value.filterType.value = FilterConditionType.EndsWith;
        filterCondition!.value.value.value = "second";

        const updateOnline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter conditions online worked", updateOnline);

        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsUpdateTest, ctx);

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!;
        filterCondition = retrievedFilter.value.conditions.value.get("1");

        ctx.assertEquals("Merged filter condition property is first", filterCondition?.value.property.value, "first");
        ctx.assertEquals("Merged filter condition filterType is EndsWith", filterCondition?.value.filterType.value, FilterConditionType.EndsWith);
        ctx.assertEquals("Merged filter condition value is second", filterCondition?.value.value.value, "second");
    }
});

const mergingGroupUpdatesTest = "Merging Updated Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupUpdatesTest, func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.name.value = "MMerging Updated Group 1";

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.name.value = "Merging Updated Group 2";

        const groupThree = defaultGroup(DataType.NameValuePairs);
        groupThree.name.value = "Merging Updated Group 3";

        let addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupOne);
        ctx.assertTruthy("Add Group one succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupTwo);
        ctx.assertTruthy("Add Group two succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupThree);
        ctx.assertTruthy("Add Group two succeeded", addGroupSucceeded);

        await logIntoOfflineMode(mergingGroupUpdatesTest, ctx);

        let groupState = app.currentVault.groupStore.cloneState();

        let retrievedGroup = groupState.passwordGroupsByID.value.get(groupOne.id.value)!;
        retrievedGroup.value.name.value = "first";

        let updateValueSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update Offline Group 1 succeeded", updateValueSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(groupTwo.id.value)!;
        retrievedGroup.value.name.value = "first";

        updateValueSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update Offline Group 2 succeeded", updateValueSucceeded);

        await copyDatabaseAndLogIntoOnlineMode(mergingGroupUpdatesTest, ctx);

        groupState = app.currentVault.groupStore.cloneState();
        retrievedGroup = groupState.passwordGroupsByID.value.get(groupTwo.id.value)!;

        ctx.assertEquals("retrieved Group name isn't updated", retrievedGroup.value.name.value, "Merging Updated Group 2");

        retrievedGroup.value.name.value = "second";
        updateValueSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update Offline Group 2 succeeded", updateValueSucceeded);

        retrievedGroup = groupState.valueGroupsByID.value.get(groupThree.id.value)!;

        retrievedGroup.value.name.value = "second";
        updateValueSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update Offline Group 3 succeeded", updateValueSucceeded);

        await swapToSecondDatabaseAndLogIn(mergingGroupUpdatesTest, ctx);

        retrievedGroup = app.currentVault.groupStore.passwordGroupsByID.value.get(groupOne.id.value)!;
        ctx.assertEquals("merged Group one name is first", retrievedGroup.value.name.value, "first");

        retrievedGroup = app.currentVault.groupStore.passwordGroupsByID.value.get(groupTwo.id.value)!;
        ctx.assertEquals("merged Group two name is second", retrievedGroup.value.name.value, "second");

        retrievedGroup = app.currentVault.groupStore.valueGroupsByID.value.get(groupThree.id.value)!;
        ctx.assertEquals("merged Group three name is second", retrievedGroup.value.name.value, "second");
    }
});

const mergingPasswordDeleteTest = "Merging Deleted Passwords Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordDeleteTest, func: async (ctx: TestContext) =>
    {
        const dupPasswordOne = defaultPassword();
        dupPasswordOne.login.value = "MMerging Delete Duplidate Password 1";
        dupPasswordOne.password.value = "Merging Delete Duplidate Password 1";

        const dupPasswordTwo = defaultPassword();
        dupPasswordTwo.login.value = "Merging Delete Duplicate password 2";
        dupPasswordTwo.password.value = "Merging Delete Duplidate Password 1";

        const dupPasswordThree = defaultPassword();
        dupPasswordThree.login.value = "MMerging Delete Duplidate Password 3";
        dupPasswordThree.password.value = "Merging Delete Duplidate Password 2";

        const dupPasswordFour = defaultPassword();
        dupPasswordFour.login.value = "Merging Delete Duplicate password 4";
        dupPasswordFour.password.value = "Merging Delete Duplidate Password 2";

        const dupPasswordFive = defaultPassword();
        dupPasswordFive.login.value = "MMerging Delete Duplidate Password 5";
        dupPasswordFive.password.value = "Merging Delete Duplidate Password 3";

        const dupPasswordSix = defaultPassword();
        dupPasswordSix.login.value = "Merging Delete Duplicate password 6";
        dupPasswordSix.password.value = "Merging Delete Duplidate Password 3";

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordOne);
        ctx.assertTruthy("Add Dup Password one succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordTwo);
        ctx.assertTruthy("Add Dup Password two succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordThree);
        ctx.assertTruthy("Add Dup Password three succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordFour);
        ctx.assertTruthy("Add Dup Password four succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordFive);
        ctx.assertTruthy("Add Dup Password five succeeded", addPasswordSucceeded);

        addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, dupPasswordSix);
        ctx.assertTruthy("Add Dup Password six succeeded", addPasswordSucceeded);

        ctx.assertTruthy("Dup password 1 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Dup password 2 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));
        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        await logIntoOfflineMode(mergingPasswordDeleteTest, ctx);

        let passwordState = app.currentVault.passwordStore.cloneState();
        let retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordOne.id.value)!;

        let deletePasswordSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("Delete Offline Password 1 succeeded", deletePasswordSucceeded);

        ctx.assertTruthy("Duplicate password one doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Duplicate password two doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));

        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordTwo.id.value)!;
        retrievedPassword.value.domain.value = "updated";

        let updatedPasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Update online Password 2 succeeded", updatedPasswordSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordFive.id.value)!;

        deletePasswordSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("Delete Offline Password 5 succeeded", deletePasswordSucceeded);

        ctx.assertTruthy("Duplicate password 5 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Duplicate password 6 doesn't exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordDeleteTest, ctx);

        ctx.assertTruthy("password 1 exists", app.currentVault.passwordStore.passwordsByID.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("password 5 exists", app.currentVault.passwordStore.passwordsByID.value.has(dupPasswordFive.id.value));

        ctx.assertTruthy("Dup password 1 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("Dup password 2 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));
        ctx.assertTruthy("Dup password 3 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));
        ctx.assertTruthy("Dup password 5 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("Dup password 6 exists", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordTwo.id.value)!;

        deletePasswordSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("Delete online Password 2 succeeded", addPasswordSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordThree.id.value)!;

        deletePasswordSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("Delete online Password 3 succeeded", addPasswordSucceeded);

        passwordState = app.currentVault.passwordStore.cloneState();
        retrievedPassword = passwordState.passwordsByID.value.get(dupPasswordFive.id.value)!;
        retrievedPassword.value.domain.value = "test 2";

        updatedPasswordSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Update online Password succeeded", updatedPasswordSucceeded);

        ctx.assertTruthy("Dup password 3 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("Dup password 4 doesn't exists", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        await swapToSecondDatabaseAndLogIn(mergingPasswordDeleteTest, ctx);

        // was deleted offline
        ctx.assertTruthy("merged password one doesnt exist", !app.currentVault.passwordStore.passwordsByID.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("merged duplicate password one doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordOne.id.value));
        ctx.assertTruthy("merged duplicate password two doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordTwo.id.value));

        // was deleted online
        ctx.assertTruthy("merged password three doesnt exist", !app.currentVault.passwordStore.passwordsByID.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("merged duplicate password three doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordThree.id.value));
        ctx.assertTruthy("merged duplicate password four doesnt exist", !app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFour.id.value));

        // was edited offline but deleted online, should still be there since we can't know when it was deleted online
        ctx.assertTruthy("merged password 2 exists", app.currentVault.passwordStore.passwordsByID.value.has(dupPasswordTwo.id.value));

        // was edited online after it was deleted offline, it should still be there
        ctx.assertTruthy("merged password five exist", app.currentVault.passwordStore.passwordsByID.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("merged duplicate password 5 exist", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordFive.id.value));
        ctx.assertTruthy("merged duplicate password 6 exist", app.currentVault.passwordStore.duplicatePasswords.value.has(dupPasswordSix.id.value));
    }
});

const mergingSecurityQuestionsDeleteTest = "Merging Deleted Security Questions Works";
mergingDataTestSuite.tests.push({
    name: mergingSecurityQuestionsDeleteTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.login.value = "Merging Deleted Security Questions Works";
        password.securityQuestions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            question: WebFieldConstructor.create("zero"),
            questionLength: WebFieldConstructor.create(0),
            answer: WebFieldConstructor.create("zero"),
            answerLength: WebFieldConstructor.create(0)
        }));

        password.securityQuestions.value.set("2", WebFieldConstructor.create({
            id: WebFieldConstructor.create("2"),
            question: WebFieldConstructor.create("zero"),
            questionLength: WebFieldConstructor.create(0),
            answer: WebFieldConstructor.create("zero"),
            answerLength: WebFieldConstructor.create(0)
        }));

        password.securityQuestions.value.set("3", WebFieldConstructor.create({
            id: WebFieldConstructor.create("3"),
            question: WebFieldConstructor.create("zero"),
            questionLength: WebFieldConstructor.create(0),
            answer: WebFieldConstructor.create("zero"),
            answerLength: WebFieldConstructor.create(0)
        }));

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password 1 succeeded", addPasswordSucceeded);

        await logIntoOfflineMode(mergingSecurityQuestionsDeleteTest, ctx);

        let retrievedPassword: Field<Password> = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)));
        ctx.assertEquals("Password has 3 security questions", retrievedPassword.value.securityQuestions.value.size, 3);

        retrievedPassword.value.securityQuestions.value.delete("1");
        retrievedPassword.value.securityQuestions.value.delete("2");

        const updateOffline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Add security question offline worked", updateOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingSecurityQuestionsDeleteTest, ctx);

        retrievedPassword = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)));
        ctx.assertEquals("Password has 3 security questions", retrievedPassword.value.securityQuestions.value.size, 3);

        retrievedPassword.value.securityQuestions.value.get("2")!.value.answer.value = "updated";
        retrievedPassword.value.securityQuestions.value.delete("3");

        const updateOnline = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], ["2"]);
        ctx.assertTruthy("Add security question online worked", updateOnline);

        await swapToSecondDatabaseAndLogIn(mergingSecurityQuestionsDeleteTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value)!;

        ctx.assertTruthy("Merged Security Question one doesn't exist", !retrievedPassword.value.securityQuestions.value.has("1"));
        ctx.assertTruthy("Merged Security Question two does exist", retrievedPassword.value.securityQuestions.value.has("2"));
        ctx.assertTruthy("Merged Security Question three doesn't exist", !retrievedPassword.value.securityQuestions.value.has("3"));

        const securityQuestion = retrievedPassword.value.securityQuestions.value.get("2");
        const decryptedAnswer = await cryptHelper.decrypt(masterKey, securityQuestion!.value.answer.value);

        ctx.assertEquals("Merged Security Question answer is updated", decryptedAnswer.value, "updated");
    }
});

const mergingFilterGroupDeleteForPasswordTest = "Merging Deleted Filters / Groups for password Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupDeleteForPasswordTest, func: async (ctx: TestContext) =>
    {
        const password = defaultPassword();
        password.domain.value = "Merging Deleted Filters / Groups for password Works";
        password.password.value = "Merging Deleted Filters / Groups for password Works";
        password.email.value = "Merging Deleted Filters / Groups for password Works";
        password.passwordFor.value = "Merging Deleted Filters / Groups for password Works";
        password.additionalInformation.value = "Merging Deleted Filters / Groups for password Works";
        password.login.value = "Merging Deleted Filters / Groups for password Works";

        const filter = defaultFilter(DataType.Passwords);
        filter.name.value = "Merging Deleted Filters / Groups for password Works";
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("domain"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for password Works")
        }));

        const filter2 = defaultFilter(DataType.Passwords);
        filter2.name.value = "Merging Deleted Filters / Groups for password Works";
        filter2.conditions.value.set("2", WebFieldConstructor.create({
            id: WebFieldConstructor.create("2"),
            property: WebFieldConstructor.create("domain"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for password Works")
        }));

        const filter3 = defaultFilter(DataType.Passwords);
        filter3.name.value = "Merging Deleted Filters / Groups for password Works";
        filter3.conditions.value.set("3", WebFieldConstructor.create({
            id: WebFieldConstructor.create("3"),
            property: WebFieldConstructor.create("domain"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for password Works")
        }));

        const filter4 = defaultFilter(DataType.Passwords);
        filter4.name.value = "Merging Deleted Filters / Groups for password Works";
        filter4.conditions.value.set("4", WebFieldConstructor.create({
            id: WebFieldConstructor.create("4"),
            property: WebFieldConstructor.create("domain"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for password Works")
        }));

        const group = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Deleted Filters / Groups for password Works";

        const group2 = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Deleted Filters / Groups for password Works";

        const group3 = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Deleted Filters / Groups for password Works";

        const group4 = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Deleted Filters / Groups for password Works";

        let addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter 1 succeeded", addedFilterSucceeded);

        addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter2);
        ctx.assertTruthy("Add Filter 2 succeeded", addedFilterSucceeded);

        addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter3);
        ctx.assertTruthy("Add Filter 3 succeeded", addedFilterSucceeded);

        addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter4);
        ctx.assertTruthy("Add Filter 4 succeeded", addedFilterSucceeded);

        let addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group 1 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group2);
        ctx.assertTruthy("Add Group 2 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group3);
        ctx.assertTruthy("Add Group 3 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group4);
        ctx.assertTruthy("Add Group 4 succeeded", addedGroupSucceeded);

        password.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));
        password.groups.value.set(group2.id.value, WebFieldConstructor.create(group2.id.value));
        password.groups.value.set(group3.id.value, WebFieldConstructor.create(group3.id.value));
        password.groups.value.set(group4.id.value, WebFieldConstructor.create(group4.id.value));

        let addPasswordSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password);
        ctx.assertTruthy("Add Password succeeded", addPasswordSucceeded);

        await logIntoOfflineMode(mergingFilterGroupDeleteForPasswordTest, ctx);

        let retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("Retrieved Password exists", retrievedPassword);
        ctx.assertTruthy("offline password has filter 1", retrievedPassword?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("offline password has filter 2", retrievedPassword?.value.filters.value.has(filter2.id.value));
        ctx.assertTruthy("offline password has filter 3", retrievedPassword?.value.filters.value.has(filter3.id.value));
        ctx.assertTruthy("offline password has filter 4", retrievedPassword?.value.filters.value.has(filter4.id.value));

        ctx.assertTruthy("offline password has group 1", retrievedPassword?.value.groups.value.has(group.id.value));
        ctx.assertTruthy("offline password has group 2", retrievedPassword?.value.groups.value.has(group2.id.value));
        ctx.assertTruthy("offline password has group 3", retrievedPassword?.value.groups.value.has(group3.id.value));
        ctx.assertTruthy("offline password has group 4", retrievedPassword?.value.groups.value.has(group4.id.value));

        let filterState = app.currentVault.filterStore.cloneState();
        let retrievedFilter = filterState.passwordFiltersByID.value.get(filter.id.value);
        let deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 1 succeeded", deltedSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filter2.id.value);
        retrievedFilter!.value.name.value = "Updated";
        let updateSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter 2 offline succeeded", updateSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filter3.id.value);
        deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 3 offline succeeded", updateSucceeded);

        let groupState = app.currentVault.groupStore.cloneState();
        let retrievedGroup = groupState.passwordGroupsByID.value.get(group.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 1 succeeded", deltedSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(group2.id.value);
        retrievedGroup!.value.name.value = "Updated";
        updateSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update group 2 offline succeeded", updateSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(group3.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 3 offline succeeded", updateSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        ctx.assertTruthy("offline password doesn't have filter 1", !retrievedPassword?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("offline password has filter 2", retrievedPassword?.value.filters.value.has(filter2.id.value));
        ctx.assertTruthy("offline password doesn't have filter 3", !retrievedPassword?.value.filters.value.has(filter3.id.value));
        ctx.assertTruthy("offline password has filter 4", retrievedPassword?.value.filters.value.has(filter4.id.value));

        ctx.assertTruthy("offline password doesn't have group 1", !retrievedPassword?.value.groups.value.has(group.id.value));
        ctx.assertTruthy("offline password has group 2", retrievedPassword?.value.groups.value.has(group2.id.value));
        ctx.assertTruthy("offline password doesn't have group 3", !retrievedPassword?.value.groups.value.has(group3.id.value));
        ctx.assertTruthy("offline password has group 4", retrievedPassword?.value.groups.value.has(group4.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupDeleteForPasswordTest, ctx);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("online password has filter 1", retrievedPassword?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("online password has filter 2", retrievedPassword?.value.filters.value.has(filter2.id.value));
        ctx.assertTruthy("online password has filter 3", retrievedPassword?.value.filters.value.has(filter3.id.value));
        ctx.assertTruthy("online password has filter 4", retrievedPassword?.value.filters.value.has(filter4.id.value));

        ctx.assertTruthy("online password has group 1", retrievedPassword?.value.groups.value.has(group.id.value));
        ctx.assertTruthy("online password has group 2", retrievedPassword?.value.groups.value.has(group2.id.value));
        ctx.assertTruthy("online password has group 3", retrievedPassword?.value.groups.value.has(group3.id.value));
        ctx.assertTruthy("online password has group 4", retrievedPassword?.value.groups.value.has(group4.id.value));

        filterState = app.currentVault.filterStore.cloneState();

        retrievedFilter = filterState.passwordFiltersByID.value.get(filter2.id.value);
        deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 2 online succeeded", deltedSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filter3.id.value);
        retrievedFilter!.value.name.value = "Updated";
        updateSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter 3 online succeeded", updateSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filter4.id.value);
        deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 4 online succeeded", updateSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        groupState = app.currentVault.groupStore.cloneState();

        retrievedGroup = groupState.passwordGroupsByID.value.get(group2.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 1 online succeeded", deltedSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        retrievedGroup = groupState.passwordGroupsByID.value.get(group3.id.value);
        retrievedGroup!.value.name.value = "Updated";
        updateSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update group 3 online succeeded", updateSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        retrievedGroup = groupState.passwordGroupsByID.value.get(group4.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 4 online succeeded", updateSucceeded);

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);

        ctx.assertTruthy("online password has filter 1", retrievedPassword?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("online password doesn't have filter 2", !retrievedPassword?.value.filters.value.has(filter2.id.value));
        ctx.assertTruthy("online password has filter 3", retrievedPassword?.value.filters.value.has(filter3.id.value));
        ctx.assertTruthy("online password doesn't have filter 4", !retrievedPassword?.value.filters.value.has(filter4.id.value));

        ctx.assertTruthy("online password has group 1", retrievedPassword?.value.groups.value.has(group.id.value));
        ctx.assertTruthy("online password doesn't have group 2", !retrievedPassword?.value.groups.value.has(group2.id.value));
        ctx.assertTruthy("online password has group 3", retrievedPassword?.value.groups.value.has(group3.id.value));
        ctx.assertTruthy("online password doesn't have group 4", !retrievedPassword?.value.groups.value.has(group4.id.value));

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupDeleteForPasswordTest, ctx);

        ctx.assertTruthy("Filter 1 doesn't exist", !app.currentVault.filterStore.passwordFiltersByID.value.has(filter.id.value));
        ctx.assertTruthy("Filter 2 does exist", app.currentVault.filterStore.passwordFiltersByID.value.has(filter2.id.value));
        ctx.assertTruthy("Filter 3 does exist", app.currentVault.filterStore.passwordFiltersByID.value.has(filter3.id.value));
        ctx.assertTruthy("Filter 4 doesn't exist", !app.currentVault.filterStore.passwordFiltersByID.value.has(filter4.id.value));

        ctx.assertTruthy("Group 1 doesn't exist", !app.currentVault.groupStore.passwordGroupsByID.value.has(group.id.value));
        ctx.assertTruthy("Group 2 does exist", app.currentVault.groupStore.passwordGroupsByID.value.has(group2.id.value));
        ctx.assertTruthy("Group 3 does exist", app.currentVault.groupStore.passwordGroupsByID.value.has(group3.id.value));
        ctx.assertTruthy("Group 4 doesn't exist", !app.currentVault.groupStore.passwordGroupsByID.value.has(group4.id.value));

        retrievedPassword = app.currentVault.passwordStore.passwordsByID.value.get(password.id.value);
        ctx.assertTruthy("Password doesn't have filter 1", !retrievedPassword?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("Password does has filter 2", retrievedPassword?.value.filters.value.has(filter2.id.value));
        ctx.assertTruthy("Password does has filter 3", retrievedPassword?.value.filters.value.has(filter3.id.value));
        ctx.assertTruthy("Password doesn't have filter 4", !retrievedPassword?.value.filters.value.has(filter4.id.value));

        ctx.assertTruthy("Password doesn't have group 1", !retrievedPassword?.value.groups.value.has(group.id.value));
        ctx.assertTruthy("Password does has group 2", retrievedPassword?.value.groups.value.has(group2.id.value));
        ctx.assertTruthy("Password does has group 3", retrievedPassword?.value.groups.value.has(group3.id.value));
        ctx.assertTruthy("Password doesn't have group 4", !retrievedPassword?.value.groups.value.has(group4.id.value));
    }
});

const mergingFilterGroupDeleteForValueTest = "Merging Deleted Filters / Groups for value Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterGroupDeleteForValueTest, func: async (ctx: TestContext) =>
    {
        const Value = defaultValue();
        Value.name.value = "Merging Deleted Filters / Groups for Value Works";

        const filter = defaultFilter(DataType.NameValuePairs);
        filter.name.value = "Merging Deleted Filters / Groups for Value Works";
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("name"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for Value Works")
        }));

        const filter2 = defaultFilter(DataType.NameValuePairs);
        filter2.name.value = "Merging Deleted Filters / Groups for Value Works";
        filter2.conditions.value.set("2", WebFieldConstructor.create({
            id: WebFieldConstructor.create("2"),
            property: WebFieldConstructor.create("name"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for Value Works")
        }));

        const filter3 = defaultFilter(DataType.NameValuePairs);
        filter3.name.value = "Merging Deleted Filters / Groups for Value Works";
        filter3.conditions.value.set("3", WebFieldConstructor.create({
            id: WebFieldConstructor.create("3"),
            property: WebFieldConstructor.create("name"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for Value Works")
        }));

        const filter4 = defaultFilter(DataType.NameValuePairs);
        filter4.name.value = "Merging Deleted Filters / Groups for Value Works";
        filter4.conditions.value.set("4", WebFieldConstructor.create({
            id: WebFieldConstructor.create("4"),
            property: WebFieldConstructor.create("name"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Filters / Groups for Value Works")
        }));

        const group = defaultGroup(DataType.NameValuePairs);
        group.name.value = "Merging Added Group For Value";

        const group2 = defaultGroup(DataType.NameValuePairs);
        group.name.value = "Merging Added Group For Value";

        const group3 = defaultGroup(DataType.NameValuePairs);
        group.name.value = "Merging Added Group For Value";

        const group4 = defaultGroup(DataType.NameValuePairs);
        group.name.value = "Merging Added Group For Value";

        let addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter 1 succeeded", addedFilterSucceeded);

        addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter2);
        ctx.assertTruthy("Add Filter 2 succeeded", addedFilterSucceeded);

        addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter3);
        ctx.assertTruthy("Add Filter 3 succeeded", addedFilterSucceeded);

        addedFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter4);
        ctx.assertTruthy("Add Filter 4 succeeded", addedFilterSucceeded);

        let addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group 1 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group2);
        ctx.assertTruthy("Add Group 2 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group3);
        ctx.assertTruthy("Add Group 3 succeeded", addedGroupSucceeded);

        addedGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group4);
        ctx.assertTruthy("Add Group 4 succeeded", addedGroupSucceeded);

        Value.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));
        Value.groups.value.set(group2.id.value, WebFieldConstructor.create(group2.id.value));
        Value.groups.value.set(group3.id.value, WebFieldConstructor.create(group3.id.value));
        Value.groups.value.set(group4.id.value, WebFieldConstructor.create(group4.id.value));

        let addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, Value);
        ctx.assertTruthy("Add Value succeeded", addValueSucceeded);

        await logIntoOfflineMode(mergingFilterGroupDeleteForValueTest, ctx);

        let retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(Value.id.value);
        ctx.assertTruthy("Retrieved Value exists", retrievedValue);
        ctx.assertEquals("offline Value has 4 groups", retrievedValue?.value.groups.value.size, 4);
        ctx.assertEquals("offline Value has 4 filters", retrievedValue?.value.filters.value.size, 4);

        let filterState = app.currentVault.filterStore.cloneState();

        let retrievedFilter = filterState.valueFiltersByID.value.get(filter.id.value);
        let deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 1 succeeded", deltedSucceeded);

        retrievedFilter = filterState.valueFiltersByID.value.get(filter2.id.value);
        retrievedFilter!.value.name.value = "Updated";
        let updateSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter 2 offline succeeded", updateSucceeded);

        retrievedFilter = filterState.valueFiltersByID.value.get(filter3.id.value);
        deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 3 offline succeeded", updateSucceeded);

        let groupState = app.currentVault.groupStore.cloneState();

        let retrievedGroup = groupState.valueGroupsByID.value.get(group.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 1 succeeded", deltedSucceeded);

        retrievedGroup = groupState.valueGroupsByID.value.get(group2.id.value);
        retrievedGroup!.value.name.value = "Updated";
        updateSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update group 2 offline succeeded", updateSucceeded);

        retrievedGroup = groupState.valueGroupsByID.value.get(group3.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 3 offline succeeded", updateSucceeded);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(Value.id.value);
        ctx.assertEquals("Value only has 2 filters", retrievedValue?.value.filters.value.size, 2);
        ctx.assertEquals("Value only has 2 groups", retrievedValue?.value.groups.value.size, 2);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterGroupDeleteForValueTest, ctx);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(Value.id.value);
        ctx.assertEquals("online Value has 4 groups", retrievedValue?.value.groups.value.size, 4);
        ctx.assertEquals("onlilne Value has 4 filters", retrievedValue?.value.filters.value.size, 4);

        filterState = app.currentVault.filterStore.cloneState();

        retrievedFilter = filterState.valueFiltersByID.value.get(filter2.id.value);
        deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 2 online succeeded", deltedSucceeded);

        retrievedFilter = filterState.valueFiltersByID.value.get(filter3.id.value);
        retrievedFilter!.value.name.value = "Updated";
        updateSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter 3 online succeeded", updateSucceeded);

        retrievedFilter = filterState.valueFiltersByID.value.get(filter4.id.value);
        deltedSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete filter 4 online succeeded", updateSucceeded);

        groupState = app.currentVault.groupStore.cloneState();

        retrievedGroup = groupState.valueGroupsByID.value.get(group2.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 1 online succeeded", deltedSucceeded);

        retrievedGroup = groupState.valueGroupsByID.value.get(group3.id.value);
        retrievedGroup!.value.name.value = "Updated";
        updateSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update group 3 online succeeded", updateSucceeded);

        retrievedGroup = groupState.valueGroupsByID.value.get(group4.id.value);
        deltedSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete group 4 online succeeded", updateSucceeded);

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(Value.id.value);
        ctx.assertEquals("Value only has 2 filters", retrievedValue?.value.filters.value.size, 2);
        ctx.assertEquals("Value only has 2 groups", retrievedValue?.value.groups.value.size, 2);

        await swapToSecondDatabaseAndLogIn(mergingFilterGroupDeleteForValueTest, ctx);

        ctx.assertTruthy("Filter 1 doesn't exist", !app.currentVault.filterStore.nameValuePairFiltersByID.value.has(filter.id.value));
        ctx.assertTruthy("Filter 2 does exist", app.currentVault.filterStore.nameValuePairFiltersByID.value.has(filter2.id.value));
        ctx.assertTruthy("Filter 3 does exist", app.currentVault.filterStore.nameValuePairFiltersByID.value.has(filter3.id.value));
        ctx.assertTruthy("Filter 4 doesn't exist", !app.currentVault.filterStore.nameValuePairFiltersByID.value.has(filter4.id.value));

        ctx.assertTruthy("Group 1 doesn't exist", !app.currentVault.groupStore.valueGroupsByID.value.has(group.id.value));
        ctx.assertTruthy("Group 2 does exist", app.currentVault.groupStore.valueGroupsByID.value.has(group2.id.value));
        ctx.assertTruthy("Group 3 does exist", app.currentVault.groupStore.valueGroupsByID.value.has(group3.id.value));
        ctx.assertTruthy("Group 4 doesn't exist", !app.currentVault.groupStore.valueGroupsByID.value.has(group4.id.value));

        retrievedValue = app.currentVault.valueStore.nameValuePairsByID.value.get(Value.id.value);
        ctx.assertTruthy("Value doesn't has filter 1", !retrievedValue?.value.filters.value.has(filter.id.value));
        ctx.assertTruthy("Value does has filter 2", retrievedValue?.value.filters.value.has(filter2.id.value));
        ctx.assertTruthy("Value does has filter 3", retrievedValue?.value.filters.value.has(filter3.id.value));
        ctx.assertTruthy("Value doesn't has filter 4", !retrievedValue?.value.filters.value.has(filter4.id.value));

        ctx.assertTruthy("Value doesn't has group 1", !retrievedValue?.value.groups.value.has(group.id.value));
        ctx.assertTruthy("Value does has group 2", retrievedValue?.value.groups.value.has(group2.id.value));
        ctx.assertTruthy("Value does has group 3", retrievedValue?.value.groups.value.has(group3.id.value));
        ctx.assertTruthy("Value doesn't has group 4", !retrievedValue?.value.groups.value.has(group4.id.value));
    }
});

const mergingValueDeleteTest = "Merging Deleted Values Works";
mergingDataTestSuite.tests.push({
    name: mergingValueDeleteTest, func: async (ctx: TestContext) =>
    {
        const dupValueOne = defaultValue();
        dupValueOne.name.value = "MMerging Delete Duplidate Value 1";
        dupValueOne.value.value = "Merging Delete Duplidate Value 1";

        const dupValueTwo = defaultValue();
        dupValueTwo.name.value = "Merging Delete Duplicate Value 2";
        dupValueTwo.value.value = "Merging Delete Duplidate Value 1";

        const dupValueThree = defaultValue();
        dupValueThree.name.value = "MMerging Delete Duplidate Value 3";
        dupValueThree.value.value = "Merging Delete Duplidate Value 2";

        const dupValueFour = defaultValue();
        dupValueFour.name.value = "Merging Delete Duplicate Value 4";
        dupValueFour.value.value = "Merging Delete Duplidate Value 2";

        const dupValueFive = defaultValue();
        dupValueFive.name.value = "MMerging Delete Duplidate Value 5";
        dupValueFive.value.value = "Merging Delete Duplidate Value 3";

        const dupValueSix = defaultValue();
        dupValueSix.name.value = "Merging Delete Duplicate Value 6";
        dupValueSix.value.value = "Merging Delete Duplidate Value 3";

        let addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueOne);
        ctx.assertTruthy("Add Dup Value one succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueTwo);
        ctx.assertTruthy("Add Dup Value two succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueThree);
        ctx.assertTruthy("Add Dup Value three succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueFour);
        ctx.assertTruthy("Add Dup Value four succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueFive);
        ctx.assertTruthy("Add Dup Value five succeeded", addValueSucceeded);

        addValueSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, dupValueSix);
        ctx.assertTruthy("Add Dup Value six succeeded", addValueSucceeded);

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        await logIntoOfflineMode(mergingValueDeleteTest, ctx);

        let valueState = app.currentVault.valueStore.cloneState();
        let retrievedValue = valueState.valuesByID.value.get(dupValueOne.id.value)!;

        let deleteValueSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("Delete Offline Value 1 succeeded", deleteValueSucceeded);

        ctx.assertTruthy("Duplicate Value one doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Duplicate Value two doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));

        retrievedValue = valueState.valuesByID.value.get(dupValueTwo.id.value)!;
        retrievedValue.value.name.value = "updated";

        let updatedValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, false);
        ctx.assertTruthy("Update online Value 2 succeeded", updatedValueSucceeded);

        retrievedValue = valueState.valuesByID.value.get(dupValueFive.id.value)!;

        deleteValueSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("Delete Offline Value 5 succeeded", deleteValueSucceeded);

        ctx.assertTruthy("Duplicate Value 5 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Duplicate Value 6 doesn't exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        await copyDatabaseAndLogIntoOnlineMode(mergingValueDeleteTest, ctx);

        ctx.assertTruthy("Value 1 exists", app.currentVault.valueStore.nameValuePairsByID.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Value 5 exists", app.currentVault.valueStore.nameValuePairsByID.value.has(dupValueFive.id.value));

        ctx.assertTruthy("Dup Value 1 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("Dup Value 2 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));
        ctx.assertTruthy("Dup Value 3 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("Dup Value 4 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));
        ctx.assertTruthy("Dup Value 5 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("Dup Value 6 exists", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));

        valueState = app.currentVault.valueStore.cloneState();
        retrievedValue = valueState.valuesByID.value.get(dupValueTwo.id.value)!;

        deleteValueSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("Delete online Value 2 succeeded", addValueSucceeded);

        retrievedValue = valueState.valuesByID.value.get(dupValueThree.id.value)!;

        deleteValueSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("Delete online Value 3 succeeded", addValueSucceeded);

        valueState = app.currentVault.valueStore.cloneState();
        retrievedValue = valueState.valuesByID.value.get(dupValueFive.id.value)!;
        retrievedValue.value.name.value = "test 2";

        updatedValueSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, false);
        ctx.assertTruthy("Update online Value succeeded", updatedValueSucceeded);

        ctx.assertTruthy("Dup Value 3 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("Dup Value 4 doesn't exists", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));

        await swapToSecondDatabaseAndLogIn(mergingValueDeleteTest, ctx);

        // was deleted offline
        ctx.assertTruthy("merged Value one doesnt exist", !app.currentVault.valueStore.nameValuePairsByID.value.has(dupValueOne.id.value));
        ctx.assertTruthy("merged duplicate Value one doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueOne.id.value));
        ctx.assertTruthy("merged duplicate Value two doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueTwo.id.value));

        // was deleted online
        ctx.assertTruthy("merged Value three doesnt exist", !app.currentVault.valueStore.nameValuePairsByID.value.has(dupValueThree.id.value));
        ctx.assertTruthy("merged duplicate Value three doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueThree.id.value));
        ctx.assertTruthy("merged duplicate Value four doesnt exist", !app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFour.id.value));

        // was edited offline but deleted online, should still be there since we can't know when it was deleted online
        ctx.assertTruthy("merged Value 2 exists", app.currentVault.valueStore.nameValuePairsByID.value.has(dupValueTwo.id.value));

        // was edited online after it was deleted offline, it should still be there
        ctx.assertTruthy("merged Value five exist", app.currentVault.valueStore.nameValuePairsByID.value.has(dupValueFive.id.value));
        ctx.assertTruthy("merged duplicate Value 5 exist", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueFive.id.value));
        ctx.assertTruthy("merged duplicate Value 6 exist", app.currentVault.valueStore.duplicateNameValuePairs.value.has(dupValueSix.id.value));
    }
});

const mergingFilterDeleteTest = "Merging Deleted Filters Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterDeleteTest, func: async (ctx: TestContext) =>
    {
        const filterOne = defaultFilter(DataType.Passwords);
        filterOne.name.value = "MMerging Updated Filter 1";

        const filterTwo = defaultFilter(DataType.Passwords);
        filterTwo.name.value = "Merging Updated Filter 2";

        const filterThree = defaultFilter(DataType.Passwords);
        filterThree.name.value = "Merging Updated Filter 3";

        const filterFour = defaultFilter(DataType.Passwords);
        filterFour.name.value = "Merging Updated Filter 4";

        let addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterOne);
        ctx.assertTruthy("Add Filter one succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterTwo);
        ctx.assertTruthy("Add Filter two succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterThree);
        ctx.assertTruthy("Add Filter three succeeded", addFilterSucceeded);

        addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filterFour);
        ctx.assertTruthy("Add Filter four succeeded", addFilterSucceeded);

        ctx.assertTruthy("Filter 1 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterOne.id.value));
        ctx.assertTruthy("Filter 2 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterTwo.id.value));
        ctx.assertTruthy("Filter 3 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterThree.id.value));
        ctx.assertTruthy("Filter 4 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterFour.id.value));

        ctx.assertTruthy("Filter 1 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterOne.id.value));
        ctx.assertTruthy("Filter 2 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterTwo.id.value));
        ctx.assertTruthy("Filter 3 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterThree.id.value));
        ctx.assertTruthy("Filter 4 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterFour.id.value));

        await logIntoOfflineMode(mergingFilterDeleteTest, ctx);

        let filterState = app.currentVault.filterStore.cloneState();

        let retrievedFilter = filterState.passwordFiltersByID.value.get(filterOne.id.value)!;
        let deleteValueSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete Offline Filter 1 succeeded", deleteValueSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filterTwo.id.value)!;
        retrievedFilter.value.name.value = "updated";

        let updateValueSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update Offline Filter 2 succeeded", updateValueSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filterThree.id.value)!;
        deleteValueSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete Offline Filter 3 succeeded", deleteValueSucceeded);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterDeleteTest, ctx);

        ctx.assertTruthy("Filter 1 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterOne.id.value));
        ctx.assertTruthy("Filter 2 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterTwo.id.value));
        ctx.assertTruthy("Filter 3 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterThree.id.value));
        ctx.assertTruthy("Filter 4 is a duplicate", app.currentVault.filterStore.duplicatePasswordFilters.value.has(filterFour.id.value));

        ctx.assertTruthy("Filter 1 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterOne.id.value));
        ctx.assertTruthy("Filter 2 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterTwo.id.value));
        ctx.assertTruthy("Filter 3 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterThree.id.value));
        ctx.assertTruthy("Filter 4 is empty", app.currentVault.filterStore.emptyPasswordFilters.value.has(filterFour.id.value));

        filterState = app.currentVault.filterStore.cloneState();

        retrievedFilter = filterState.passwordFiltersByID.value.get(filterTwo.id.value)!;
        deleteValueSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete online Filter 2 succeeded", deleteValueSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filterThree.id.value)!;
        retrievedFilter.value.name.value = "updated";
        updateValueSucceeded = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("updated online Filter 3 succeeded", updateValueSucceeded);

        retrievedFilter = filterState.passwordFiltersByID.value.get(filterFour.id.value)!;
        deleteValueSucceeded = await app.currentVault.filterStore.deleteFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Delete online Filter 4 succeeded", deleteValueSucceeded);

        await swapToSecondDatabaseAndLogIn(mergingFilterDeleteTest, ctx);

        ctx.assertTruthy("merged Filter one doesn't exist", !app.currentVault.filterStore.passwordFiltersByID.value.has(filterOne.id.value));
        ctx.assertTruthy("merged Filter two does exist", app.currentVault.filterStore.passwordFiltersByID.value.has(filterTwo.id.value));
        ctx.assertTruthy("merged Filter three does exist", app.currentVault.filterStore.passwordFiltersByID.value.has(filterThree.id.value));
        ctx.assertTruthy("merged Filter four doesn't exist", !app.currentVault.filterStore.passwordFiltersByID.value.has(filterFour.id.value));
    }
});

const mergingFilterConditionsDeleteTest = "Merging Deleted Filter Conditions Works";
mergingDataTestSuite.tests.push({
    name: mergingFilterConditionsDeleteTest, func: async (ctx: TestContext) =>
    {
        const filter = defaultFilter(DataType.Passwords);
        filter.name.value = "Merging Filter Conditions";
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("0"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("0")
        }));

        filter.conditions.value.set("2", WebFieldConstructor.create({
            id: WebFieldConstructor.create("2"),
            property: WebFieldConstructor.create("0"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("0")
        }));

        filter.conditions.value.set("3", WebFieldConstructor.create({
            id: WebFieldConstructor.create("3"),
            property: WebFieldConstructor.create("0"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("0")
        }));

        filter.conditions.value.set("4", WebFieldConstructor.create({
            id: WebFieldConstructor.create("4"),
            property: WebFieldConstructor.create("0"),
            filterType: WebFieldConstructor.create(FilterConditionType.Contains),
            value: WebFieldConstructor.create("0")
        }));

        const addFilterSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add filter succeeded", addFilterSucceeded);

        await logIntoOfflineMode(mergingFilterConditionsDeleteTest, ctx);

        let retrievedFilter: Field<Filter> = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)));
        retrievedFilter.value.conditions.value.delete("1");

        let filterCondition = retrievedFilter.value.conditions.value.get("2");
        filterCondition!.value.value.value = "updated";

        retrievedFilter.value.conditions.value.delete("3");

        const updateOffline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter condiiton offline worked", updateOffline);

        await copyDatabaseAndLogIntoOnlineMode(mergingFilterConditionsDeleteTest, ctx);

        retrievedFilter = JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)));
        retrievedFilter.value.conditions.value.delete("2");

        filterCondition = retrievedFilter.value.conditions.value.get("3");
        filterCondition!.value.value.value = "updated";

        retrievedFilter.value.conditions.value.delete("4");

        const updateOnline = await app.currentVault.filterStore.updateFilter(masterKey, retrievedFilter!.value);
        ctx.assertTruthy("Update filter conditions online worked", updateOnline);

        await swapToSecondDatabaseAndLogIn(mergingFilterConditionsDeleteTest, ctx);

        retrievedFilter = app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!;

        ctx.assertTruthy("Merged Filter condition doesn't have id 1", !retrievedFilter.value.conditions.value.has("1"));
        ctx.assertTruthy("Merged Filter condition does have id 2", retrievedFilter.value.conditions.value.has("2"));
        ctx.assertTruthy("Merged Filter condition does have id 3", retrievedFilter.value.conditions.value.has("3"));
        ctx.assertTruthy("Merged Filter condition doesn't have id 4", !retrievedFilter.value.conditions.value.has("4"));
    }
});

const mergingGroupDeleteTest = "Merging Deleted Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingGroupDeleteTest, func: async (ctx: TestContext) =>
    {
        const groupOne = defaultGroup(DataType.Passwords);
        groupOne.name.value = "MMerging Updated Group 1";

        const groupTwo = defaultGroup(DataType.Passwords);
        groupTwo.name.value = "Merging Updated Group 2";

        const groupThree = defaultGroup(DataType.Passwords);
        groupThree.name.value = "Merging Updated Group 3";

        const groupFour = defaultGroup(DataType.Passwords);
        groupFour.name.value = "Merging Updated Group 4";

        let addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupOne);
        ctx.assertTruthy("Add Group one succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupTwo);
        ctx.assertTruthy("Add Group two succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupThree);
        ctx.assertTruthy("Add Group three succeeded", addGroupSucceeded);

        addGroupSucceeded = await app.currentVault.groupStore.addGroup(masterKey, groupFour);
        ctx.assertTruthy("Add Group four succeeded", addGroupSucceeded);

        ctx.assertTruthy("Group 1 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupOne.id.value));
        ctx.assertTruthy("Group 2 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupTwo.id.value));
        ctx.assertTruthy("Group 3 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupThree.id.value));
        ctx.assertTruthy("Group 4 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupFour.id.value));

        ctx.assertTruthy("Group 1 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupOne.id.value));
        ctx.assertTruthy("Group 2 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupTwo.id.value));
        ctx.assertTruthy("Group 3 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupThree.id.value));
        ctx.assertTruthy("Group 4 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupFour.id.value));

        await logIntoOfflineMode(mergingGroupDeleteTest, ctx);

        let groupState = app.currentVault.groupStore.cloneState();

        let retrievedGroup = groupState.passwordGroupsByID.value.get(groupOne.id.value)!;
        let deleteValueSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete Offline Group 1 succeeded", deleteValueSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(groupTwo.id.value)!;
        retrievedGroup.value.name.value = "updated";

        let updateValueSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Update Offline Group 2 succeeded", updateValueSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(groupThree.id.value)!;
        deleteValueSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete Offline Group 3 succeeded", deleteValueSucceeded);

        await copyDatabaseAndLogIntoOnlineMode(mergingGroupDeleteTest, ctx);

        ctx.assertTruthy("Group 1 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupOne.id.value));
        ctx.assertTruthy("Group 2 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupTwo.id.value));
        ctx.assertTruthy("Group 3 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupThree.id.value));
        ctx.assertTruthy("Group 4 is a duplicate", app.currentVault.groupStore.duplicatePasswordGroups.value.has(groupFour.id.value));

        ctx.assertTruthy("Group 1 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupOne.id.value));
        ctx.assertTruthy("Group 2 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupTwo.id.value));
        ctx.assertTruthy("Group 3 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupThree.id.value));
        ctx.assertTruthy("Group 4 is empty", app.currentVault.groupStore.emptyPasswordGroups.value.has(groupFour.id.value));

        groupState = app.currentVault.groupStore.cloneState();

        retrievedGroup = groupState.passwordGroupsByID.value.get(groupTwo.id.value)!;
        deleteValueSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete online Group 2 succeeded", deleteValueSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(groupThree.id.value)!;
        retrievedGroup.value.name.value = "updated";
        updateValueSucceeded = await app.currentVault.groupStore.updateGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("updated online Group 3 succeeded", updateValueSucceeded);

        retrievedGroup = groupState.passwordGroupsByID.value.get(groupFour.id.value)!;
        deleteValueSucceeded = await app.currentVault.groupStore.deleteGroup(masterKey, retrievedGroup!.value);
        ctx.assertTruthy("Delete online Group 4 succeeded", deleteValueSucceeded);

        await swapToSecondDatabaseAndLogIn(mergingGroupDeleteTest, ctx);

        ctx.assertTruthy("merged Group one doesn't exist", !app.currentVault.groupStore.passwordGroupsByID.value.has(groupOne.id.value));
        ctx.assertTruthy("merged Group two does exist", app.currentVault.groupStore.passwordGroupsByID.value.has(groupTwo.id.value));
        ctx.assertTruthy("merged Group three does exist", app.currentVault.groupStore.passwordGroupsByID.value.has(groupThree.id.value));
        ctx.assertTruthy("merged Group four doesn't exist", !app.currentVault.groupStore.passwordGroupsByID.value.has(groupFour.id.value));
    }
});

const mergingPasswordDeletesForGroupFilterTest = "Merging Deleted Password for Filters / Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingPasswordDeletesForGroupFilterTest, func: async (ctx: TestContext) =>
    {
        const group = defaultGroup(DataType.Passwords);
        group.name.value = "Merging Deleted Password for Filters / Groups Works";

        const filter = defaultFilter(DataType.Passwords);
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("domain"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Password for Filters / Groups Works")
        }));

        let addSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group succeeded", addSucceeded);

        addSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter succeeded", addSucceeded);

        const password1 = defaultPassword();
        password1.domain.value = "Merging Deleted Password for Filters / Groups Works";
        password1.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        const password2 = defaultPassword();
        password2.domain.value = "Merging Deleted Password for Filters / Groups Works";
        password2.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        const password3 = defaultPassword();
        password3.domain.value = "Merging Deleted Password for Filters / Groups Works";
        password3.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        const password4 = defaultPassword();
        password4.domain.value = "Merging Deleted Password for Filters / Groups Works";
        password4.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        addSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password1);
        ctx.assertTruthy("Add Password 1 succeeded", addSucceeded);

        addSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password2);
        ctx.assertTruthy("Add Password 2 succeeded", addSucceeded);

        addSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password3);
        ctx.assertTruthy("Add Password 3 succeeded", addSucceeded);

        addSucceeded = await app.currentVault.passwordStore.addPassword(masterKey, password4);
        ctx.assertTruthy("Add Password 4 succeeded", addSucceeded);

        ctx.assertEquals("Group has 4 passwords", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)!.value.passwords.value.size, 4);
        ctx.assertEquals("Filter has 4 passwords", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!.value.passwords.value.size, 4);

        await logIntoOfflineMode(mergingPasswordDeletesForGroupFilterTest, ctx);

        let passwordState = app.currentVault.passwordStore.cloneState();

        let retrievedPassword = passwordState.passwordsByID.value.get(password1.id.value);
        let deleteSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("Delete password 1 succeeded", deleteSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(password2.id.value);
        retrievedPassword!.value.login.value = "Updated Merging Deleted Password for Filters / Groups Works 2";

        let updatedSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Updated password 2 succeeded", updatedSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(password3.id.value);
        deleteSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("Delete password 3 succeeded", deleteSucceeded);

        await copyDatabaseAndLogIntoOnlineMode(mergingPasswordDeletesForGroupFilterTest, ctx);

        ctx.assertEquals("Group has 4 passwords", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)!.value.passwords.value.size, 4);
        ctx.assertEquals("Filter has 4 passwords", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!.value.passwords.value.size, 4);

        passwordState = app.currentVault.passwordStore.cloneState();

        retrievedPassword = passwordState.passwordsByID.value.get(password2.id.value);
        deleteSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("deleted password 2 succeeded", updatedSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(password3.id.value);
        retrievedPassword!.value.login.value = "Updated Merging Deleted Password for Filters / Groups Works 3";

        updatedSucceeded = await app.currentVault.passwordStore.updatePassword(masterKey, retrievedPassword!.value, false, [], []);
        ctx.assertTruthy("Updated password 3 succeeded", updatedSucceeded);

        retrievedPassword = passwordState.passwordsByID.value.get(password4.id.value);
        deleteSucceeded = await app.currentVault.passwordStore.deletePassword(masterKey, retrievedPassword!.value);
        ctx.assertTruthy("deleted password 4 succeeded", updatedSucceeded);

        await swapToSecondDatabaseAndLogIn(mergingPasswordDeletesForGroupFilterTest, ctx);

        ctx.assertTruthy("Password 1 doesn't exist", !app.currentVault.passwordStore.passwordsByID.value.has(password1.id.value));
        ctx.assertTruthy("Password 2 does exist", app.currentVault.passwordStore.passwordsByID.value.has(password2.id.value));
        ctx.assertTruthy("Password 3 does exist", app.currentVault.passwordStore.passwordsByID.value.has(password3.id.value));
        ctx.assertTruthy("Password 4 doesn't exist", !app.currentVault.passwordStore.passwordsByID.value.has(password4.id.value));

        ctx.assertTruthy("Group doesn't have password 1", !app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)!.value.passwords.value.has(password1.id.value));
        ctx.assertTruthy("Group has password 2", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)!.value.passwords.value.has(password2.id.value));
        ctx.assertTruthy("Group has password 3", app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)!.value.passwords.value.has(password3.id.value));
        ctx.assertTruthy("Group doesn't have password 4", !app.currentVault.groupStore.passwordGroupsByID.value.get(group.id.value)!.value.passwords.value.has(password4.id.value));

        ctx.assertTruthy("Filter doesn't have password 1", !app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!.value.passwords.value.has(password1.id.value));
        ctx.assertTruthy("Filter has password 2", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!.value.passwords.value.has(password2.id.value));
        ctx.assertTruthy("Filter has password 3", app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!.value.passwords.value.has(password3.id.value));
        ctx.assertTruthy("Filter doesn't have password 4", !app.currentVault.filterStore.passwordFiltersByID.value.get(filter.id.value)!.value.passwords.value.has(password4.id.value));
    }
});

const mergingValueDeletesForGroupFilterTest = "Merging Deleted Values for Filters / Groups Works";
mergingDataTestSuite.tests.push({
    name: mergingValueDeletesForGroupFilterTest, func: async (ctx: TestContext) =>
    {
        const group = defaultGroup(DataType.NameValuePairs);
        group.name.value = "Merging Deleted Values for Filters / Groups Works";

        const filter = defaultFilter(DataType.NameValuePairs);
        filter.conditions.value.set("1", WebFieldConstructor.create({
            id: WebFieldConstructor.create("1"),
            property: WebFieldConstructor.create("name"),
            filterType: WebFieldConstructor.create(FilterConditionType.EqualTo),
            value: WebFieldConstructor.create("Merging Deleted Values for Filters / Groups Works")
        }));

        let addSucceeded = await app.currentVault.groupStore.addGroup(masterKey, group);
        ctx.assertTruthy("Add Group succeeded", addSucceeded);

        addSucceeded = await app.currentVault.filterStore.addFilter(masterKey, filter);
        ctx.assertTruthy("Add Filter succeeded", addSucceeded);

        const value1 = defaultValue();
        value1.name.value = "Merging Deleted Values for Filters / Groups Works";
        value1.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        const value2 = defaultValue();
        value2.name.value = "Merging Deleted Values for Filters / Groups Works";
        value2.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        const value3 = defaultValue();
        value3.name.value = "Merging Deleted Values for Filters / Groups Works";
        value3.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        const value4 = defaultValue();
        value4.name.value = "Merging Deleted Values for Filters / Groups Works";
        value4.groups.value.set(group.id.value, WebFieldConstructor.create(group.id.value));

        addSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, value1);
        ctx.assertTruthy("Add Value 1 succeeded", addSucceeded);

        addSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, value2);
        ctx.assertTruthy("Add Value 2 succeeded", addSucceeded);

        addSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, value3);
        ctx.assertTruthy("Add Value 3 succeeded", addSucceeded);

        addSucceeded = await app.currentVault.valueStore.addNameValuePair(masterKey, value4);
        ctx.assertTruthy("Add Value 4 succeeded", addSucceeded);

        ctx.assertEquals("Group has 4 values", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)!.value.values.value.size, 4);
        ctx.assertEquals("Filter has 4 values", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)!.value.values.value.size, 4);

        await logIntoOfflineMode(mergingValueDeletesForGroupFilterTest, ctx);

        let valueState = app.currentVault.valueStore.cloneState();

        let retrievedValue = valueState.valuesByID.value.get(value1.id.value);
        let deleteSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("Delete Value 1 succeeded", deleteSucceeded);

        retrievedValue = valueState.valuesByID.value.get(value2.id.value);
        retrievedValue!.value.valueType.value = NameValuePairType.Passcode;

        let updatedSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, false);
        ctx.assertTruthy("Updated Value 2 succeeded", updatedSucceeded);

        retrievedValue = valueState.valuesByID.value.get(value3.id.value);
        deleteSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("Delete Value 3 succeeded", deleteSucceeded);

        await copyDatabaseAndLogIntoOnlineMode(mergingValueDeletesForGroupFilterTest, ctx);

        ctx.assertEquals("Group has 4 values", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)!.value.values.value.size, 4);
        ctx.assertEquals("Filter has 4 values", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)!.value.values.value.size, 4);

        valueState = app.currentVault.valueStore.cloneState();

        retrievedValue = valueState.valuesByID.value.get(value2.id.value);
        deleteSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("deleted Value 2 succeeded", updatedSucceeded);

        retrievedValue = valueState.valuesByID.value.get(value3.id.value);
        retrievedValue!.value.valueType.value = NameValuePairType.Information;

        updatedSucceeded = await app.currentVault.valueStore.updateNameValuePair(masterKey, retrievedValue!.value, false);
        ctx.assertTruthy("Updated Value 3 succeeded", updatedSucceeded);

        retrievedValue = valueState.valuesByID.value.get(value4.id.value);
        deleteSucceeded = await app.currentVault.valueStore.deleteNameValuePair(masterKey, retrievedValue!.value);
        ctx.assertTruthy("deleted Value 4 succeeded", updatedSucceeded);

        await swapToSecondDatabaseAndLogIn(mergingValueDeletesForGroupFilterTest, ctx);

        ctx.assertTruthy("Value 1 doesn't exist", !app.currentVault.valueStore.nameValuePairsByID.value.has(value1.id.value));
        ctx.assertTruthy("Value 2 does exist", app.currentVault.valueStore.nameValuePairsByID.value.has(value2.id.value));
        ctx.assertTruthy("Value 3 does exist", app.currentVault.valueStore.nameValuePairsByID.value.has(value3.id.value));
        ctx.assertTruthy("Value 4 doesn't exist", !app.currentVault.valueStore.nameValuePairsByID.value.has(value4.id.value));

        ctx.assertTruthy("Group doesn't have Value 1", !app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)!.value.values.value.has(value1.id.value));
        ctx.assertTruthy("Group has Value 2", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)!.value.values.value.has(value2.id.value));
        ctx.assertTruthy("Group has Value 3", app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)!.value.values.value.has(value3.id.value));
        ctx.assertTruthy("Group doesn't have Value 4", !app.currentVault.groupStore.valueGroupsByID.value.get(group.id.value)!.value.values.value.has(value4.id.value));

        ctx.assertTruthy("Filter doesn't have Value 1", !app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)!.value.values.value.has(value1.id.value));
        ctx.assertTruthy("Filter has Value 2", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)!.value.values.value.has(value2.id.value));
        ctx.assertTruthy("Filter has Value 3", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)!.value.values.value.has(value3.id.value));
        ctx.assertTruthy("Filter doesn't have Value 4", !app.currentVault.filterStore.nameValuePairFiltersByID.value.get(filter.id.value)!.value.values.value.has(value4.id.value));
    }
});

export default mergingDataTestSuite;