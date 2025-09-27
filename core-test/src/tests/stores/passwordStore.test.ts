import cryptHelper from '@renderer/Helpers/cryptHelper';
import createReactivePassword from '@renderer/Objects/Stores/ReactivePassword';
import { createTestSuite, TestSuites, type TestContext } from '@lib/test';
import app from "@renderer/Objects/Stores/AppStore";
import { Password, defaultPassword, Group, defaultGroup, DataType, Filter, defaultFilter, FilterConditionType, SecurityQuestion } from '@renderer/Types/DataTypes';
import userManager from '@lib/userManager';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

let passwordStoreSuite = createTestSuite("Password Store", TestSuites.PasswordStore);

function getSafePasswords()
{
    return app.currentVault.passwordStore.passwords.filter(p => !p.w &&
        !app.currentVault.passwordStore.duplicatePasswords[p.id] &&
        !p.c && !p.isOld());
}

passwordStoreSuite.tests.push({
    name: "PasswordStore Add Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "PasswordStore Add Works";
        password.e = "Email@Email";
        password.d = "www.domain.com";
        password.p = "Password";
        password.f = "PasswordFor";
        password.a = "AdditionalInformation";

        const securityQuestion: SecurityQuestion =
        {
            id: "SecurityQuestion",
            q: "Question",
            a: "Answer",
        };

        password.q[securityQuestion.id] = securityQuestion;

        await userManager.defaultUser.addPassword("Add Password", ctx, password, [securityQuestion]);
        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];

        const decryptedPassword = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedPassword.p);
        const decryptedSecurityQuesitonQuestion = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedPassword.q[securityQuestion.id]!.q);
        const decryptedSecurityQuesitonAnswer = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, retrievedPassword.q[securityQuestion.id]!.a);

        ctx.assertTruthy("ID is set", retrievedPassword.id);
        ctx.assertEquals("Login is correct", retrievedPassword.l, "PasswordStore Add Works");
        ctx.assertEquals("Email is correct", retrievedPassword.e, "Email@Email");
        ctx.assertEquals("Domain is correct", retrievedPassword.d, "www.domain.com");
        ctx.assertEquals("Password is correct", decryptedPassword.value, "Password");
        ctx.assertEquals("PasswordFor is correct", retrievedPassword.f, "PasswordFor");
        ctx.assertEquals("AdditionalInformation is correct", retrievedPassword.a, "AdditionalInformation");

        ctx.assertEquals("One Security Question", OH.size(retrievedPassword.q), 1);
        ctx.assertEquals("Decrypted security question question", decryptedSecurityQuesitonQuestion.value, "Question");
        ctx.assertEquals("Decrypted security question answer", decryptedSecurityQuesitonAnswer.value, "Answer");
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Add", func: async (ctx: TestContext) =>
    {
        const weakPassword: Password = defaultPassword();
        weakPassword.l = "OJpmbp4on894h89jhog";
        weakPassword.p = "weak";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.l = "beponjioNSOIGw";
        duplicatePassword.p = "weak";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.l = "PasswordStore Metrics Work After Add";
        containsLoginPassword.p = "PasswordStore Metrics Work After Add Test";

        await userManager.defaultUser.addPassword("Add Weak Password", ctx, weakPassword);

        const retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        await userManager.defaultUser.addPassword("Add Duplicate Password", ctx, duplicatePassword);

        const duplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords[duplicatePassword.id];
        const duplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords[weakPassword.id];

        ctx.assertTruthy("Duplicate password one exists", duplicatePasswordOne[weakPassword.id]);
        ctx.assertTruthy("Duplicate password two exists", duplicatePasswordTwo[duplicatePassword.id]);

        await userManager.defaultUser.addPassword("Add Contains Login Password", ctx, containsLoginPassword);

        const retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safePassword: Password = defaultPassword();
        safePassword.l = "GLSVBvlinwoigjnioolnguiq3lnneilrun";
        safePassword.p = "FS:nvw2nvioshsoijhvhoVnlweuw159y98hoivGSHLViNSBuign[p[1";

        const unsafePassword: Password = defaultPassword();
        unsafePassword.l = "lnljolwhiwlnSNDfbuiho2tto27";
        unsafePassword.p = "weak";

        await userManager.defaultUser.addPassword("Add Safe Password", ctx, safePassword);

        ctx.assertEquals("Safe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswordsCurrent[app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Safe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1],
            getSafePasswords().length);

        await userManager.defaultUser.addPassword("Add Unsafe Password", ctx, unsafePassword);

        ctx.assertEquals("Unsafe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswordsCurrent[app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Unsafe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add With Group Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "VNwelnbwiono;imgo;mbio";

        const group: Group = defaultGroup(DataType.Passwords);
        group.n = "PasswordStore Add With Group Works";
        group.c = "#FFFFFF";

        await userManager.defaultUser.addGroup("Add Group", ctx, group);

        password.g[group.id] = true;

        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        const retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword.g[retrievedGroup.id]);
        ctx.assertTruthy("Group has password id", retrievedGroup.p[retrievedPassword.id]);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add With Filter Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "PasswordStore Add With Filter Works";

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.n = "PasswordStore Add With Filter Works";
        filter.c["PasswordStore Add With Filter Works"] = 
        {
            id: "PasswordStore Add With Filter Works",
            p: "l",
            t: FilterConditionType.EqualTo,
            v: "PasswordStore Add With Filter Works"
        };

        await userManager.defaultUser.addFilter("Add Filter", ctx, filter);
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        const retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password has filter id", retrievedPassword.i[retrievedFilter.id]);
        ctx.assertTruthy("Filter has password id", retrievedFilter.p[retrievedPassword.id]);
    }
});

