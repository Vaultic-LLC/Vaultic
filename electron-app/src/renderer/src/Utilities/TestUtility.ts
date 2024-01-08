import { stores } from "../Objects/Stores";
import { NameValuePair, NameValuePairType, Password, SecurityQuestion } from "../Types/EncryptedData";
import { Filter, FilterConditionType, DataType, FilterCondition, Group } from "../Types/Table";
import idGenerator from "./IdGenerator";

const key: string = "TestKey";

function createPasswords()
{
	const createPassword = (id: string, filters: string[], groups: string[], login: string, password: string, passwordFor: string,
		securityQuestions: SecurityQuestion[], additionalInformation: string, lastModifiedTime: number, isDuplicate: boolean = false): Password =>
	{
		return {
			id,
			filters,
			groups,
			login,
			password,
			passwordFor,
			securityQuestions,
			additionalInformation,
			lastModifiedTime,
			isDuplicate,
			isPinned: false
		}
	};

	const thirtyOneDaysAsMiliSeconds: number = 1000 * 86400 * 31;
	const testSecurityQuestions: SecurityQuestion[] = [
		{ id: idGenerator.uniqueId([]), question: "Who are You", questionLength: 11, answer: "Me", answerLength: 2 },
		{ id: idGenerator.uniqueId([]), question: "What color is the sky", questionLength: 21, answer: "red", answerLength: 3 }
	];

	const johnsGroup: Group = stores.groupStore.groups.filter(g => g.name == "Johns")[0];
	const marysGroup: Group = stores.groupStore.groups.filter(g => g.name == "Mary's")[0];
	const bankGroup: Group = stores.groupStore.groups.filter(g => g.name == "Banks")[0];

	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns", "Password", "Gmail", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id], "MaryP", "Password", "FTMO", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Password123", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "jSmith", "ThisIsNotAWeakPassword1234$", "Random website", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "FTMO", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Weak", "Youtube", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [bankGroup.id], "MaryP", "MaryPpass", "Big Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id, bankGroup.id], "MaryP", "MaryPpass", "Bigger Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns", "Password", "Gmail", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id], "MaryP", "Password", "FTMO", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Password123", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "jSmith", "ThisIsNotAWeakPassword1234$", "Random website", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "FTMO", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Weak", "Youtube", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [bankGroup.id], "MaryP", "MaryPpass", "Big Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id, bankGroup.id], "MaryP", "MaryPpass", "Bigger Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns", "Password", "Gmail", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id], "MaryP", "Password", "FTMO", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Password123", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "jSmith", "ThisIsNotAWeakPassword1234$", "Random website", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "FTMO", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Weak", "Youtube", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [bankGroup.id], "MaryP", "MaryPpass", "Big Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id, bankGroup.id], "MaryP", "MaryPpass", "Bigger Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns", "Password", "Gmail", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id], "MaryP", "Password", "FTMO", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Password123", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "jSmith", "ThisIsNotAWeakPassword1234$", "Random website", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "Gmail", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "ThisIsNotAWeakPassword123$", "FTMO", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [johnsGroup.id], "Johns123@gmail.com", "Weak", "Youtube", testSecurityQuestions, "", Date.now()));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [bankGroup.id], "MaryP", "MaryPpass", "Big Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	stores.encryptedDataStore.addPassword(key, createPassword("", [], [marysGroup.id, bankGroup.id], "MaryP", "MaryPpass", "Bigger Bank", testSecurityQuestions, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));

}

