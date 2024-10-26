import cryptHelper from '../../src/core/Helpers/cryptHelper';
import createReactivePassword from '../../src/core/Objects/Stores/ReactivePassword';
import { createTestSuite, type TestContext } from '../test';
import app from "../../src/core/Objects/Stores/AppStore";
import { Password, defaultPassword, Group, defaultGroup, DataType, Filter, defaultFilter, FilterConditionType, SecurityQuestion } from '../../src/core/Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

let passwordStoreSuite = createTestSuite("Password Store");

const masterKey = "test";

function getSafePasswords()
{
    return app.currentVault.passwordStore.passwords.filter(p => !p.isWeak && !app.currentVault.passwordStore.duplicatePasswords.value.includes(p.id.value) && !p.containsLogin && !p.isOld);
}

passwordStoreSuite.tests.push({
    name: "PasswordStore Add Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "PasswordStore Add Works";
        password.email.value = "Email@Email";
        password.domain.value = "www.domain.com";
        password.password.value = "Password";
        password.passwordFor.value = "PasswordFor";
        password.additionalInformation.value = "AdditionalInformation";

        const sequrityQuestion: SecurityQuestion =
        {
            id: new Field("SecurityQuestion"),
            question: "Question",
            questionLength: 0,
            answer: "Answer",
            answerLength: 0
        };

        password.securityQuestions.value.push(sequrityQuestion);

        await app.currentVault.passwordStore.addPassword(masterKey, password);
        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0];

        const decryptedPassword = await cryptHelper.decrypt(masterKey, retrievedPassword.password.value);
        const decryptedSecurityQuesitonQuestion = await cryptHelper.decrypt(masterKey, retrievedPassword.securityQuestions.value[0].question);
        const decryptedSecurityQuesitonAnswer = await cryptHelper.decrypt(masterKey, retrievedPassword.securityQuestions.value[0].answer);

        ctx.assertEquals("Login is correct", retrievedPassword.login.value, "PasswordStore Add Works");
        ctx.assertEquals("Email is correct", retrievedPassword.email.value, "Email@Email");
        ctx.assertEquals("Domain is correct", retrievedPassword.domain.value, "www.domain.com");
        ctx.assertEquals("Password is correct", decryptedPassword.value, "Password");
        ctx.assertEquals("PasswordFor is correct", retrievedPassword.passwordFor.value, "PasswordFor");
        ctx.assertEquals("PasswordLength is correct", retrievedPassword.passwordLength.value, 8);
        ctx.assertEquals("AdditionalInformation is correct", retrievedPassword.additionalInformation.value, "AdditionalInformation");

        ctx.assertEquals("One Security Question", retrievedPassword.securityQuestions.value.length, 1);
        ctx.assertEquals("Decrypted security question question", decryptedSecurityQuesitonQuestion.value, "Question");
        ctx.assertEquals("Decrypted security question answer", decryptedSecurityQuesitonAnswer.value, "Answer");
        ctx.assertEquals("Answer Length", retrievedPassword.securityQuestions.value[0].answerLength, 6);
        ctx.assertEquals("Question Length", retrievedPassword.securityQuestions.value[0].questionLength, 8);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Add", func: async (ctx: TestContext) =>
    {
        const weakPassword: Password = defaultPassword();
        weakPassword.login.value = "OJpmbp4on894h89jhog";
        weakPassword.password.value = "weak";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.login.value = "beponjioNSOIGw";
        duplicatePassword.password.value = "weak";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.login.value = "PasswordStore Metrics Work After Add";
        containsLoginPassword.password.value = "PasswordStore Metrics Work After Add Test";

        await app.currentVault.passwordStore.addPassword(masterKey, weakPassword);

        const retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        await app.currentVault.passwordStore.addPassword(masterKey, duplicatePassword);

        const retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id.value);
        const retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Duplicate password one exists", retrievedDuplicatePasswordOne.length, 1);
        ctx.assertEquals("Duplicate password two exists", retrievedDuplicatePasswordTwo.length, 1);

        await app.currentVault.passwordStore.addPassword(masterKey, containsLoginPassword);

        const retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id.value);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safePassword: Password = defaultPassword();
        safePassword.login.value = "GLSVBvlinwoigjnioolnguiq3lnneilrun";
        safePassword.password.value = "FS:nvw2nvioshsoijhvhoVnlweuw159y98hoivGSHLViNSBuign[p[1";

        const unsafePassword: Password = defaultPassword();
        unsafePassword.login.value = "lnljolwhiwlnSNDfbuiho2tto27";
        unsafePassword.password.value = "weak";

        await app.currentVault.passwordStore.addPassword(masterKey, safePassword);

        ctx.assertEquals("Safe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswords.current[app.currentVault.passwordStore.currentAndSafePasswords.current.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Safe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswords.safe[app.currentVault.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);

        await app.currentVault.passwordStore.addPassword(masterKey, unsafePassword);

        ctx.assertEquals("Unsafe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswords.current[app.currentVault.passwordStore.currentAndSafePasswords.current.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Unsafe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswords.safe[app.currentVault.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add With Group Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "VNwelnbwiono;imgo;mbio";

        const group: Group = defaultGroup(DataType.Passwords);
        group.name.value = "PasswordStore Add With Group Works";
        group.color.value = "#FFFFFF";

        await app.currentVault.groupStore.addGroup(masterKey, group);

        password.groups.value.set(group.id.value, new Field(group.id.value));

        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0];
        const retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword.groups.value.has(retrievedGroup.id.value));
        ctx.assertTruthy("Group has password id", retrievedGroup.passwords.value.has(retrievedPassword.id.value));
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add With Filter Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "PasswordStore Add With Filter Works";

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.name.value = "PasswordStore Add With Filter Works";
        filter.conditions.value.push({
            id: new Field("PasswordStore Add With Filter Works"),
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: "PasswordStore Add With Filter Works"
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0];
        const retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password has filter id", retrievedPassword.filters.value.has(retrievedFilter.id.value));
        ctx.assertTruthy("Filter has password id", retrievedFilter.passwords.value.has(retrievedPassword.id.value));
    }
});

