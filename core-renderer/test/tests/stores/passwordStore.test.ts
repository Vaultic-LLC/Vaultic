import { stores } from "../../src/core/Objects/Stores/index";
import { defaultPassword, type Password } from '../../src/core/Types/EncryptedData';
import cryptHelper from '../../src/core/Helpers/cryptHelper';
import createReactivePassword from '../../src/core/Objects/Stores/ReactivePassword';
import type { ITest, TestContext } from '../test';

let passwordTests: ITest[] = [];

const masterKey = "test";

passwordTests.push({
    name: "PasswordStore Add Works", func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();

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

        ctx.assertEquals("One Security Question", retrievedPassword.securityQuestions.length, 1);
        ctx.assertEquals("Answer Length", retrievedPassword.securityQuestions[0].answerLength, 6);
        ctx.assertEquals("Question Length", retrievedPassword.securityQuestions[0].questionLength, 8);
    }
});

passwordTests.push({
    name: 'Update works', func: async (ctx: TestContext) => 
    {
        const password: Password = defaultPassword();
        await stores.passwordStore.addPassword(masterKey, password);

        const newLogin = "New Login";
        password.login = newLogin;

        await stores.passwordStore.updatePassword(masterKey, password, false, [], []);
        const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);

        ctx.assertEquals("New Login", updatedPassword[0].login, newLogin);
    }
});

passwordTests.push({
    name: 'Update password works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
        await stores.passwordStore.addPassword(masterKey, password);

        const newPassword = "New Password";
        password.password = newPassword;

        await stores.passwordStore.updatePassword(masterKey, password, true, [], []);
        const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);

        const decryptedNewPassword = await cryptHelper.decrypt(masterKey, updatedPassword[0].password);
        ctx.assertEquals("New Password", decryptedNewPassword.value, newPassword);
    }
});

passwordTests.push({
    name: 'Update security question works', func: async (ctx: TestContext) =>
    {
        const password: Password = defaultPassword();
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

passwordTests.push({
    name: 'Delete works', func: async (ctx: TestContext) => 
    {
        const password: Password = defaultPassword();

        await stores.passwordStore.addPassword(masterKey, password);

        const retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertTruthy("Password Exists", retrievedPassword[0]);

        const reactivePassword = createReactivePassword(password);
        await stores.passwordStore.deletePassword(masterKey, reactivePassword);

        const deletedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);
        ctx.assertEquals("Password Deleted", deletedPassword.length, 0);
    }
});

export default passwordTests;