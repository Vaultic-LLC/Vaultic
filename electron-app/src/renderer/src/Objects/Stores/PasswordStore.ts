import { Password, CurrentAndSafeStructure, AtRiskType } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import crateReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { DataType } from "../../Types/Table";
import { Dictionary } from "../../Types/DataStructures";
import { AuthenticationStore, Stores, stores } from ".";
import fileHelper from "@renderer/Helpers/fileHelper";
import createReactivePassword from "./ReactivePassword";

export interface PasswordStoreState
{
	passwordHashSalt: string;
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
	toggleAtRiskModels: (dataType: DataType, atRiskType: AtRiskType) => void;
	addEvent: (event: PasswordStoreEvent, callback: () => void) => void;
	removeEvent: (event: PasswordStoreEvent, callback: () => void) => void;
}

let encryptedDataState: PasswordStoreState;
let loadedFile: boolean = false;

export default function usePasswordStore(): PasswordStore
{
	encryptedDataState = reactive(defaultState());
	const events: Dictionary<{ (): void }[]> = {};

	// -- Generic Store Methods
	function defaultState(): PasswordStoreState
	{
		loadedFile = false;

		return {
			passwords: [],
			passwordHash: "",
			passwordHashSalt: "",
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
		encryptedDataState.passwords = encryptedDataState.passwords.map(p => createReactivePassword(p));

		await writeState(key);
	}

	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
	{
		return window.api.files.password.exists();
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
			return window.api.files.password.empty();
		}
		else
		{
			// TODO: error handling
			return fileHelper.write(key, encryptedDataState, window.api.files.password);
		}
	}

	function resetToDefault()
	{
		Object.assign(encryptedDataState, defaultState());
	}

	// --- Private Helper Methods ---
	async function calculateHash<T extends { [key: string]: string }>(key: string, values: T[], salt: string)
	{
		let runningKeys: string = "";
		for (const password of values)
		{
			runningKeys += await window.api.utilities.crypt.decrypt(key, password.key);
		}

		return window.api.utilities.hash.hash(runningKeys, salt);
	}

	async function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (loadedFile)
			{
				resolve(true);
			}
			// if the key is wrong there is a good chance that the json will fail when parsing, but its still possible to produce valid json that isn't right
			try
			{
				fileHelper.read<PasswordStoreState>(key, window.api.files.password).then(async (data: PasswordStoreState) =>
				{
					if (data.passwordHash)
					{
						if (await calculateHash(key, data.passwords, data.passwordHashSalt) == await window.api.utilities.crypt.decrypt(key, data.passwordHash))
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
			loadedFile = true;

			encryptedDataState.passwords = [];

			state.passwords.forEach(p =>
			{
				const ps: ReactivePassword = crateReactivePassword(p);
				encryptedDataState.passwords.push(ps);
			});
		}
	}

	// --- Public ---
	const oldPasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isOld).map(p => p.id));
	const weakPasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isWeak).map(p => p.id));
	const containsLoginPasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.containsLogin).map(p => p.id));
	const duplicatePasswords: ComputedRef<string[]> = computed(() => encryptedDataState.passwords.filter(p => p.isDuplicate).map(p => p.id));
	const duplicatePasswordsLength: ComputedRef<number> = computed(() => Object.keys(encryptedDataState.duplicatePasswords).length);

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

		if (loadedFile)
		{
			if (encryptedDataState.passwordHash)
			{
				return await calculateHash(key, encryptedDataState.passwords, encryptedDataState.passwordHashSalt) == await window.api.utilities.crypt.decrypt(key, encryptedDataState.passwordHash);
			}
		}
		else
		{
			return await readState(key);
		}

		return false;
	}

	async function checkKeyAfterEntry(key: string): Promise<boolean>
	{
		if (encryptedDataState.passwordHash)
		{
			return await calculateHash(key, encryptedDataState.passwords, encryptedDataState.passwordHashSalt) == await window.api.utilities.crypt.decrypt(key, encryptedDataState.passwordHash);
		}

		return false;
	}

	async function addPassword(key: string, password: Password): Promise<boolean>
	{
		const addPasswordData = {
			Sync: false,
			OldDays: stores.settingsStore.oldPasswordDays,
			Key: key,
			Password: password,
			...stores.getStates()
		};

		const data: any = await window.api.server.password.add(JSON.stringify(addPasswordData));
		await stores.updateAllStates(key, data);

		events["onPasswordChange"]?.forEach(c => c());
		return true;
	}

	async function updatePassword(password: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
		updatedSecurityQuestionAnswers: string[], key: string): Promise<void>
	{
		const updatedPasswordData = {
			Sync: false,
			OldDays: stores.settingsStore.oldPasswordDays,
			Key: key,
			Password: password,
			PasswordWasUpdated: passwordWasUpdated,
			UpdatedSecurityQuestionQuestions: updatedSecurityQuestionQuestions,
			UpdatedSecurityQuestionAnswers: updatedSecurityQuestionAnswers,
			...stores.getStates()
		};

		const data: any = await window.api.server.password.update(JSON.stringify(updatedPasswordData));
		await stores.updateAllStates(key, data);

		events["onPasswordChange"]?.forEach(c => c());
	}

	async function deletePassword(key: string, password: ReactivePassword): Promise<void>
	{
		const deletePasswordData = {
			Sync: false,
			Key: key,
			Password: password,
			...stores.getStates()
		};

		const data: any = await window.api.server.password.delete(JSON.stringify(deletePasswordData));
		await stores.updateAllStates(key, data);

		events["onPasswordChange"]?.forEach(c => c());
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
		deletePassword,
		toggleAtRiskModels,
		addEvent,
		removeEvent
	};
}
