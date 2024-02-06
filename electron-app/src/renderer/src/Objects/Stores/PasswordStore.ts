import { Password, SecurityQuestion } from "../../Types/EncryptedData";
import cryptUtility from "../../Utilities/CryptUtility";
import { ComputedRef, computed, reactive } from "vue";
import { stores } from ".";
import { isWeak } from "../../Helpers/EncryptedDataHelper";

interface PasswordState extends Password
{
	[key: string]: any;
	isWeak: boolean;
	isWeakMessage: string;
	containsLogin: boolean;
	passwordLength: number;
}

export interface PasswordStore
{
	[key: string]: any;
	id: string;
	login: string;
	password: string;
	passwordFor: string;
	securityQuestions: SecurityQuestion[];
	additionalInformation: string;
	lastModifiedTime: number;
	filters: string[];
	groups: string[];
	isOld: boolean;
	isWeak: boolean;
	isWeakMessage: string;
	containsLogin: boolean;
	passwordLength: number;
	isDuplicate: boolean;
	isSafe: boolean;
	isPinned: boolean;
	updatePassword: (key: string, newPassword: Password, passwordWasUpdated: boolean,
		updatedSecurityQuestionQuestions: string[], updatedSecurityQuestionAnswers: string[]) => void;
}

export default function usePasswordStore(key: string, password: Password, encrypted: boolean = false): PasswordStore
{
	const passwordState: PasswordState = reactive({
		...password,
		isWeak: false,
		isWeakMessage: "",
		containsLogin: false,
		isDuplicate: false,
		passwordLength: password.password.length,
	});

	const isOld: ComputedRef<boolean> = computed(() =>
	{
		const today = Date.now();
		const differenceInDays = (today - passwordState.lastModifiedTime) / 1000 / 86400;

		return differenceInDays >= 30;
	});

	const isSafe: ComputedRef<boolean> = computed(() => !isOld.value && !passwordState.isWeak && !passwordState.containsLogin && !passwordState.isDuplicate);

	function checkIsWeak()
	{
		const [weak, isWeakMessage] = isWeak(passwordState.password, "Password");

		passwordState.isWeak = weak;
		passwordState.isWeakMessage = isWeakMessage;
	}

	function checkContainsUsername()
	{
		if (passwordState.password.includes(passwordState.login))
		{
			passwordState.containsLogin = true;
		}
	}

	function encryptPassword(key: string)
	{
		passwordState.password = cryptUtility.encrypt(key, passwordState.password);
	}

	function encryptSecurityQuestions(key: string)
	{
		passwordState.securityQuestions = passwordState.securityQuestions.map(sq =>
		{
			return {
				...sq,
				questionLength: sq.question.length,
				answerLength: sq.answer.length,
				question: cryptUtility.encrypt(key, sq.question),
				answer: cryptUtility.encrypt(key, sq.answer)
			}
		});
	}

	function updatePassword(key: string, newPassword: Password, passwordWasUpdated: boolean,
		updatedSecurityQuestionQuestions: string[], updatedSecurityQuestionAnswers: string[])
	{
		Object.assign(passwordState, newPassword);

		if (passwordWasUpdated)
		{
			passwordState.lastModifiedTime = Date.now();
			passwordState.passwordLength = passwordState.password.length;

			checkIsWeak();
			checkContainsUsername();
			encryptPassword(key);
		}

		if (updatedSecurityQuestionQuestions.length > 0)
		{
			updatedSecurityQuestionQuestions.forEach(id =>
			{
				const sequrityQuestions: SecurityQuestion = passwordState.securityQuestions.filter(sq => sq.id == id)[0];
				sequrityQuestions.questionLength = sequrityQuestions.question.length;
				sequrityQuestions.question = cryptUtility.encrypt(key, sequrityQuestions.question);
			});
		}

		if (updatedSecurityQuestionAnswers.length > 0)
		{
			updatedSecurityQuestionAnswers.forEach(id =>
			{
				const sequrityQuestions: SecurityQuestion = passwordState.securityQuestions.filter(sq => sq.id == id)[0];
				sequrityQuestions.answerLength = sequrityQuestions.answer.length;
				sequrityQuestions.answer = cryptUtility.encrypt(key, sequrityQuestions.answer);
			});
		}
	}

	// reading in previous state, values are already encrypted and shouldn't need any updating
	if (!encrypted)
	{
		// these can't be computed refs since we want to keep the password encrypted. Calculate them when we're creating the
		// store or when we're updating
		checkIsWeak();
		checkContainsUsername();
		encryptPassword(key);
		encryptSecurityQuestions(key);
	}

	stores.filterStore.addFiltersToNewValue(stores.filterStore.passwordFilters, passwordState, "passwords");

	return {
		get id() { return passwordState.id; },
		get login() { return passwordState.login; },
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
		get isPinned() { return passwordState.isPinned },
		set isPinned(value: boolean) { passwordState.isPinned = value; },
		updatePassword
	}
}
