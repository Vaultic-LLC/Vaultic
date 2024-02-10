import { Password, NameValuePair, CurrentAndSafeStructure, IIdentifiable, AtRiskType, NameValuePairType } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import File from "../Files/File"
import cryptUtility from "../../Utilities/CryptUtility";
import hashUtility from "../../Utilities/HashUtility";
import usePasswordStore, { PasswordStore } from "./PasswordStore";
import useNameValuePair, { NameValuePairStore } from "./NameValuePairStore";
import { DataType, Filter, Group } from "../../Types/Table";
import generator from "../../Utilities/Generator";
import { Dictionary } from "../../Types/DataStructures";
import { AuthenticationStore, Stores, stores } from ".";
import useNameValuePairStore from "./NameValuePairStore";

interface EncryptedDataState
{
	loadedFile: boolean;
	passwords: PasswordStore[];
	nameValuePairs: NameValuePairStore[];
	passwordHash: string;
	valueHash: string;
	duplicatePasswords: Dictionary<string[]>;
	duplicateNameValuePairs: Dictionary<string[]>;
	currentAndSafePasswords: CurrentAndSafeStructure;
	currentAndSafeValues: CurrentAndSafeStructure;
	activeAtRiskPasswordType: AtRiskType;
	activeAtRiskPasswords: Dictionary<AtRiskType[]>;
	activeAtRiskValueType: AtRiskType;
	activeAtRiskValues: Dictionary<AtRiskType[]>;
}

export interface EncryptedDataStore extends AuthenticationStore
{
	passwords: PasswordStore[];
	unpinnedPasswords: PasswordStore[];
	nameValuePairs: NameValuePairStore[];
	unpinnedValues: NameValuePairStore[];
	oldPasswords: ComputedRef<string[]>;
	weakPasswords: ComputedRef<string[]>;
	containsLoginPasswords: ComputedRef<string[]>;
	duplicatePasswords: ComputedRef<string[]>;
	duplicatePasswordsLength: number;
	oldNameValuePairs: ComputedRef<string[]>;
	weakVerbalValues: ComputedRef<string[]>;
	weakPasscodeValues: ComputedRef<string[]>;
	duplicateNameValuePairs: ComputedRef<string[]>;
	duplicateNameValuePairsLength: number;
	currentAndSafePasswords: CurrentAndSafeStructure;
	currentAndSafeValues: CurrentAndSafeStructure;
	activeAtRiskPasswordType: AtRiskType;
	activeAtRiskPasswords: Dictionary<AtRiskType[]>;
	activeAtRiskValueType: AtRiskType;
	activeAtRiskValues: Dictionary<AtRiskType[]>;
	canAuthenticateKey: () => boolean;
	init: (stores: Stores) => void;
	checkKey: (key: string) => boolean;
	addPassword: (key: string, password: Password) => boolean;
	updatePassword: (password: Password, passwordWasUpdated: boolean,
		updatedSecurityQuestionQuestions: string[],
		updatedSecurityQuestionAnswers: string[], key: string) => void;
	addNameValuePair: (key: string, nameValuePair: NameValuePair) => boolean;
	updateNameValuePair: (nameValuePair: NameValuePair, valueWasUpdated: boolean, key: string) => void;
	addRemoveGroupsFromPasswordValue: (addedValues: string[], removedValues: string[], group: Group) => void;
	deletePassword: (key: string, password: PasswordStore) => void;
	deleteNameValuePair: (key: string, nameValuePair: NameValuePairStore) => void;
	removeFilterFromValues: (filter: Filter) => void;
	removeGroupFromValues: (group: Group) => void;
	toggleAtRiskModels: (dataType: DataType, atRiskType: AtRiskType) => void;
}

const dataFile: File = new File("data");
let encryptedDataState: EncryptedDataState;