passwordStoreSuite.tests.push({
    name: 'PasswordStore Update works', func: async (ctx: TestContext) => 
    {
        const originalLogin = "TestUpdateWorksLogin";

        const password: Password = defaultPassword();
        password.l = originalLogin;

        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const newLogin = "Test Update Works New Login";
        const newDomin = "New Domain";
        const newEmail = "New Email";
        const newPasswordFor = "New Password For";
        const newAdditionalInfo = "New Additional Info";

        const editablePassword = userManager.defaultUser.getEditablePassword(password.id);

        editablePassword.dataType.l = newLogin;
        editablePassword.dataType.d = newDomin;
        editablePassword.dataType.e = newEmail;
        editablePassword.dataType.f = newPasswordFor;
        editablePassword.dataType.a = newAdditionalInfo;

        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, false, [], [], [], [], editablePassword.dataType.g);

        const oldPassword = app.currentVault.passwordStore.passwords.filter(p => p.l == originalLogin);
        ctx.assertEquals("Password doesn't exist", oldPassword.length, 0);

        const updatedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertEquals("New Login", updatedPassword[0].l, newLogin);
        ctx.assertEquals("New Domain", updatedPassword[0].d, newDomin);
        ctx.assertEquals("New Email", updatedPassword[0].e, newEmail);
        ctx.assertEquals("New Password For", updatedPassword[0].f, newPasswordFor);
        ctx.assertEquals("New Additional Info", updatedPassword[0].a, newAdditionalInfo);
    }
});

passwordStoreSuite.tests.push({
    name: 'Update password works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "ijvLOSvniowemwmiophjh";
        password.p = "Original Password";

        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const editablePassword = userManager.defaultUser.getEditablePassword(password.id);

        const newPassword = "New Password";
        editablePassword.dataType.p = newPassword;

        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, true, [], [], [], [], editablePassword.dataType.g);
        const updatedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);

        const decryptedNewPassword = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, updatedPassword[0].p);
        ctx.assertEquals("New Password", decryptedNewPassword.value, newPassword);
    }
});

