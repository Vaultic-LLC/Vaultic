import { Password, CurrentAndSafeStructure, IIdentifiable, AtRiskType } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import crateReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { DataType, Filter, Group } from "../../Types/Table";
import { Dictionary } from "../../Types/DataStructures";
import { AuthenticationStore, Stores, stores } from ".";
import { generateUniqueID } from "@renderer/Helpers/generatorHelper";
import fileHelper from "@renderer/Helpers/fileHelper";

export interface PasswordStoreState
{
	loadedFile: boolean;
	passwords: ReactivePassword[];
	passwordHash: string;
	duplicatePasswords: Dictionary<string[]>;
	currentAndSafePasswords: CurrentAndSafeStructure;
}

type PasswordStoreEvent = "onPasswordChange" | "onValueChange";

export interface PasswordStore extends AuthenticationStore
{
	passwords: ReactivePassword[];
	unpinnedPasswords: ReactivePassword[];
	oldPasswords: ComputedRef<string[]>;
	weakPasswords: ComputedRef<string[]>;
	containsLoginPasswords: ComputedRef<string[]>;
	duplicatePasswords: ComputedRef<string[]>;
	duplicatePasswordsLength: number;
	currentAndSafePasswords: CurrentAndSafeStructure;
	activeAtRiskPasswordType: AtRiskType;
	init: (stores: Stores) => void;
	addPassword: (key: string, password: Password) => Promise<boolean>;
	updatePassword: (password: Password, passwordWasUpdated: boolean,
		updatedSecurityQuestionQuestions: string[],
		updatedSecurityQuestionAnswers: string[], key: string) => Promise<void>;
	deletePassword: (key: string, password: ReactivePassword) => Promise<void>;
	addRemoveGroupsFromPasswordValue: (key: string, addedValues: string[], removedValues: string[], group: Group) => Promise<void>;
	removeFilterFromValues: (key: string, filter: Filter) => Promise<void>;
	removeGroupFromValues: (key: string, group: Group) => Promise<void>;
	toggleAtRiskModels: (dataType: DataType, atRiskType: AtRiskType) => void;
	addEvent: (event: PasswordStoreEvent, callback: () => void) => void;
	removeEvent: (event: PasswordStoreEvent, callback: () => void) => void;
}

let encryptedDataState: PasswordStoreState;

