import { stores } from "../../src/core/Objects/Stores/index";
import { defaultFilter, defaultGroup, defaultPassword, type Password } from '../../src/core/Types/EncryptedData';
import cryptHelper from '../../src/core/Helpers/cryptHelper';
import createReactivePassword from '../../src/core/Objects/Stores/ReactivePassword';
import { createTestSuite, type TestContext } from '../test';
import { DataType, Filter, FilterConditionType, Group } from "../../src/core/Types/Table";

let passwordStoreSuite = createTestSuite("Password Store");

const masterKey = "test";

function getSafePasswords()
{
    return stores.passwordStore.passwords.filter(p => !p.isWeak && !stores.passwordStore.duplicatePasswords.value.includes(p.id) && !p.containsLogin && !p.isOld);
}

passwordStoreSuite.tests.push({
    name: "PasswordStore Add Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "PasswordStore Add Works";
        password.email = "Email@Email";
        password.domain = "www.domain.com";
        password.password = "Password";
        password.passwordFor = "PasswordFor";
        password.additionalInformation = "AdditionalInformation";

        const sequrityQuestion = {
            id: "SecurityQuestion",
            question: "Question",
            questionLength: 0,
            answer: "Answer",
            answerLength: 0
        };

        password.securityQuestions.push(sequrityQuestion);

        await stores.passwordStore.addPassword(masterKey, password);
        const retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id)[0];

        const decryptedPassword = await cryptHelper.decrypt(masterKey, retrievedPassword.password);
        const decryptedSecurityQuesitonQuestion = await cryptHelper.decrypt(masterKey, retrievedPassword.securityQuestions[0].question);
        const decryptedSecurityQuesitonAnswer = await cryptHelper.decrypt(masterKey, retrievedPassword.securityQuestions[0].answer);

        ctx.assertEquals("Login is correct", retrievedPassword.login, "PasswordStore Add Works");
        ctx.assertEquals("Email is correct", retrievedPassword.email, "Email@Email");
        ctx.assertEquals("Domain is correct", retrievedPassword.domain, "www.domain.com");
        ctx.assertEquals("Password is correct", decryptedPassword.value, "Password");
        ctx.assertEquals("PasswordFor is correct", retrievedPassword.passwordFor, "PasswordFor");
        ctx.assertEquals("PasswordLength is correct", retrievedPassword.passwordLength, 8);
        ctx.assertEquals("AdditionalInformation is correct", retrievedPassword.additionalInformation, "AdditionalInformation");

        ctx.assertEquals("One Security Question", retrievedPassword.securityQuestions.length, 1);
        ctx.assertEquals("Decrypted security question question", decryptedSecurityQuesitonQuestion.value, "Question");
        ctx.assertEquals("Decrypted security question answer", decryptedSecurityQuesitonAnswer.value, "Answer");
        ctx.assertEquals("Answer Length", retrievedPassword.securityQuestions[0].answerLength, 6);
        ctx.assertEquals("Question Length", retrievedPassword.securityQuestions[0].questionLength, 8);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Add", func: async (ctx: TestContext) =>
    {
        const weakPassword: Password = defaultPassword();
        weakPassword.login = "OJpmbp4on894h89jhog";
        weakPassword.password = "weak";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.login = "beponjioNSOIGw";
        duplicatePassword.password = "weak";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.login = "PasswordStore Metrics Work After Add";
        containsLoginPassword.password = "PasswordStore Metrics Work After Add Test";

        await stores.passwordStore.addPassword(masterKey, weakPassword);

        const retrievedWeakPassword = stores.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        await stores.passwordStore.addPassword(masterKey, duplicatePassword);

        const retrievedDuplicatePasswordOne = stores.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id);
        const retrievedDuplicatePasswordTwo = stores.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Duplicate password one exists", retrievedDuplicatePasswordOne.length, 1);
        ctx.assertEquals("Duplicate password two exists", retrievedDuplicatePasswordTwo.length, 1);

        await stores.passwordStore.addPassword(masterKey, containsLoginPassword);

        const retrievedContainsLoginPassword = stores.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const safePassword: Password = defaultPassword();
        safePassword.login = "GLSVBvlinwoigjnioolnguiq3lnneilrun";
        safePassword.password = "FS:nvw2nvioshsoijhvhoVnlweuw159y98hoivGSHLViNSBuign[p[1";

        const unsafePassword: Password = defaultPassword();
        unsafePassword.login = "lnljolwhiwlnSNDfbuiho2tto27";
        unsafePassword.password = "weak";

        await stores.passwordStore.addPassword(masterKey, safePassword);

        ctx.assertEquals("Safe password correct current",
            stores.passwordStore.currentAndSafePasswords.current[stores.passwordStore.currentAndSafePasswords.current.length - 1],
            stores.passwordStore.passwords.length);

        ctx.assertEquals("Safe password correct safe",
            stores.passwordStore.currentAndSafePasswords.safe[stores.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);

        await stores.passwordStore.addPassword(masterKey, unsafePassword);

        ctx.assertEquals("Unsafe password correct current",
            stores.passwordStore.currentAndSafePasswords.current[stores.passwordStore.currentAndSafePasswords.current.length - 1],
            stores.passwordStore.passwords.length);

        ctx.assertEquals("Unsafe password correct safe",
            stores.passwordStore.currentAndSafePasswords.safe[stores.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add With Group Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "VNwelnbwiono;imgo;mbio";

        const group: Group = defaultGroup(DataType.Passwords);
        group.name = "PasswordStore Add With Group Works";
        group.color = "#FFFFFF";

        await stores.groupStore.addGroup(masterKey, group);

        password.groups.push(group.id);

        await stores.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id)[0];
        const retrievedGroup = stores.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Password has group id", retrievedPassword.groups.filter(g => g == retrievedGroup.id).length, 1);
        ctx.assertEquals("Group has password id", retrievedGroup.passwords.filter(p => p == retrievedPassword.id).length, 1);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Add With Filter Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "PasswordStore Add With Filter Works";

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.name = "PasswordStore Add With Filter Works";
        filter.conditions.push({
            id: "PasswordStore Add With Filter Works",
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: "PasswordStore Add With Filter Works"
        });

        await stores.filterStore.addFilter(masterKey, filter);
        await stores.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id)[0];
        const retrievedFilter = stores.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password has filter id", retrievedPassword.filters.filter(f => f == retrievedFilter.id).length, 1);
        ctx.assertEquals("Filter has password id", retrievedFilter.passwords.filter(p => p == retrievedPassword.id).length, 1);
    }
});