passwordStoreSuite.tests.push({
    name: 'Update security question works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "Update security question works 1";
        const securityQuestion: SecurityQuestion =
        {
            id: "SecurityQuestion",
            q: "Question",
            a: "Answer",
        };

        password.q[securityQuestion.id] = securityQuestion;

        const password2: Password = defaultPassword();
        password2.l = "Update security question works 2";
        const securityQuestion2: SecurityQuestion =
        {
            id: "SecurityQuestion2",
            q: "Question2",
            a: "Answer2",
        };

        password2.q[securityQuestion2.id] = securityQuestion2;

        await userManager.defaultUser.addPassword("Add Password", ctx, password, [securityQuestion]);
        await userManager.defaultUser.addPassword("Add Password", ctx, password2, [securityQuestion2]);

        const newQuesiton = "UpdatedQuesiton";
        const newAnswer = "UpdatedAnswer";

        const editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        editablePassword.dataType.q[securityQuestion.id].q = newQuesiton;
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, false, [], [editablePassword.dataType.q[securityQuestion.id]], [], [], editablePassword.dataType.g);
        
        const editablePassword2 = userManager.defaultUser.getEditablePassword(password2.id);
        editablePassword2.dataType.q[securityQuestion2.id].a = newAnswer;
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword2, false, [], [], [editablePassword2.dataType.q[securityQuestion2.id]], [], editablePassword2.dataType.g);

        const updatedPassword1 = app.currentVault.passwordStore.passwordsByID[password.id];
        const updatedPassword2 = app.currentVault.passwordStore.passwordsByID[password2.id];

        const decryptedQuestion = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, updatedPassword1!.q[securityQuestion.id]!.q);
        const decryptedAnswer = await cryptHelper.decrypt(userManager.defaultUser.vaulticKey, updatedPassword2!.q[securityQuestion2.id]!.a);

        ctx.assertEquals("New Question is correct", decryptedQuestion.value, newQuesiton);
        ctx.assertEquals("New Answer is correct", decryptedAnswer.value, newAnswer);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Update", func: async (ctx: TestContext) =>
    {
        const strongPassword = "VNLinlsdhfklahsn]p][2p359jgjvlSHDGuilhwluihgwuieghl";
        const weakPassword: Password = defaultPassword();
        weakPassword.p = "weak";
        weakPassword.l = "MetricsWorkAfterUpdate";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.p = strongPassword;
        duplicatePassword.l = "MVowemiogwnoigninlgnqilnhn";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.l = "PasswordStore Metrics Work After Update";
        containsLoginPassword.p = "PasswordStore Metrics Work After Update 123";

        await userManager.defaultUser.addPassword("Add weak Password", ctx, weakPassword);

        let retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        let editableWeakPassword = userManager.defaultUser.getEditablePassword(weakPassword.id);
        editableWeakPassword.dataType.p = "newWeak";
        await userManager.defaultUser.updatePassword("Update Password", ctx, editableWeakPassword, true, [], [], [], [], editableWeakPassword.dataType.g);

        retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        editableWeakPassword = userManager.defaultUser.getEditablePassword(weakPassword.id);
        editableWeakPassword.dataType.p = strongPassword;
        await userManager.defaultUser.updatePassword("Update Password", ctx, editableWeakPassword, true, [], [], [], [], editableWeakPassword.dataType.g);

        retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password doesn't exists", retrievedWeakPassword.length, 0);

        await userManager.defaultUser.addPassword("Add duplicate Password", ctx, duplicatePassword);

        let retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords[duplicatePassword.id];
        let retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords[weakPassword.id];

        ctx.assertTruthy("Duplicate password one exists", retrievedDuplicatePasswordOne[weakPassword.id]);
        ctx.assertTruthy("Duplicate password two exists", retrievedDuplicatePasswordTwo[duplicatePassword.id]);

        let editableDuplicatePassword = userManager.defaultUser.getEditablePassword(duplicatePassword.id);
        editableDuplicatePassword.dataType.p = "VNlowehnglwhgaljksgio;ajsoitjw;ojtoj9285u29utjioijl";

        await userManager.defaultUser.updatePassword("Update Password", ctx, editableDuplicatePassword, true, [], [], [], [], editableDuplicatePassword.dataType.g);

        retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords[duplicatePassword.id];
        retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords[weakPassword.id];

        ctx.assertUndefined("Duplicate password one doesn't exists", retrievedDuplicatePasswordOne);
        ctx.assertUndefined("Duplicate password two doesn't exists", retrievedDuplicatePasswordTwo);

        await userManager.defaultUser.addPassword("Add contains login Password", ctx, containsLoginPassword);

        let retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);

        let editableContainsLoginPassword = userManager.defaultUser.getEditablePassword(containsLoginPassword.id);
        editableContainsLoginPassword.dataType.p = "VNkjnvjkNvkljXNVjkxnvkjnjksdbjksdbkjsbkjbkj2iu52985u28][";
        await userManager.defaultUser.updatePassword("Update Password", ctx, editableContainsLoginPassword, true, [], [], [], [], editableContainsLoginPassword.dataType.g);

        retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password doesn't exists", retrievedContainsLoginPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.p = "JSL:KDvjiowno2j0ijsosjsdkS:jvi23hg2uhlsf";
        password.l = "Vmwoeipvnio2nhiohnlkng3lnhhi3";

        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        editablePassword.dataType.p = "unsafe";
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, true, [], [], [], [], editablePassword.dataType.g);

        ctx.assertEquals("Unsafe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswordsCurrent[app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Unsafe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1],
            getSafePasswords().length);

        editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        editablePassword.dataType.p = "sdvlaioashvlSDLhbislhi2h892upt9jslinp[k2pop3tk2pyj";
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, true, [], [], [], [], editablePassword.dataType.g);

        ctx.assertEquals("Safe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswordsCurrent[app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Safe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update With Groups Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "MVpmvio2mbomomjpjgpwjogwhergg";
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const group: Group = defaultGroup(DataType.Passwords);
        group.n = "PasswordStore Update With Group Works";
        group.c = "#FFFFFF";

        await userManager.defaultUser.addGroup("Add Group", ctx, group);

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        editablePassword.dataType.g[group.id] = true;
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, false, [], [], [], [], editablePassword.dataType.g);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        let retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword.g[retrievedGroup.id]);
        ctx.assertTruthy("Group has password id", retrievedGroup.p[retrievedPassword.id]);

        editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, false, [], [], [], [], {});

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password doesn't have group id", !retrievedPassword.g[retrievedGroup.id]);
        ctx.assertTruthy("Group doesn't have password id", !retrievedGroup.p[retrievedPassword.id]);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update With Filters Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "UpdateWithFilterWorks--NoFilter";

        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.n = "PasswordStore Update With Filter Works";
        filter.c["Id"] = {
            id: "Id",
            p: "l",
            t: FilterConditionType.EqualTo,
            v: "UpdateWithFilterWorks--Filter"
        };

        await userManager.defaultUser.addFilter("Add Filter", ctx, filter);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        ctx.assertUndefined("Password doesn't have filter", retrievedPassword.i[filter.id]);

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        editablePassword.dataType.l = "UpdateWithFilterWorks--Filter";
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, false, [], [], [], [], editablePassword.dataType.g);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        let retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password has filter id", retrievedPassword.i[retrievedFilter.id]);
        ctx.assertTruthy("Filter has password id", retrievedFilter.p[retrievedPassword.id]);

        editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        editablePassword.dataType.l = "UpdateWithFilterWorks--NoFilter";
        await userManager.defaultUser.updatePassword("Update Password", ctx, editablePassword, false, [], [], [], [], editablePassword.dataType.g);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id)[0];
        retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password doesn't have filter id", !retrievedPassword.i[retrievedFilter.id]);
        ctx.assertTruthy("Filter doesn't have password id", !retrievedFilter.p[retrievedPassword.id]);
    }
});