passwordStoreSuite.tests.push({
    name: 'PasswordStore Update works', func: async (ctx: TestContext) => 
    {
        const originalLogin = "TestUpdateWorksLogin";

        const password: Password = defaultPassword();
        password.login.value = originalLogin;

        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const newLogin = "Test Update Works New Login";
        const newDomin = "New Domain";
        const newEmail = "New Email";
        const newPasswordFor = "New Password For";
        const newAdditionalInfo = "New Additional Info";

        password.login.value = newLogin;
        password.domain.value = newDomin;
        password.email.value = newEmail;
        password.passwordFor.value = newPasswordFor;
        password.additionalInformation.value = newAdditionalInfo;

        await app.currentVault.passwordStore.updatePassword(masterKey, password, false, [], []);

        const oldPassword = app.currentVault.passwordStore.passwords.filter(p => p.login.value == originalLogin);
        ctx.assertEquals("Password doesn't exist", oldPassword.length, 0);

        const updatedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        ctx.assertEquals("New Login", updatedPassword[0].login.value, newLogin);
        ctx.assertEquals("New Domain", updatedPassword[0].domain.value, newDomin);
        ctx.assertEquals("New Email", updatedPassword[0].email.value, newEmail);
        ctx.assertEquals("New Password For", updatedPassword[0].passwordFor.value, newPasswordFor);
        ctx.assertEquals("New Additional Info", updatedPassword[0].additionalInformation.value, newAdditionalInfo);
    }
});

passwordStoreSuite.tests.push({
    name: 'Update password works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "ijvLOSvniowemwmiophjh";
        password.password.value = "Original Password";

        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const newPassword = "New Password";
        password.password.value = newPassword;

        await app.currentVault.passwordStore.updatePassword(masterKey, password, true, [], []);
        const updatedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);

        const decryptedNewPassword = await cryptHelper.decrypt(masterKey, updatedPassword[0].password.value);
        ctx.assertEquals("New Password", decryptedNewPassword.value, newPassword);
    }
});