async function createNameValuePairs(): Promise<void>
{
	const createNameValuePair = (id: string, filters: string[], groups: string[], name: string, value: string, type: NameValuePairType, additionalInformation: string, lastModifiedTime: number, isDuplicate: boolean = false): NameValuePair =>
	{
		return {
			id,
			filters,
			groups,
			name,
			value,
			valueType: type,
			notifyIfWeak: true,
			additionalInformation,
			lastModifiedTime,
			isDuplicate,
			isPinned: false
		}
	};

	const thirtyOneDaysAsMiliSeconds: number = 1000 * 86400 * 31;

	const codesGroup: Group = stores.groupStore.groups.filter(g => g.name == "Codes")[0];
	const phoneCodesGroup: Group = stores.groupStore.groups.filter(g => g.name == "Phone Codes")[0];

	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "Safe", "65-23-12", NameValuePairType.Safe, "Entering the last number can be kind of finicky. You need to jiggle it a bit in order to get it to work.", (Date.now())));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [phoneCodesGroup.id], "Phone Code", "123415", NameValuePairType.Passcode, "", (Date.now())));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "Bank Verbal Code", "I Like Spaghetti", NameValuePairType.Verbal, "", (Date.now())));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [codesGroup.id], "Garage Code", "5134", NameValuePairType.Passcode, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [codesGroup.id], "Car Code", "5134", NameValuePairType.Passcode, "", Date.now()));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "Secret Phrase", "The cow jumps over the moon", NameValuePairType.Verbal, "", Date.now()));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [codesGroup.id], "Computer Code", "2652235", NameValuePairType.Passcode, "", Date.now()));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "Knock", "Knock Knock ---- Knock Knock Knock", NameValuePairType.Verbal, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "Favorite Food", "Pizza", NameValuePairType.Verbal, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "SSN", "123-45-6789", NameValuePairType.Information, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
	await stores.encryptedDataStore.addNameValuePair(key, createNameValuePair("", [], [], "Stuff", "This is a secret", NameValuePairType.Other, "", (Date.now() - thirtyOneDaysAsMiliSeconds)));
}

function createFilters()
{
	const createFilter = (id: string, type: DataType, isActive: boolean, text: string, conditions: FilterCondition[]): Filter =>
	{
		return {
			id,
			passwords: [],
			nameValuePairs: [],
			isPinned: false,
			type,
			isActive,
			text,
			conditions
		}
	}

	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Gmail Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "Gmail" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "FTMO Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "FTMO" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "A Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "A" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Johns Passwords", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "j" },
	{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "Smith" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Marys Passwords", [{ "id": "", property: "login", filterType: FilterConditionType.Contains, value: "Mary" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "M For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "M" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Email Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "@" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, ".Com Logins", [{ id: "", property: "login", filterType: FilterConditionType.EndsWith, value: ".com" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "B For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "B" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Gmail Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "Gmail" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "FTMO Accounts", [{ id: "", property: "passwordFor", filterType: FilterConditionType.EqualTo, value: "FTMO" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "A Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "A" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Johns Passwords", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "j" },
	{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "Smith" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Marys Passwords", [{ "id": "", property: "login", filterType: FilterConditionType.Contains, value: "Mary" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "M For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "M" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "Email Logins", [{ id: "", property: "login", filterType: FilterConditionType.Contains, value: "@" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, ".Com Logins", [{ id: "", property: "login", filterType: FilterConditionType.EndsWith, value: ".com" }]));
	stores.filterStore.addFilter(createFilter("", DataType.Passwords, false, "B For", [{ id: "", property: "passwordFor", filterType: FilterConditionType.Contains, value: "B" }]));

	stores.filterStore.addFilter(createFilter("", DataType.NameValuePairs, false, "Safe", [{ id: "", property: "name", filterType: FilterConditionType.EqualTo, value: "Safe" }]));
}

function createGroups()
{
	const createGroup = (id: string, type: DataType, name: string, color: string): Group =>
	{
		return {
			id,
			passwords: [],
			nameValuePairs: [],
			isPinned: false,
			type,
			name,
			color
		}
	};

	stores.groupStore.addGroup(createGroup("", DataType.Passwords, "Banks", "#ffa801"));
	stores.groupStore.addGroup(createGroup("", DataType.Passwords, "PWords", "#ffa801"));
	stores.groupStore.addGroup(createGroup("", DataType.Passwords, "Johns", "#00f56e"));
	stores.groupStore.addGroup(createGroup("", DataType.Passwords, "Mary's", "#ff0de3"));

	stores.groupStore.addGroup(createGroup("", DataType.NameValuePairs, "Codes", "#ffa801"));
	stores.groupStore.addGroup(createGroup("", DataType.NameValuePairs, "Phone Codes", "#3339ef"));
}

function createLoginRecords()
{
	const secondsInADay: number = 1000 * 86400;

	stores.appStore.recordLogin(Date.now() - (secondsInADay * 10));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 8));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 5));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 3));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 2));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 1));
	stores.appStore.recordLogin(Date.now());
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 10));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 8));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 5));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 3));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 2));
	stores.appStore.recordLogin(Date.now() - (secondsInADay * 1));
	stores.appStore.recordLogin(Date.now());
}

export default async function createTestData()
{
	createGroups();
	createFilters();
	// createPasswords();
	// await createNameValuePairs();
	createLoginRecords();
}