passwordStoreSuite.tests.push({
    name: 'Delete works', func: async (ctx: TestContext) => 
    {
        const password: Password = defaultPassword();
        password.p = "JSL:KDvjiowno2j0ijsosjsdkS:jvi23hg2uhlsf";
        password.l = "vmOVKmweopbmoibniohwigh8goho2hti2";

        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertTruthy("Password Exists", retrievedPassword[0]);

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editablePassword.dataType);

        const deletedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertEquals("Password Deleted", deletedPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: 'Delete security question works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.l = "Update security question works 1";
        const securityQuestion: SecurityQuestion =
        {
            id: "SecurityQuestion",
            q: "Question",
            a: "Answer",
        };

        const securityQuestion2: SecurityQuestion =
        {
            id: "SecurityQuestion2",
            q: "Question2",
            a: "Answer2",
        };

        password.q[securityQuestion.id] = securityQuestion;
        password.q[securityQuestion2.id] = securityQuestion2;

        await userManager.defaultUser.addPassword("Add Password", ctx, password, [securityQuestion, securityQuestion2]);

        const editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        await userManager.defaultUser.updatePassword("Delete seurity question 1", ctx, editablePassword, false, [], [], [], ["SecurityQuestion"], editablePassword.dataType.g);

        const updatedPassword = app.currentVault.passwordStore.passwordsByID[password.id];
        ctx.assertTruthy("Security question 1 doesn't exist", !updatedPassword?.q[securityQuestion.id]);
        ctx.assertTruthy("Security question 2 exists", updatedPassword?.q[securityQuestion2.id]);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Delete", func: async (ctx: TestContext) =>
    {
        const weakPassword: Password = defaultPassword();
        weakPassword.p = "weak";
        weakPassword.l = "MVlsd;mvl;mkln2jtigohgoh";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.p = "weak";
        duplicatePassword.l = "uigiwhgshioadsjvoavmobn";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.l = "PasswordStore Metrics Work After Delete";
        containsLoginPassword.p = "PasswordStore Metrics Work After Delete 123";

        await userManager.defaultUser.addPassword("Add Password", ctx, weakPassword);

        let retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        await userManager.defaultUser.addPassword("Add Password", ctx, duplicatePassword);

        let retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords[duplicatePassword.id];
        let retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords[weakPassword.id];

        ctx.assertTruthy("Duplicate password one exists", retrievedDuplicatePasswordOne[weakPassword.id]);
        ctx.assertTruthy("Duplicate password two exists", retrievedDuplicatePasswordTwo[duplicatePassword.id]);

        let editableWeakPassword = userManager.defaultUser.getEditablePassword(weakPassword.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editableWeakPassword.dataType);

        let editableDuplicatePassword = userManager.defaultUser.getEditablePassword(duplicatePassword.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editableDuplicatePassword.dataType);

        retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password doesn't exists", retrievedWeakPassword.length, 0);

        retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords[duplicatePassword.id];
        retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords[weakPassword.id];

        ctx.assertUndefined("Duplicate password one doesn't exists", retrievedDuplicatePasswordOne);
        ctx.assertUndefined("Duplicate password two doesn't exists", retrievedDuplicatePasswordTwo);

        await userManager.defaultUser.addPassword("Add Password", ctx, containsLoginPassword);

        let retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);

        let editableContainsLoginPassword = userManager.defaultUser.getEditablePassword(containsLoginPassword.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editableContainsLoginPassword.dataType);

        retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password doesn't exists", retrievedContainsLoginPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.p = "JSL:KDvjiowno2j0ijsosjsdkS:jvi23hg2uhlsf";
        password.l = "lmommoniNVInweuiobwiogbw";

        await userManager.defaultUser.addPassword("Add Password", ctx, password);
        password.p = "unsafe";

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editablePassword.dataType);

        ctx.assertEquals("Correct current",
            app.currentVault.passwordStore.currentAndSafePasswordsCurrent[app.currentVault.passwordStore.currentAndSafePasswordsCurrent.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Correct safe",
            app.currentVault.passwordStore.currentAndSafePasswordsSafe[app.currentVault.passwordStore.currentAndSafePasswordsSafe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete With Groups Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.p = "JSL:KDvjiowno2j0ijsosjsdkS:jvi23hg2uhlsf";
        password.l = "Mqmiovwnvionbigh2uioghoighug";

        const group: Group = defaultGroup(DataType.Passwords);
        group.n = "PasswordStore Delete With Group Works";
        group.c = "#FFFFFF";

        await userManager.defaultUser.addGroup("Add Group", ctx, group);
        password.g[group.id] = true;
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        let retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword[0]);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword[0].g[retrievedGroup.id]);
        ctx.assertTruthy("Group has password id", retrievedGroup.p[retrievedPassword[0].id]);

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editablePassword.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Password doesn't exists", retrievedPassword.length, 0);
        ctx.assertTruthy("Group doesn't have password id", OH.size(retrievedGroup.p) == 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete With Filters Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.p = "JSL:KDvjiowno2j0ijsosjsdkS:jvi23hg2uhlsf";
        password.l = "DeleteWithFilterWorks";

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.n = "PasswordStore Update With Filter Works";
        filter.c["l"] = 
        {
            id: "l",
            p: "l",
            t: FilterConditionType.EqualTo,
            v: "DeleteWithFilterWorks"
        };

        await userManager.defaultUser.addFilter("Add Filter", ctx, filter);
        await userManager.defaultUser.addPassword("Add Password", ctx, password);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        let retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password has filter id", retrievedPassword[0].i[retrievedFilter.id]);
        ctx.assertTruthy("Filter has password id", retrievedFilter.p[retrievedPassword[0].id]);

        let editablePassword = userManager.defaultUser.getEditablePassword(password.id);
        await userManager.defaultUser.deletePassword("Delete Password", ctx, editablePassword.dataType);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id == password.id);
        retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password doesn't exists", retrievedPassword.length, 0);
        ctx.assertTruthy("Filter doesn't have password id", OH.size(retrievedFilter.p) == 0);
    }
});

export default passwordStoreSuite;