passwordStoreSuite.tests.push({
    name: 'PasswordStore Update works', func: async (ctx: TestContext) => 
    {
        const originalLogin = "TestUpdateWorksLogin";

        const password: Password = defaultPassword();
        password.login = originalLogin;

        await stores.passwordStore.addPassword(masterKey, password);

        const newLogin = "Test Update Works New Login";
        const newDomin = "New Domain";
        const newEmail = "New Email";
        const newPasswordFor = "New Password For";
        const newAdditionalInfo = "New Additional Info";

        password.login = newLogin;
        password.domain = newDomin;
        password.email = newEmail;
        password.passwordFor = newPasswordFor;
        password.additionalInformation = newAdditionalInfo;

        await stores.passwordStore.updatePassword(masterKey, password, false, [], []);

        const oldPassword = stores.passwordStore.passwords.filter(p => p.login == originalLogin);
        ctx.assertEquals("Password doesn't exist", oldPassword.length, 0);

        const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertEquals("New Login", updatedPassword[0].login, newLogin);
        ctx.assertEquals("New Domain", updatedPassword[0].domain, newDomin);
        ctx.assertEquals("New Email", updatedPassword[0].email, newEmail);
        ctx.assertEquals("New Password For", updatedPassword[0].passwordFor, newPasswordFor);
        ctx.assertEquals("New Additional Info", updatedPassword[0].additionalInformation, newAdditionalInfo);
    }
});

passwordStoreSuite.tests.push({
    name: 'Update password works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "ijvLOSvniowemwmiophjh";
        password.password = "Original Password";

        await stores.passwordStore.addPassword(masterKey, password);

        const newPassword = "New Password";
        password.password = newPassword;

        await stores.passwordStore.updatePassword(masterKey, password, true, [], []);
        const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);

        const decryptedNewPassword = await cryptHelper.decrypt(masterKey, updatedPassword[0].password);
        ctx.assertEquals("New Password", decryptedNewPassword.value, newPassword);
    }
});

