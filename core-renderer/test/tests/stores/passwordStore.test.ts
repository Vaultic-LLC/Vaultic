import { expect, test } from 'vitest';
import { stores } from "../../src/core/Objects/Stores";
import { defaultPassword, type Password } from 'src/core/Types/EncryptedData';
import cryptHelper from 'src/core/Helpers/cryptHelper';
import createReactivePassword from 'src/core/Objects/Stores/ReactivePassword';

const masterKey = "test";

test('Add works', async () =>
{
    const password: Password = defaultPassword();
    password.id = "AddWorks";

    const sequrityQuestion = {
        id: "SecurityQuestion",
        question: "Question",
        questionLength: 0,
        answer: "Answer",
        answerLength: 0
    };

    password.securityQuestions.push(sequrityQuestion);

    await stores.passwordStore.addPassword(masterKey, password);

    expect(stores.passwordStore.passwords.length).toEqual(1);

    const retrievedPassword = stores.passwordStore.passwords.filter(p => p.id == "AddWorks")[0];

    expect(retrievedPassword.securityQuestions.length).toEqual(1);
    expect(retrievedPassword.securityQuestions[0].answerLength).toEqual(sequrityQuestion.answer.length);
    expect(retrievedPassword.securityQuestions[0].questionLength).toEqual(sequrityQuestion.question.length);
});

test('Update works', async () => 
{
    const password: Password = defaultPassword();
    password.id = "UpdateWorks";

    await stores.passwordStore.addPassword(masterKey, password);

    const newLogin = "New Login";
    password.login = newLogin;

    await stores.passwordStore.updatePassword(masterKey, password, false, [], []);
    const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);

    expect(updatedPassword[0].login).toEqual(newLogin);
});

test('Update password works', async () =>
{
    const password: Password = defaultPassword();
    password.id = "UpdatePasswordWorks";

    await stores.passwordStore.addPassword(masterKey, password);

    const newPassword = "New Password";
    password.password = newPassword;

    await stores.passwordStore.updatePassword(masterKey, password, true, [], []);
    const updatedPassword = stores.passwordStore.passwords.filter(p => p.id == password.id);

    const decryptedNewPassword = await cryptHelper.decrypt(masterKey, updatedPassword[0].password);
    expect(decryptedNewPassword.value).toEqual(newPassword);
});

test('Update security question works', async () =>
{
    const password: Password = defaultPassword();
    password.id = "UpdateSecurityQuestionWorks";

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

    const decryptedAnswer = await cryptHelper.decrypt(masterKey, updatedPassword[0].securityQuestions[0].question);

    expect(decryptedAnswer.value).toEqual(newAnswer);
    expect(updatedPassword[0].securityQuestions[0].answerLength).toEqual(newAnswer.length);
    expect(updatedPassword[0].securityQuestions[0].questionLength).toEqual(newQuesiton.length);
});

test('Delete works', async () => 
{
    const password: Password = defaultPassword();
    password.id = "DeleteWorks";

    await stores.passwordStore.addPassword(masterKey, password);

    expect(stores.passwordStore.passwords.length).toEqual(1);

    const reactivePassword = await createReactivePassword(masterKey, password);
    await stores.passwordStore.deletePassword(masterKey, reactivePassword);

    const deletedPassword = stores.passwordStore.passwords.filter(p => p.id == "DeleteWorks");
    expect(deletedPassword.length).toEqual(0);
});