export default function useEncryptedDataStore(): EncryptedDataStore
{
	encryptedDataState = reactive(defaultState());

	// -- Generic Store Methods
	function defaultState(): EncryptedDataState
	{
		return {
			loadedFile: false,
			passwords: [],
			nameValuePairs: [],
			passwordHash: "",
			valueHash: "",
			duplicatePasswords: {},
			duplicateNameValuePairs: {},
			currentAndSafePasswords: { current: [], safe: [] },
			currentAndSafeValues: { current: [], safe: [] },
			activeAtRiskPasswordType: AtRiskType.None,
			activeAtRiskPasswords: {},
			activeAtRiskValueType: AtRiskType.None,
			activeAtRiskValues: {}
		};
	}

	function canAuthenticateKey()
	{
		return dataFile.exists();
	}

	function writeState(key: string)
	{
		if (encryptedDataState.passwords.length == 0 && encryptedDataState.nameValuePairs.length == 0)
		{
			dataFile.empty();
		}
		else
		{
			dataFile.write(key, encryptedDataState);
		}
	}

	function resetToDefault()
	{
		Object.assign(encryptedDataState, defaultState());
	}

	// --- Private Helper Methods ---
	function calculateHash<T extends { [key: string]: string }>(key: string, values: T[], property: string)
	{
		let runningPasswords: string = "";
		values.forEach(v => runningPasswords += cryptUtility.decrypt(key, v[property]));

		return hashUtility.hash(runningPasswords);
	}

	function readState(key: string): boolean
	{
		if (encryptedDataState.loadedFile)
		{
			return true;
		}

		// if the key is wrong there is a good chance that the json will fail when parsing, but its still possible to produce valid json that isn't right
		try
		{
			const [success, data]: [boolean, EncryptedDataState] = dataFile.read<EncryptedDataState>(key);
			if (!success)
			{
				throw ('Unable to read data file');
			}

			if (data.passwordHash)
			{
				if (calculateHash(key, data.passwords, 'password') == data.passwordHash)
				{
					assignState(data);
					return true;
				}
			}
			else if (data.valueHash)
			{
				if (calculateHash(key, data.nameValuePairs, 'value') == data.valueHash)
				{
					assignState(data);
					return true;
				}
			}
		}
		catch (e: any)
		{
			return false;
		}

		function assignState(state: EncryptedDataState)
		{
			Object.assign(encryptedDataState, state);
			encryptedDataState.loadedFile = true;

			encryptedDataState.passwords = [];
			encryptedDataState.nameValuePairs = [];

			state.passwords.forEach(p => encryptedDataState.passwords.push(usePasswordStore(key, p, true)));
			state.nameValuePairs.forEach(nvp => encryptedDataState.nameValuePairs.push(useNameValuePairStore(key, nvp, true)));
		}

		return false;
	}

	function checkKeyUpdatePasswordHash(key: string, newPassword: string): boolean
	{
		let runningPasswords: string = "";
		encryptedDataState.passwords.forEach(p => runningPasswords += cryptUtility.decrypt(key, p.password));

		if (encryptedDataState.passwordHash === "" || hashUtility.hash(runningPasswords) == encryptedDataState.passwordHash)
		{
			runningPasswords += newPassword;
			encryptedDataState.passwordHash = hashUtility.hash(runningPasswords);

			return true;
		}

		return false;
	}

	function checkKeyUpdateValueHash(key: string, newValue: string): boolean
	{
		let runningValues: string = "";
		encryptedDataState.nameValuePairs.forEach(nvp => runningValues += cryptUtility.decrypt(key, nvp.value));

		if (encryptedDataState.valueHash === "" || hashUtility.hash(runningValues) == encryptedDataState.valueHash)
		{
			runningValues += newValue;
			encryptedDataState.valueHash = hashUtility.hash(runningValues);

			return true;
		}

		return false;
	}

	function updateDuplicatePasswordOrValueIndex<T extends IIdentifiable & (PasswordStore | NameValuePairStore)>
		(key: string, value: T, property: string, allValues: T[], duplicateValues: Dictionary<string[]>)
	{
		const potentialDupllicates: T[] = allValues.filter(v => v.id != value.id);
		const decryptedValue: string = cryptUtility.decrypt(key, value[property]);

		if (!duplicateValues[value.id])
		{
			duplicateValues[value.id] = [];
		}

		potentialDupllicates.forEach(d =>
		{
			if (!duplicateValues[d.id])
			{
				duplicateValues[d.id] = [];
			}

			const potentialDuplicateDecryptedValue: string = cryptUtility.decrypt(key, d[property]);
			if (decryptedValue == potentialDuplicateDecryptedValue)
			{
				if (!duplicateValues[value.id].includes(d.id))
				{
					value.isDuplicate = true;
					duplicateValues[value.id].push(d.id)
				}

				if (!duplicateValues[d.id].includes(value.id))
				{
					allValues.filter(v => v.id == d.id)[0].isDuplicate = true;
					duplicateValues[d.id].push(value.id);
				}
			}
			else
			{
				if (duplicateValues[value.id].includes(d.id))
				{
					duplicateValues[value.id].splice(duplicateValues[value.id].indexOf(d.id), 1);
				}

				if (duplicateValues[d.id].includes(value.id))
				{
					duplicateValues[d.id].splice(duplicateValues[d.id].indexOf(value.id), 1);
				}

				if (duplicateValues[d.id].length == 0)
				{
					allValues.filter(v => v.id == d.id)[0].isDuplicate = false;
					delete duplicateValues[d.id];
				}
			}
		});

		if (duplicateValues[value.id].length == 0)
		{
			value.isDuplicate = false;
			delete duplicateValues[value.id];
		}
	}

	function removeValueFromDuplicates<T extends IIdentifiable & (PasswordStore | NameValuePairStore)>
		(value: T, duplicateValues: Dictionary<string[]>)
	{
		if (!duplicateValues[value.id])
		{
			return;
		}

		duplicateValues[value.id].forEach(v =>
		{
			if (!duplicateValues[v])
			{
				return;
			}

			if (duplicateValues[v].includes(value.id))
			{
				duplicateValues[v].splice(duplicateValues[v].indexOf(value.id), 1);
			}

			if (duplicateValues[v].length == 0)
			{
				delete duplicateValues[v];
			}
		});

		delete duplicateValues[value.id];
	}

	// --- Public ---
	const oldPasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isOld).map(p => p.id));
	const weakPasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isWeak).map(p => p.id));
	const containsLoginPasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.containsLogin).map(p => p.id));
	const duplicatePasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isDuplicate).map(p => p.id));
	const duplicatePasswordsLength: ComputedRef<number> = computed(() => Object.keys(encryptedDataState.duplicatePasswords).length);
	const safePasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isSafe).map(p => p.id));

	const oldNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.isOld).map(nvp => nvp.id));
	const weakVerbalValues: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.valueType == NameValuePairType.Verbal && nvp.isWeak).map(nvp => nvp.id));
	const weakPasscodeValues: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.valueType == NameValuePairType.Passcode && nvp.isWeak).map(nvp => nvp.id));
	const duplicateNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.isDuplicate).map(nvp => nvp.id));
	const duplicateNameValuePairsLength: ComputedRef<number> = computed(() => Object.keys(encryptedDataState.duplicateNameValuePairs).length);
	const safeNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.isSafe).map(nvp => nvp.id));

	const unpinnedPasswords: ComputedRef<PasswordStore[]> = computed(() => encryptedDataState.passwords.filter(p => !p.isPinned));
	const unpinnedValues: ComputedRef<NameValuePairStore[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => !nvp.isPinned));

	function init(_: Stores)
	{
	}

	function checkKey(key: string): boolean
	{
		if (!canAuthenticateKey())
		{
			return true;
		}

		if (encryptedDataState.loadedFile)
		{
			if (encryptedDataState.passwordHash)
			{
				return calculateHash(key, encryptedDataState.passwords, "password") == encryptedDataState.passwordHash;
			}
			else if (encryptedDataState.valueHash)
			{
				return calculateHash(key, encryptedDataState.nameValuePairs, "value") == encryptedDataState.valueHash;
			}
		}
		else
		{
			return readState(key);
		}

		return false;
	}

	function addPassword(key: string, password: Password): boolean
	{
		if (!checkKeyUpdatePasswordHash(key, password.password))
		{
			return false;
		}

		password.id = generator.uniqueId(encryptedDataState.passwords);

		const passwordStore: PasswordStore = usePasswordStore(key, password);
		encryptedDataState.passwords.push(passwordStore);

		updateDuplicatePasswordOrValueIndex(key, passwordStore, "password", encryptedDataState.passwords, encryptedDataState.duplicatePasswords);

		encryptedDataState.currentAndSafePasswords.current.push(encryptedDataState.currentAndSafePasswords.current.length == 0 ? 0 :
			encryptedDataState.currentAndSafePasswords.current[encryptedDataState.currentAndSafePasswords.current.length - 1] + 1);
		encryptedDataState.currentAndSafePasswords.safe.push(safePasswords.value.length);

		stores.groupStore.syncGroupsAfterPasswordOrValueWasAdded(DataType.Passwords, password);

		writeState(key);
		return true;
	}

	function updatePassword(password: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
		updatedSecurityQuestionAnswers: string[], key: string): void
	{
		if (passwordWasUpdated && !checkKeyUpdatePasswordHash(key, password.password))
		{
			return;
		}

		// TODO: change to using a dictionary of password Ids for lookup
		const currentPassword: PasswordStore[] = encryptedDataState.passwords.filter(p => p.id == password.id);
		if (currentPassword.length != 1)
		{
			// TODO: show toast message
			return;
		}

		// get groups before updating
		const addedGroups: string[] = password.groups.filter(currentGroup => !currentPassword[0].groups.includes(currentGroup));
		const removedGroups: string[] = currentPassword[0].groups.filter(previousGroup => !password.groups.includes(previousGroup));

		currentPassword[0].updatePassword(key, password, passwordWasUpdated, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers);

		if (passwordWasUpdated)
		{
			updateDuplicatePasswordOrValueIndex(key, currentPassword[0], "password", encryptedDataState.passwords, encryptedDataState.duplicatePasswords);

			encryptedDataState.currentAndSafePasswords.current.push(encryptedDataState.currentAndSafePasswords.current.length == 0 ? 0 :
				encryptedDataState.currentAndSafePasswords.current[encryptedDataState.currentAndSafePasswords.current.length - 1] + 1);
			encryptedDataState.currentAndSafePasswords.safe.push(safePasswords.value.length);
		}

		stores.groupStore.syncGroupsAfterPasswordOrValueWasUpdated(DataType.Passwords, addedGroups, removedGroups, password.id);
		stores.filterStore.syncFiltersForValues(stores.filterStore.passwordFilters, [password as PasswordStore], "passwords");


		writeState(key);
	}

	function deletePassword(key: string, password: PasswordStore)
	{
		// empty the password so we can just run it through the duplicate logic since no other passwords should be empty
		removeValueFromDuplicates(password, encryptedDataState.duplicatePasswords);

		encryptedDataState.passwords.splice(encryptedDataState.passwords.indexOf(password), 1);

		encryptedDataState.currentAndSafePasswords.current.push(encryptedDataState.currentAndSafePasswords.current.length == 0 ? 0 :
			encryptedDataState.currentAndSafePasswords.current[encryptedDataState.currentAndSafePasswords.current.length - 1] + 1);
		encryptedDataState.currentAndSafePasswords.safe.push(safePasswords.value.length);

		encryptedDataState.passwordHash = calculateHash(key, encryptedDataState.passwords, "password");

		// remove from groups and filters
		stores.groupStore.removeValueFromGroups(DataType.Passwords, password);
		stores.filterStore.removeValueFromFilers(DataType.Passwords, password);

		writeState(key);
	}

	function addNameValuePair(key: string, nameValuePair: NameValuePair): boolean
	{
		if (!checkKeyUpdateValueHash(key, nameValuePair.value))
		{
			return false;
		}

		nameValuePair.id = generator.uniqueId(encryptedDataState.nameValuePairs);

		const nameValuePairStore: NameValuePairStore = useNameValuePair(key, nameValuePair);
		encryptedDataState.nameValuePairs.push(nameValuePairStore);

		updateDuplicatePasswordOrValueIndex(key, nameValuePairStore, "value", encryptedDataState.nameValuePairs, encryptedDataState.duplicateNameValuePairs);

		encryptedDataState.currentAndSafeValues.current.push(encryptedDataState.currentAndSafeValues.current.length == 0 ? 0 :
			encryptedDataState.currentAndSafeValues.current[encryptedDataState.currentAndSafeValues.current.length - 1] + 1);
		encryptedDataState.currentAndSafeValues.safe.push(safeNameValuePairs.value.length);

		stores.groupStore.syncGroupsAfterPasswordOrValueWasAdded(DataType.NameValuePairs, nameValuePair);

		writeState(key);
		return true;
	}

	function updateNameValuePair(nameValuePair: NameValuePair, valueWasUpdated: boolean, key: string): void
	{
		if (valueWasUpdated && !checkKeyUpdateValueHash(key, nameValuePair.value))
		{
			return;
		}

		const currentValue: NameValuePairStore[] = encryptedDataState.nameValuePairs.filter(nvp => nvp.id == nameValuePair.id);
		if (currentValue.length != 1)
		{
			// TODO: show toast message
			return;
		}

		// get groups before updating
		const addedGroups: string[] = nameValuePair.groups.filter(currentGroup => !currentValue[0].groups.includes(currentGroup));
		const removedGroups: string[] = currentValue[0].groups.filter(previousGroup => !nameValuePair.groups.includes(previousGroup));

		currentValue[0].updateValue(key, nameValuePair, valueWasUpdated);

		if (valueWasUpdated)
		{
			updateDuplicatePasswordOrValueIndex(key, currentValue[0], "value", encryptedDataState.nameValuePairs, encryptedDataState.duplicateNameValuePairs);

			encryptedDataState.currentAndSafeValues.current.push(encryptedDataState.currentAndSafeValues.current.length == 0 ? 0 :
				encryptedDataState.currentAndSafeValues.current[encryptedDataState.currentAndSafeValues.current.length - 1] + 1);
			encryptedDataState.currentAndSafeValues.safe.push(safeNameValuePairs.value.length);
		}

		stores.groupStore.syncGroupsAfterPasswordOrValueWasUpdated(DataType.NameValuePairs, addedGroups, removedGroups, nameValuePair.id);
		stores.filterStore.syncFiltersForValues(stores.filterStore.nameValuePairFilters, [nameValuePair as NameValuePairStore], "nameValuePairs");

		writeState(key);
	}

	function deleteNameValuePair(key: string, nameValuePair: NameValuePairStore)
	{
		// empty the password so we can just run it through the duplicate logic since no other passwords should be empty
		removeValueFromDuplicates(nameValuePair, encryptedDataState.duplicateNameValuePairs);

		encryptedDataState.nameValuePairs.splice(encryptedDataState.nameValuePairs.indexOf(nameValuePair), 1);

		encryptedDataState.currentAndSafeValues.current.push(encryptedDataState.currentAndSafeValues.current.length == 0 ? 0 :
			encryptedDataState.currentAndSafeValues.current[encryptedDataState.currentAndSafeValues.current.length - 1] + 1);
		encryptedDataState.currentAndSafeValues.safe.push(safeNameValuePairs.value.length);

		encryptedDataState.valueHash = calculateHash(key, encryptedDataState.nameValuePairs, "value");

		// remove from groups and filters
		stores.groupStore.removeValueFromGroups(DataType.NameValuePairs, nameValuePair);
		stores.filterStore.removeValueFromFilers(DataType.NameValuePairs, nameValuePair);

		writeState(key);
	}

	function addRemoveGroupsFromPasswordValue(addedValues: string[], removedValues: string[], group: Group)
	{
		if (group.type == DataType.Passwords)
		{
			addedValues.forEach(v =>
			{
				const password: PasswordStore = encryptedDataState.passwords.filter(p => p.id == v)[0];
				if (!password.groups.includes(group.id))
				{
					password.groups.push(group.id)
				}
			});

			removedValues.forEach(v =>
			{
				const password: PasswordStore = encryptedDataState.passwords.filter(p => p.id == v)[0];
				if (password.groups.includes(group.id))
				{
					password.groups.splice(password.groups.indexOf(v), 1);
				}
			});
		}
		else if (group.type == DataType.NameValuePairs)
		{
			addedValues.forEach(v =>
			{
				const nameValuePair: NameValuePairStore = encryptedDataState.nameValuePairs.filter(nvp => nvp.id == v)[0];
				if (!nameValuePair.groups.includes(group.id))
				{
					nameValuePair.groups.push(group.id);
				}
			});

			removedValues.forEach(v =>
			{
				const nameValuePair: NameValuePairStore = encryptedDataState.nameValuePairs.filter(nvp => nvp.id == v)[0];
				if (nameValuePair.groups.includes(group.id))
				{
					nameValuePair.groups.splice(nameValuePair.groups.indexOf(v), 1);
				}
			});
		}
	}

	function removeFilterFromValues(filter: Filter)
	{
		if (filter.type == DataType.Passwords)
		{
			encryptedDataState.passwords.forEach(p =>
			{
				if (p.filters.includes(filter.id))
				{
					p.filters.splice(p.filters.indexOf(filter.id), 1);
				}
			});
		}
		else if (filter.type == DataType.NameValuePairs)
		{
			encryptedDataState.nameValuePairs.forEach(nvp =>
			{
				if (nvp.filters.includes(filter.id))
				{
					nvp.filters.splice(nvp.filters.indexOf(filter.id), 1);
				}
			});
		}
	}

	function removeGroupFromValues(group: Group)
	{
		if (group.type == DataType.Passwords)
		{
			encryptedDataState.passwords.forEach(p =>
			{
				if (p.groups.includes(group.id))
				{
					p.groups.splice(p.groups.indexOf(group.id), 1);
				}
			});
		}
		else if (group.type == DataType.NameValuePairs)
		{
			encryptedDataState.nameValuePairs.forEach(nvp =>
			{
				if (nvp.groups.includes(group.id))
				{
					nvp.groups.splice(nvp.groups.indexOf(group.id), 1);
				}
			});
		}
	}

	function toggleAtRiskModels(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.Passwords)
		{
			if (encryptedDataState.activeAtRiskPasswordType != atRiskType)
			{
				encryptedDataState.activeAtRiskPasswordType = atRiskType;
				return;
			}

			encryptedDataState.activeAtRiskPasswordType = AtRiskType.None;
		}
		else if (dataType == DataType.NameValuePairs)
		{
			if (encryptedDataState.activeAtRiskValueType != atRiskType)
			{
				encryptedDataState.activeAtRiskValueType = atRiskType;
				return;
			}

			encryptedDataState.activeAtRiskValueType = AtRiskType.None;
		}
	}

	return {
		get passwords() { return encryptedDataState.passwords; },
		get unpinnedPasswords() { return unpinnedPasswords.value; },
		get nameValuePairs() { return encryptedDataState.nameValuePairs; },
		get unpinnedValues() { return unpinnedValues.value; },
		oldPasswords,
		weakPasswords,
		containsLoginPasswords,
		duplicatePasswords,
		get duplicatePasswordsLength() { return duplicatePasswordsLength.value; },
		oldNameValuePairs,
		duplicateNameValuePairs,
		get duplicateNameValuePairsLength() { return duplicateNameValuePairsLength.value; },
		weakVerbalValues,
		weakPasscodeValues,
		get currentAndSafePasswords() { return encryptedDataState.currentAndSafePasswords; },
		get currentAndSafeValues() { return encryptedDataState.currentAndSafeValues; },
		get activeAtRiskPasswordType() { return encryptedDataState.activeAtRiskPasswordType; },
		get activeAtRiskPasswords() { return encryptedDataState.activeAtRiskPasswords; },
		get activeAtRiskValueType() { return encryptedDataState.activeAtRiskValueType; },
		get activeAtRiskValues() { return encryptedDataState.activeAtRiskValues; },
		canAuthenticateKey,
		init,
		readState,
		resetToDefault,
		checkKey,
		addPassword,
		updatePassword,
		addNameValuePair,
		updateNameValuePair,
		addRemoveGroupsFromPasswordValue,
		deletePassword,
		deleteNameValuePair,
		removeFilterFromValues,
		removeGroupFromValues,
		toggleAtRiskModels
	};
}
