import { Password } from "../../Types/EncryptedData";
import { ComputedRef, computed, reactive } from "vue";
import { stores } from ".";
import cryptHelper from "@renderer/Helpers/cryptHelper";

export interface ReactivePassword extends Password
{
	isOld: boolean;
	isSafe: boolean;
}

export default async function createReactivePassword(masterKey: string, password: Password): Promise<ReactivePassword>
{
	const passwordState: Password = reactive({
		...password
	});

	const isOld: ComputedRef<boolean> = computed(() =>
	{
		const today = new Date().getTime();
		const lastModifiedTime = Date.parse(passwordState.lastModifiedTime);
		const differenceInDays = (today - lastModifiedTime) / 1000 / 86400;

		return differenceInDays >= stores.settingsStore.oldPasswordDays;
	});

	const isSafe: ComputedRef<boolean> = computed(() => !isOld.value && !passwordState.isWeak && !passwordState.containsLogin && !passwordState.isDuplicate);

	if (!password.isVaultic)
	{
		password.passwordLength = password.password.length;
		password.lastModifiedTime = new Date().getTime().toString();

		const [isWeak, isWeakMessage] = await window.api.helpers.validation.isWeak(password.password, "Password");
		password.isWeak = isWeak;
		password.isWeakMessage = isWeakMessage;

		if (password.password.includes(password.login))
		{
			password.containsLogin = true;
		}

		const response = await cryptHelper.encrypt(masterKey, password.password);
		if (!response)
		{
			password.password = "";
		}
		else
		{
			password.password = response.value!;
		}
	}

	for (let i = 0; i < password.securityQuestions.length; i++)
	{
		password.securityQuestions[i].questionLength = password.securityQuestions[i].question.length;
		password.securityQuestions[i].question = (await cryptHelper.encrypt(masterKey, password.securityQuestions[i].question)).value ?? "";

		password.securityQuestions[i].answerLength = password.securityQuestions[i].answer.length;
		password.securityQuestions[i].answer = ((await cryptHelper.encrypt(masterKey, password.securityQuestions[i].answer)).value ?? "");
	}

	return {
		get id() { return passwordState.id; },
		get login() { return passwordState.login; },
		get domain() { return passwordState.domain; },
		get email() { return passwordState.email; },
		get password() { return passwordState.password; },
		get passwordFor() { return passwordState.passwordFor; },
		get securityQuestions() { return passwordState.securityQuestions; },
		get additionalInformation() { return passwordState.additionalInformation; },
		get lastModifiedTime() { return passwordState.lastModifiedTime; },
		get filters() { return passwordState.filters; },
		get groups() { return passwordState.groups; },
		get isOld() { return isOld.value; },
		get isWeak() { return passwordState.isWeak; },
		get isWeakMessage() { return passwordState.isWeakMessage; },
		get containsLogin() { return passwordState.containsLogin; },
		get isDuplicate() { return passwordState.isDuplicate; },
		set isDuplicate(value: boolean) { passwordState.isDuplicate = value; },
		get passwordLength() { return passwordState.passwordLength; },
		get isSafe() { return isSafe.value; },
		get key() { return passwordState.key; },
		get isVaultic() { return passwordState.isVaultic; }
	}
}