passwordStoreSuite.tests.push({
    name: 'Update security question works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "MVOmewpobwjbiophniones";
        const securityQuestion: SecurityQuestion =
        {
            id: new Field("SecurityQuestion"),
            question: "Question",
            questionLength: 0,
            answer: "Answer",
            answerLength: 0
        };

        password.securityQuestions.value.push(securityQuestion);

        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const newQuesiton = "UpdatedQuesiton";
        const newAnswer = "UpdatedAnswer";

        password.securityQuestions.value[0].question = newQuesiton;
        password.securityQuestions.value[0].answer = newAnswer;

        await app.currentVault.passwordStore.updatePassword(masterKey, password, false, [securityQuestion.id.value], [securityQuestion.id.value]);
        const updatedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);

        const decryptedAnswer = await cryptHelper.decrypt(masterKey, updatedPassword[0].securityQuestions.value[0].answer);

        ctx.assertEquals("New Answer", decryptedAnswer.value, newAnswer);
        ctx.assertEquals("Answer Length", updatedPassword[0].securityQuestions.value[0].answerLength, newAnswer.length);
        ctx.assertEquals("Question Length", updatedPassword[0].securityQuestions.value[0].questionLength, newQuesiton.length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Update", func: async (ctx: TestContext) =>
    {
        const strongPassword = "VNLinlsdhfklahsn]p][2p359jgjvlSHDGuilhwluihgwuieghl";
        const weakPassword: Password = defaultPassword();
        weakPassword.password.value = "weak";
        weakPassword.login.value = "MetricsWorkAfterUpdate";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.password.value = strongPassword;
        duplicatePassword.login.value = "MVowemiogwnoigninlgnqilnhn";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.login.value = "PasswordStore Metrics Work After Update";
        containsLoginPassword.password.value = "PasswordStore Metrics Work After Update 123";

        await app.currentVault.passwordStore.addPassword(masterKey, weakPassword);

        let retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        weakPassword.password.value = "newWeak";
        await app.currentVault.passwordStore.updatePassword(masterKey, weakPassword, true, [], []);

        retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        weakPassword.password.value = strongPassword;
        await app.currentVault.passwordStore.updatePassword(masterKey, weakPassword, true, [], []);

        retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Weak password doesn't exists", retrievedWeakPassword.length, 0);

        await app.currentVault.passwordStore.addPassword(masterKey, duplicatePassword);

        let retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id.value);
        let retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Duplicate password one exists", retrievedDuplicatePasswordOne.length, 1);
        ctx.assertEquals("Duplicate password two exists", retrievedDuplicatePasswordTwo.length, 1);

        duplicatePassword.password.value = "VNlowehnglwhgaljksgio;ajsoitjw;ojtoj9285u29utjioijl";

        await app.currentVault.passwordStore.updatePassword(masterKey, duplicatePassword, true, [], []);

        retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id.value);
        retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Duplicate password one doesn't exists", retrievedDuplicatePasswordOne.length, 0);
        ctx.assertEquals("Duplicate password two doesn't exists", retrievedDuplicatePasswordTwo.length, 0);

        await app.currentVault.passwordStore.addPassword(masterKey, containsLoginPassword);

        let retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id.value);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);

        containsLoginPassword.password.value = "VNkjnvjkNvkljXNVjkxnvkjnjksdbjksdbkjsbkjbkj2iu52985u28][";

        await app.currentVault.passwordStore.updatePassword(masterKey, containsLoginPassword, true, [], []);
        retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id.value);
        ctx.assertEquals("Contains Login password doesn't exists", retrievedContainsLoginPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "Vmwoeipvnio2nhiohnlkng3lnhhi3";

        await app.currentVault.passwordStore.addPassword(masterKey, password);
        password.password.value = "unsafe";

        await app.currentVault.passwordStore.updatePassword(masterKey, password, true, [], []);

        ctx.assertEquals("Unsafe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswords.current[app.currentVault.passwordStore.currentAndSafePasswords.current.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Unsafe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswords.safe[app.currentVault.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);

        password.password.value = "sdvlaioashvlSDLhbislhi2h892upt9jslinp[k2pop3tk2pyj";
        await app.currentVault.passwordStore.updatePassword(masterKey, password, true, [], []);

        ctx.assertEquals("Safe password correct current",
            app.currentVault.passwordStore.currentAndSafePasswords.current[app.currentVault.passwordStore.currentAndSafePasswords.current.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Safe password correct safe",
            app.currentVault.passwordStore.currentAndSafePasswords.safe[app.currentVault.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update With Groups Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "MVpmvio2mbomomjpjgpwjogwhergg";
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const group: Group = defaultGroup(DataType.Passwords);
        group.name.value = "PasswordStore Update With Group Works";
        group.color.value = "#FFFFFF";

        await app.currentVault.groupStore.addGroup(masterKey, group);

        const addedGroupPassword: Password = JSON.vaulticParse(JSON.vaulticStringify(password));
        addedGroupPassword.groups.value.set(group.id.value, new Field(group.id.value));
        await app.currentVault.passwordStore.updatePassword(masterKey, addedGroupPassword, false, [], []);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == addedGroupPassword.id.value)[0];
        let retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword.groups.value.has(retrievedGroup.id.value));
        ctx.assertTruthy("Group has password id", retrievedGroup.passwords.value.has(retrievedPassword.id.value));

        const removedGroupPassword: Password = JSON.vaulticParse(JSON.vaulticStringify(addedGroupPassword));
        removedGroupPassword.groups.value = new Map();
        await app.currentVault.passwordStore.updatePassword(masterKey, removedGroupPassword, false, [], []);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == removedGroupPassword.id.value)[0];
        retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password doesn't have group id", !retrievedPassword.groups.value.has(retrievedGroup.id.value));
        ctx.assertTruthy("Group doesn't have password id", !retrievedGroup.passwords.value.has(retrievedPassword.id.value));
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update With Filters Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "UpdateWithFilterWorks--NoFilter";

        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.name.value = "PasswordStore Update With Filter Works";
        filter.conditions.value.push({
            id: new Field("Id"),
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: "UpdateWithFilterWorks--Filter"
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);

        password.login.value = "UpdateWithFilterWorks--Filter";
        await app.currentVault.passwordStore.updatePassword(masterKey, password, false, [], []);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0];
        let retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password has filter id", retrievedPassword.filters.value.has(retrievedFilter.id.value));
        ctx.assertTruthy("Filter has password id", retrievedFilter.passwords.value.has(retrievedPassword.id.value));

        password.login.value = "UpdateWithFilterWorks--NoFilter";
        await app.currentVault.passwordStore.updatePassword(masterKey, password, false, [], []);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value)[0];
        retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password doesn't have filter id", !retrievedPassword.filters.value.has(retrievedFilter.id.value));
        ctx.assertTruthy("Filter doesn't have password id", !retrievedFilter.passwords.value.has(retrievedPassword.id.value));
    }
});