passwordStoreSuite.tests.push({
    name: 'Update security question works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "MVOmewpobwjbiophniones";
        const securityQuestion = {
            id: "SecurityQuestion",
            question: "Question",
            questionLength: 0,
            answer: "Answer",
            answerLength: 0
        };

        password.securityQuestions.push(securityQuestion);

        await stores.passwordStore.addPassword(masterKey, password);

        const newQuesiton = "UpdatedQuesiton";
        const newAnswer = "UpdatedAnswer";

        password.securityQuestions[0].question = newQuesiton;
        password.securityQuestions[0].answer = newAnswer;

        await stores.passwordStore.updatePassword(masterKey, password, false, [securityQuestion.id], [securityQuestion.id]);
        const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);

        const decryptedAnswer = await cryptHelper.decrypt(masterKey, updatedPassword[0].securityQuestions[0].answer);

        ctx.assertEquals("New Answer", decryptedAnswer.value, newAnswer);
        ctx.assertEquals("Answer Length", updatedPassword[0].securityQuestions[0].answerLength, newAnswer.length);
        ctx.assertEquals("Question Length", updatedPassword[0].securityQuestions[0].questionLength, newQuesiton.length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Update", func: async (ctx: TestContext) =>
    {
        const strongPassword = "VNLinlsdhfklahsn]p][2p359jgjvlSHDGuilhwluihgwuieghl";
        const weakPassword: Password = defaultPassword();
        weakPassword.password = "weak";
        weakPassword.login = "MetricsWorkAfterUpdate";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.password = strongPassword;
        duplicatePassword.login = "MVowemiogwnoigninlgnqilnhn";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.login = "PasswordStore Metrics Work After Update";
        containsLoginPassword.password = "PasswordStore Metrics Work After Update 123";

        await stores.passwordStore.addPassword(masterKey, weakPassword);

        let retrievedWeakPassword = stores.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        weakPassword.password = "newWeak";
        await stores.passwordStore.updatePassword(masterKey, weakPassword, true, [], []);

        retrievedWeakPassword = stores.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        weakPassword.password = strongPassword;
        await stores.passwordStore.updatePassword(masterKey, weakPassword, true, [], []);

        retrievedWeakPassword = stores.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password doesn't exists", retrievedWeakPassword.length, 0);

        await stores.passwordStore.addPassword(masterKey, duplicatePassword);

        let retrievedDuplicatePasswordOne = stores.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id);
        let retrievedDuplicatePasswordTwo = stores.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Duplicate password one exists", retrievedDuplicatePasswordOne.length, 1);
        ctx.assertEquals("Duplicate password two exists", retrievedDuplicatePasswordTwo.length, 1);

        duplicatePassword.password = "VNlowehnglwhgaljksgio;ajsoitjw;ojtoj9285u29utjioijl";

        await stores.passwordStore.updatePassword(masterKey, duplicatePassword, true, [], []);

        retrievedDuplicatePasswordOne = stores.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id);
        retrievedDuplicatePasswordTwo = stores.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Duplicate password one doesn't exists", retrievedDuplicatePasswordOne.length, 0);
        ctx.assertEquals("Duplicate password two doesn't exists", retrievedDuplicatePasswordTwo.length, 0);

        await stores.passwordStore.addPassword(masterKey, containsLoginPassword);

        let retrievedContainsLoginPassword = stores.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);

        containsLoginPassword.password = "VNkjnvjkNvkljXNVjkxnvkjnjksdbjksdbkjsbkjbkj2iu52985u28][";

        await stores.passwordStore.updatePassword(masterKey, containsLoginPassword, true, [], []);
        retrievedContainsLoginPassword = stores.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password doesn't exists", retrievedContainsLoginPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "Vmwoeipvnio2nhiohnlkng3lnhhi3";

        await stores.passwordStore.addPassword(masterKey, password);
        password.password = "unsafe";

        await stores.passwordStore.updatePassword(masterKey, password, true, [], []);

        ctx.assertEquals("Unsafe password correct current",
            stores.passwordStore.currentAndSafePasswords.current[stores.passwordStore.currentAndSafePasswords.current.length - 1],
            stores.passwordStore.passwords.length);

        ctx.assertEquals("Unsafe password correct safe",
            stores.passwordStore.currentAndSafePasswords.safe[stores.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);

        password.password = "sdvlaioashvlSDLhbislhi2h892upt9jslinp[k2pop3tk2pyj";
        await stores.passwordStore.updatePassword(masterKey, password, true, [], []);

        ctx.assertEquals("Safe password correct current",
            stores.passwordStore.currentAndSafePasswords.current[stores.passwordStore.currentAndSafePasswords.current.length - 1],
            stores.passwordStore.passwords.length);

        ctx.assertEquals("Safe password correct safe",
            stores.passwordStore.currentAndSafePasswords.safe[stores.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update With Groups Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "MVpmvio2mbomomjpjgpwjogwhergg";
        await stores.passwordStore.addPassword(masterKey, password);

        const group: Group = defaultGroup(DataType.Passwords);
        group.name = "PasswordStore Update With Group Works";
        group.color = "#FFFFFF";

        await stores.groupStore.addGroup(masterKey, group);

        const addedGroupPassword = JSON.parse(JSON.stringify(password));
        addedGroupPassword.groups.push(group.id);
        await stores.passwordStore.updatePassword(masterKey, addedGroupPassword, false, [], []);

        let retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == addedGroupPassword.id)[0];
        let retrievedGroup = stores.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertTruthy("Password has group id", retrievedPassword.groups.includes(retrievedGroup.id));
        ctx.assertTruthy("Group has password id", retrievedGroup.passwords.includes(retrievedPassword.id));

        const removedGroupPassword = JSON.parse(JSON.stringify(addedGroupPassword));
        removedGroupPassword.groups = [];
        await stores.passwordStore.updatePassword(masterKey, removedGroupPassword, false, [], []);

        retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == removedGroupPassword.id)[0];
        retrievedGroup = stores.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Password doesn't have group id", retrievedPassword.groups.filter(g => g == retrievedGroup.id).length, 0);
        ctx.assertEquals("Group doesn't have password id", retrievedGroup.passwords.filter(p => p == retrievedPassword.id).length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Update With Filters Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "UpdateWithFilterWorks--NoFilter";

        await stores.passwordStore.addPassword(masterKey, password);

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.name = "PasswordStore Update With Filter Works";
        filter.conditions.push({
            id: "Id",
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: "UpdateWithFilterWorks--Filter"
        });

        await stores.filterStore.addFilter(masterKey, filter);

        password.login = "UpdateWithFilterWorks--Filter";
        await stores.passwordStore.updatePassword(masterKey, password, false, [], []);

        let retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id)[0];
        let retrievedFilter = stores.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password has filter id", retrievedPassword.filters.filter(f => f == retrievedFilter.id).length, 1);
        ctx.assertEquals("Filter has password id", retrievedFilter.passwords.filter(p => p == retrievedPassword.id).length, 1);

        password.login = "UpdateWithFilterWorks--NoFilter";
        await stores.passwordStore.updatePassword(masterKey, password, false, [], []);

        retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id)[0];
        retrievedFilter = stores.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password doesn't have filter id", retrievedPassword.filters.filter(f => f == retrievedFilter.id).length, 0);
        ctx.assertEquals("Filter doesn't have password id", retrievedFilter.passwords.filter(p => p == retrievedPassword.id).length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: 'Delete works', func: async (ctx: TestContext) => 
    {
        const password: Password = defaultPassword();
        password.login = "vmOVKmweopbmoibniohwigh8goho2hti2";

        await stores.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertTruthy("Password Exists", retrievedPassword[0]);

        const reactivePassword = createReactivePassword(password);
        await stores.passwordStore.deletePassword(masterKey, reactivePassword);

        const deletedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertEquals("Password Deleted", deletedPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Metrics Work After Delete", func: async (ctx: TestContext) =>
    {
        const weakPassword: Password = defaultPassword();
        weakPassword.password = "weak";
        weakPassword.login = "MVlsd;mvl;mkln2jtigohgoh";

        const duplicatePassword: Password = defaultPassword();
        duplicatePassword.password = "weak";
        duplicatePassword.login = "uigiwhgshioadsjvoavmobn";

        const containsLoginPassword: Password = defaultPassword();
        containsLoginPassword.login = "PasswordStore Metrics Work After Delete";
        containsLoginPassword.password = "PasswordStore Metrics Work After Delete 123";

        await stores.passwordStore.addPassword(masterKey, weakPassword);

        let retrievedWeakPassword = stores.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password exists", retrievedWeakPassword.length, 1);

        await stores.passwordStore.addPassword(masterKey, duplicatePassword);

        let retrievedDuplicatePasswordOne = stores.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id);
        let retrievedDuplicatePasswordTwo = stores.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Duplicate password one exists", retrievedDuplicatePasswordOne.length, 1);
        ctx.assertEquals("Duplicate password two exists", retrievedDuplicatePasswordTwo.length, 1);

        const reactiveWeakPassword = createReactivePassword(weakPassword);
        await stores.passwordStore.deletePassword(masterKey, reactiveWeakPassword);

        const reactiveDuplicatePassword = createReactivePassword(duplicatePassword);
        await stores.passwordStore.deletePassword(masterKey, reactiveDuplicatePassword);

        retrievedWeakPassword = stores.passwordStore.weakPasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Weak password doesn't exists", retrievedWeakPassword.length, 0);

        retrievedDuplicatePasswordOne = stores.passwordStore.duplicatePasswords.value.filter(p => p == duplicatePassword.id);
        retrievedDuplicatePasswordTwo = stores.passwordStore.duplicatePasswords.value.filter(p => p == weakPassword.id);
        ctx.assertEquals("Duplicate password one doesn't exists", retrievedDuplicatePasswordOne.length, 0);
        ctx.assertEquals("Duplicate password two doesn't exists", retrievedDuplicatePasswordTwo.length, 0);

        await stores.passwordStore.addPassword(masterKey, containsLoginPassword);

        let retrievedContainsLoginPassword = stores.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password exists", retrievedContainsLoginPassword.length, 1);

        const reactiveContainsLoginPassword = createReactivePassword(containsLoginPassword);
        await stores.passwordStore.deletePassword(masterKey, reactiveContainsLoginPassword);

        retrievedContainsLoginPassword = stores.passwordStore.containsLoginPasswords.value.filter(p => p == containsLoginPassword.id);
        ctx.assertEquals("Contains Login password doesn't exists", retrievedContainsLoginPassword.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete CurrentAndSafe Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "lmommoniNVInweuiobwiogbw";

        await stores.passwordStore.addPassword(masterKey, password);
        password.password = "unsafe";

        const reactivePassword = createReactivePassword(password);
        await stores.passwordStore.deletePassword(masterKey, reactivePassword);

        ctx.assertEquals("Correct current",
            stores.passwordStore.currentAndSafePasswords.current[stores.passwordStore.currentAndSafePasswords.current.length - 1],
            stores.passwordStore.passwords.length);

        ctx.assertEquals("Correct safe",
            stores.passwordStore.currentAndSafePasswords.safe[stores.passwordStore.currentAndSafePasswords.safe.length - 1],
            getSafePasswords().length);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete With Groups Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "Mqmiovwnvionbigh2uioghoighug";

        const group: Group = defaultGroup(DataType.Passwords);
        group.name = "PasswordStore Delete With Group Works";
        group.color = "#FFFFFF";

        await stores.groupStore.addGroup(masterKey, group);
        password.groups.push(group.id);
        await stores.passwordStore.addPassword(masterKey, password);

        let retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        let retrievedGroup = stores.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword[0]);
        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Password has group id", retrievedPassword[0].groups.filter(g => g == retrievedGroup.id).length, 1);
        ctx.assertEquals("Group has password id", retrievedGroup.passwords.filter(p => p == retrievedPassword[0].id).length, 1);

        const reactivePassword = createReactivePassword(password);
        await stores.passwordStore.deletePassword(masterKey, reactivePassword);

        retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        retrievedGroup = stores.groupStore.passwordGroups.filter(g => g.id == group.id)[0];

        ctx.assertTruthy("Group exists", retrievedGroup);
        ctx.assertEquals("Password doesn't exists", retrievedPassword.length, 0);
        ctx.assertEquals("Group doesn't have password id", retrievedGroup.passwords.length, 0);
    }
});