export default function usePasswordStore(): PasswordStore
{
	encryptedDataState = reactive(defaultState());
	const events: Dictionary<{ (): void }[]> = {};

	// -- Generic Store Methods
	function defaultState(): PasswordStoreState
	{
		return {
			loadedFile: false,
			passwords: [],
			passwordHash: "",
			duplicatePasswords: {},
			currentAndSafePasswords: { current: [], safe: [] },
		};
	}

	function toString()
	{
		return JSON.stringify(encryptedDataState);
	}

	function getState(): PasswordStoreState
	{
		return encryptedDataState;
	}

	async function updateState(key: string, state: PasswordStoreState): Promise<void>
	{
		Object.assign(encryptedDataState, state);
		await writeState(key);
	}

	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
	{
		return window.api.files.encryptedData.exists();
	}

	function canAuthenticateKeyAfterEntry(): boolean
	{
		return encryptedDataState.passwords.length > 0;
	}

	function writeState(key: string): Promise<void>
	{
		if (encryptedDataState.passwords.length == 0)
		{
			// TODO: error handling
			return window.api.files.encryptedData.empty();
		}
		else
		{
			// TODO: error handling
			return fileHelper.write(key, encryptedDataState, window.api.files.encryptedData);
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
		values.forEach(v => runningPasswords += window.api.utilities.crypt.decrypt(key, v[property]));

		return window.api.utilities.hash.hash(runningPasswords);
	}

	async function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (encryptedDataState.loadedFile)
			{
				resolve(true);
			}
			// if the key is wrong there is a good chance that the json will fail when parsing, but its still possible to produce valid json that isn't right
			try
			{
				fileHelper.read<PasswordStoreState>(key, window.api.files.encryptedData).then(async (data: PasswordStoreState) =>
				{
					if (data.passwordHash)
					{
						if (await calculateHash(key, data.passwords, 'password') == await window.api.utilities.crypt.decrypt(key, data.passwordHash))
						{
							await assignState(data);
							resolve(true);
						}
					}

					// this happens when an exception is thrown while trying to parse / read in file
					resolve(false);
				}).catch(() =>
				{
					resolve(false);
				});
			}
			catch (e: any)
			{
				resolve(false);
			}
		});

		async function assignState(state: PasswordStoreState): Promise<void>
		{
			Object.assign(encryptedDataState, state);
			encryptedDataState.loadedFile = true;

			encryptedDataState.passwords = [];

			state.passwords.forEach(async p =>
			{
				const ps: ReactivePassword = await crateReactivePassword(key, p, true);
				encryptedDataState.passwords.push(ps);
			});
		}
	}

	async function checkKeyUpdatePasswordHash(key: string, newPassword: string): Promise<boolean>
	{
		let runningPasswords: string = "";
		encryptedDataState.passwords.forEach(p => runningPasswords += window.api.utilities.crypt.decrypt(key, p.password));

		if (encryptedDataState.passwordHash === "" || window.api.utilities.hash.hash(runningPasswords) == window.api.utilities.crypt.decrypt(key, encryptedDataState.passwordHash))
		{
			runningPasswords += newPassword;
			encryptedDataState.passwordHash = await window.api.utilities.crypt.encrypt(key, await window.api.utilities.hash.hash(runningPasswords));

			return true;
		}

		return false;
	}

	async function updateDuplicatePasswordOrValueIndex<T extends IIdentifiable & (ReactivePassword)>
		(key: string, value: T, property: string, allValues: T[], duplicateValues: Dictionary<string[]>)
	{
		const potentialDupllicates: T[] = allValues.filter(v => v.id != value.id);
		const decryptedValue: string = await window.api.utilities.crypt.decrypt(key, value[property]);

		if (!duplicateValues[value.id])
		{
			duplicateValues[value.id] = [];
		}

		potentialDupllicates.forEach(async d =>
		{
			if (!duplicateValues[d.id])
			{
				duplicateValues[d.id] = [];
			}

			const potentialDuplicateDecryptedValue: string = await window.api.utilities.crypt.decrypt(key, d[property]);
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

	function removeValueFromDuplicates<T extends IIdentifiable & (ReactivePassword)>
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

	const unpinnedPasswords: ComputedRef<ReactivePassword[]> = computed(() => encryptedDataState.passwords.filter(p => !p.isPinned));
	const activeAtRiskPasswordType: Ref<AtRiskType> = ref(AtRiskType.None);

	function init(_: Stores)
	{
	}

	async function checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!await canAuthenticateKeyBeforeEntry())
		{
			return true;
		}

		if (encryptedDataState.loadedFile)
		{
			if (encryptedDataState.passwordHash)
			{
				return await calculateHash(key, encryptedDataState.passwords, "password") == await window.api.utilities.crypt.decrypt(key, encryptedDataState.passwordHash);
			}
		}
		else
		{
			return await readState(key);
		}

		return false;
	}

	function checkKeyAfterEntry(key: string): boolean
	{
		if (encryptedDataState.passwordHash)
		{
			return calculateHash(key, encryptedDataState.passwords, "password") == window.api.utilities.crypt.decrypt(key, encryptedDataState.passwordHash);
		}

		return false;
	}

	async function addPassword(key: string, password: Password): Promise<boolean>
	{
		if (!checkKeyUpdatePasswordHash(key, password.password))
		{
			return false;
		}

		password.id = generateUniqueID(encryptedDataState.passwords);

		const passwordStore: ReactivePassword = await crateReactivePassword(key, password);
		encryptedDataState.passwords.push(passwordStore);

		updateDuplicatePasswordOrValueIndex(key, passwordStore, "password", encryptedDataState.passwords, encryptedDataState.duplicatePasswords);

		encryptedDataState.currentAndSafePasswords.current.push(encryptedDataState.passwords.length);
		encryptedDataState.currentAndSafePasswords.safe.push(safePasswords.value.length);

		await stores.groupStore.syncGroupsAfterPasswordOrValueWasAdded(key, DataType.Passwords, password);

		await writeState(key);
		events["onPasswordChange"]?.forEach(c => c());
		stores.syncToServer(key);

		return true;
	}

	async function updatePassword(password: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
		updatedSecurityQuestionAnswers: string[], key: string): Promise<void>
	{
		if (passwordWasUpdated && !checkKeyAfterEntry(key))
		{
			return;
		}

		// TODO: change to using a dictionary of password Ids for lookup
		const currentPassword: ReactivePassword[] = encryptedDataState.passwords.filter(p => p.id == password.id);
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

			encryptedDataState.currentAndSafePasswords.current.push(encryptedDataState.passwords.length);
			encryptedDataState.currentAndSafePasswords.safe.push(safePasswords.value.length);

			encryptedDataState.passwordHash = await window.api.utilities.crypt.encrypt(key, await calculateHash(key, encryptedDataState.passwords, "password"));
		}

		await stores.groupStore.syncGroupsAfterPasswordOrValueWasUpdated(key, DataType.Passwords, addedGroups, removedGroups, password.id);
		await stores.filterStore.syncFiltersForValues(key, stores.filterStore.passwordFilters, [password as ReactivePassword], "passwords", true);

		await writeState(key);
		events["onPasswordChange"]?.forEach(c => c());
		stores.syncToServer(key);
	}

	async function deletePassword(key: string, password: ReactivePassword): Promise<void>
	{
		// empty the password so we can just run it through the duplicate logic since no other passwords should be empty
		removeValueFromDuplicates(password, encryptedDataState.duplicatePasswords);

		encryptedDataState.passwords.splice(encryptedDataState.passwords.indexOf(password), 1);

		encryptedDataState.currentAndSafePasswords.current.push(encryptedDataState.passwords.length);
		encryptedDataState.currentAndSafePasswords.safe.push(safePasswords.value.length);

		encryptedDataState.passwordHash = await window.api.utilities.crypt.encrypt(key, await calculateHash(key, encryptedDataState.passwords, "password"));

		// remove from groups and filters
		await stores.groupStore.removeValueFromGroups(key, DataType.Passwords, password);
		await stores.filterStore.removeValueFromFilers(key, DataType.Passwords, password);

		await writeState(key);
		events["onPasswordChange"]?.forEach(c => c());
		stores.syncToServer(key);
	}

	function addRemoveGroupsFromPasswordValue(key: string, addedValues: string[], removedValues: string[], group: Group): Promise<void>
	{
		if (group.type == DataType.Passwords)
		{
			addedValues.forEach(v =>
			{
				const password: ReactivePassword = encryptedDataState.passwords.filter(p => p.id == v)[0];
				if (!password.groups.includes(group.id))
				{
					password.groups.push(group.id)
				}
			});

			removedValues.forEach(v =>
			{
				const password: ReactivePassword = encryptedDataState.passwords.filter(p => p.id == v)[0];
				if (password.groups.includes(group.id))
				{
					password.groups.splice(password.groups.indexOf(v), 1);
				}
			});
		}

		return writeState(key);
	}

	function removeFilterFromValues(key: string, filter: Filter): Promise<void>
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

		return writeState(key);
	}

	function removeGroupFromValues(key: string, group: Group): Promise<void>
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

		return writeState(key);
	}

	function toggleAtRiskModels(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.Passwords)
		{
			if (activeAtRiskPasswordType.value != atRiskType)
			{
				activeAtRiskPasswordType.value = atRiskType;
				return;
			}

			activeAtRiskPasswordType.value = AtRiskType.None;
		}
	}

	function addEvent(event: PasswordStoreEvent, callback: () => void)
	{
		if (events[event])
		{
			events[event].push(callback);
			return;
		}

		events[event] = [callback];
	}

	function removeEvent(event: PasswordStoreEvent, callback: () => void)
	{
		if (!events[event])
		{
			return;
		}

		events[event] = events[event].filter(c => c != callback);
	}

	return {
		get passwords() { return encryptedDataState.passwords; },
		get unpinnedPasswords() { return unpinnedPasswords.value; },
		oldPasswords,
		weakPasswords,
		containsLoginPasswords,
		duplicatePasswords,
		get duplicatePasswordsLength() { return duplicatePasswordsLength.value; },
		get currentAndSafePasswords() { return encryptedDataState.currentAndSafePasswords; },
		get activeAtRiskPasswordType() { return activeAtRiskPasswordType.value; },
		getState,
		updateState,
		canAuthenticateKeyBeforeEntry,
		canAuthenticateKeyAfterEntry,
		init,
		toString,
		readState,
		resetToDefault,
		checkKeyBeforeEntry,
		checkKeyAfterEntry,
		addPassword,
		updatePassword,
		addRemoveGroupsFromPasswordValue,
		deletePassword,
		removeFilterFromValues,
		removeGroupFromValues,
		toggleAtRiskModels,
		addEvent,
		removeEvent
	};
}
