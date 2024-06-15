import { Password } from "../../Types/EncryptedData";
import { ComputedRef, computed, reactive } from "vue";
import { stores } from ".";

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