passwordStoreSuite.tests.push({
    name: 'Delete works', func: async (ctx: TestContext) => 
    {
        const password: Password = defaultPassword();
        password.login.value = "vmOVKmweopbmoibniohwigh8goho2hti2";

        await app.currentVault.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        ctx.assertTruthy("Password Exists", retrievedPassword[0]);

        const reactivePassword = createReactivePassword(password);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactivePassword);

        const deletedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        ctx.assertEquals("Password Deleted", deletedPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Delete", func: async (ctx: TestContext) =>
    {
        const weakPassword: Password = defaultPassword();
        weakPassword.password.value = "weak";
        weakPassword.login.value = "MVlsd;mvl;mkln2jtigohgoh";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.password.value = "weak";
        duplicatePassword.login.value = "uigiwhgshioadsjvoavmobn";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.login.value = "PasswordStore Metrics Work After Delete";
        containsLoginPassword.password.value = "PasswordStore Metrics Work After Delete 123";

        await app.currentVault.passwordStore.addPassword(masterKey, weakPassword);

        let retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        await app.currentVault.passwordStore.addPassword(masterKey, duplicatePassword);

        let retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id.value);
        let retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Duplicate password one exists", retrievedDuplicatePasswordOne.length, 1);
        ctx.assertEquals("Duplicate password two exists", retrievedDuplicatePasswordTwo.length, 1);

        const reactiveWeakPassword = createReactivePassword(weakPassword);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactiveWeakPassword);

        const reactiveDuplicatePassword = createReactivePassword(duplicatePassword);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactiveDuplicatePassword);

        retrievedWeakPassword = app.currentVault.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Weak password doesn't exists", retrievedWeakPassword.length, 0);

        retrievedDuplicatePasswordOne = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id.value);
        retrievedDuplicatePasswordTwo = app.currentVault.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id.value);
        ctx.assertEquals("Duplicate password one doesn't exists", retrievedDuplicatePasswordOne.length, 0);
        ctx.assertEquals("Duplicate password two doesn't exists", retrievedDuplicatePasswordTwo.length, 0);

        await app.currentVault.passwordStore.addPassword(masterKey, containsLoginPassword);

        let retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id.value);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);

        const reactiveContainsLoginPassword = createReactivePassword(containsLoginPassword);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactiveContainsLoginPassword);

        retrievedContainsLoginPassword = app.currentVault.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id.value);
        ctx.assertEquals("Contains Login password doesn't exists", retrievedContainsLoginPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "lmommoniNVInweuiobwiogbw";

        await app.currentVault.passwordStore.addPassword(masterKey, password);
        password.password.value = "unsafe";

        const reactivePassword = createReactivePassword(password);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactivePassword);

        ctx.assertEquals("Correct current",
            app.currentVault.passwordStore.currentAndSafePasswords.current[app.currentVault.passwordStore.currentAndSafePasswords.current.length - 1],
            app.currentVault.passwordStore.passwords.length);

        ctx.assertEquals("Correct safe",
            app.currentVault.passwordStore.currentAndSafePasswords.safe[app.currentVault.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete With Groups Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "Mqmiovwnvionbigh2uioghoighug";

        const group: Group = defaultGroup(DataType.Passwords);
        group.name.value = "PasswordStore Delete With Group Works";
        group.color.value = "#FFFFFF";

        await app.currentVault.groupStore.addGroup(masterKey, group);
        password.groups.value.set(group.id.value, new Field(group.id.value));
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        let retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword[0]);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword[0].groups.value.has(retrievedGroup.id.value));
        ctx.assertTruthy("Group has password id", retrievedGroup.passwords.value.has(retrievedPassword[0].id.value));

        const reactivePassword = createReactivePassword(password);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactivePassword);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        retrievedGroup = app.currentVault.groupStore.passwordGroups.filter(g => g.id.value == group.id.value)[0];

        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Password doesn't exists", retrievedPassword.length, 0);
        ctx.assertEquals("Group doesn't have password id", retrievedGroup.passwords.value.size, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete With Filters Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login.value = "DeleteWithFilterWorks";

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.name.value = "PasswordStore Update With Filter Works";
        filter.conditions.value.push({
            id: new Field("DeleteWithFilterWorks--Condition"),
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: "DeleteWithFilterWorks"
        });

        await app.currentVault.filterStore.addFilter(masterKey, filter);
        await app.currentVault.passwordStore.addPassword(masterKey, password);

        let retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        let retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertTruthy("Password has filter id", retrievedPassword[0].filters.value.has(retrievedFilter.id.value));
        ctx.assertTruthy("Filter has password id", retrievedFilter.passwords.value.has(retrievedPassword[0].id.value));

        const reactivePassword = createReactivePassword(password);
        await app.currentVault.passwordStore.deletePassword(masterKey, reactivePassword);

        retrievedPassword = app.currentVault.passwordStore.passwords.filter(p => p.id.value == password.id.value);
        retrievedFilter = app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == filter.id.value)[0];

        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password doesn't exists", retrievedPassword.length, 0);
        ctx.assertEquals("Filter doesn't have password id", retrievedFilter.passwords.value.size, 0);
    }
});

export default passwordStoreSuite;