passwordStoreSuite.tests.push({
    name: "PasswordStore Delete With Filters Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        password.login = "DeleteWithFilterWorks";

        const filter: Filter = defaultFilter(DataType.Passwords);
        filter.name = "PasswordStore Update With Filter Works";
        filter.conditions.push({
            id: "DeleteWithFilterWorks--Condition",
            property: "login",
            filterType: FilterConditionType.EqualTo,
            value: "DeleteWithFilterWorks"
        });

        await stores.filterStore.addFilter(masterKey, filter);
        await stores.passwordStore.addPassword(masterKey, password);

        let retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        let retrievedFilter = stores.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Password exists", retrievedPassword);
        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password has filter id", retrievedPassword[0].filters.filter(f => f == retrievedFilter.id).length, 1);
        ctx.assertEquals("Filter has password id", retrievedFilter.passwords.filter(p => p == retrievedPassword[0].id).length, 1);

        const reactivePassword = createReactivePassword(password);
        await stores.passwordStore.deletePassword(masterKey, reactivePassword);

        retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        retrievedFilter = stores.filterStore.passwordFilters.filter(f => f.id == filter.id)[0];

        ctx.assertTruthy("Filter exists", retrievedFilter);
        ctx.assertEquals("Password doesn't exists", retrievedPassword.length, 0);
        ctx.assertEquals("Filter doesn't have password id", retrievedFilter.passwords.length, 0);
    }
});

export default passwordStoreSuite;