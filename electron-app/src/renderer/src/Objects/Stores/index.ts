import { reactive } from "vue";
import useAppStore, { AppStore } from "./AppStore";
import useFilterStore, { FilterStore, FilterStoreState } from "./FilterStore";
import useGroupStore, { GroupStore, GroupStoreState } from "./GroupStore";
import useSettingsStore, { SettingsStore } from "./SettingsStore";
import usePasswordStore, { PasswordStore, PasswordStoreState } from "./PasswordStore";
import useValueStore, { ValueStore, ValueStoreState } from "./ValueStore";

export interface Store
{
	readState: (key: string) => Promise<boolean>;
	resetToDefault: () => void;
	toString: () => string;
}

export interface DataStoreStates
{
	filterStoreState: FilterStoreState;
	groupStoreState: GroupStoreState;
	passwordStoreState: PasswordStoreState;
	valueStoreState: ValueStoreState;
}

export interface AuthenticationStore extends Store
{
	canAuthenticateKeyBeforeEntry: () => Promise<boolean>; 		// checks if file exists
	canAuthenticateKeyAfterEntry: () => boolean; 				// checks if the store has data.
	checkKeyBeforeEntry: (key: string) => Promise<boolean>;
	checkKeyAfterEntry: (key: string) => Promise<boolean>;
	getState: () => any;
	updateState: (key: string, state: any) => Promise<void>;
}

interface StoreState
{
	needsAuthentication: boolean;
}

const storeState: StoreState = reactive({ needsAuthentication: true });
export interface Stores
{
	needsAuthentication: boolean;
	settingsStore: SettingsStore;
	appStore: AppStore;
	filterStore: FilterStore;
	groupStore: GroupStore;
	passwordStore: PasswordStore;
	valueStore: ValueStore;
	canAuthenticateKeyBeforeEntry: () => Promise<[boolean, boolean, boolean, boolean]>;
	canAuthenticateKeyAfterEntry: () => boolean;
	checkKeyBeforeEntry: (key: string) => Promise<boolean>;
	checkKeyAfterEntry: (key: string) => Promise<boolean>;
	loadStoreData: (key: string) => Promise<any>;
	resetStoresToDefault: () => void;
	init: () => Promise<void>;
	syncToServer: (key: string, incrementUserDataVersion?: boolean) => Promise<void>;
	getStates: () => DataStoreStates;
	updateAllStates: (key: string, states: DataStoreStates) => Promise<[void, void, void, void]>;
}

async function init(): Promise<void>
{
	return checkNeedsAuthenticating();
}

async function checkNeedsAuthenticating(): Promise<void>
{
	stores.needsAuthentication = (await canAuthenticateKeyBeforeEntry()).some((v) => v);
}

function canAuthenticateKeyBeforeEntry(): Promise<[boolean, boolean, boolean, boolean]>
{
	return Promise.all([
		stores.passwordStore.canAuthenticateKeyBeforeEntry(),
		stores.valueStore.canAuthenticateKeyBeforeEntry(),
		stores.filterStore.canAuthenticateKeyBeforeEntry(),
		stores.groupStore.canAuthenticateKeyBeforeEntry()
	]);
}

function canAuthenticateKeyAfterEntry(): boolean
{
	return stores.passwordStore.canAuthenticateKeyAfterEntry() ||
		stores.valueStore.canAuthenticateKeyAfterEntry() ||
		stores.filterStore.canAuthenticateKeyAfterEntry() ||
		stores.groupStore.canAuthenticateKeyAfterEntry();
}

async function checkKeyBeforeEntry(key: string): Promise<boolean>
{
	if (await stores.passwordStore.canAuthenticateKeyBeforeEntry())
	{
		return await stores.passwordStore.checkKeyBeforeEntry(key);
	}

	if (await stores.valueStore.canAuthenticateKeyBeforeEntry())
	{
		return await stores.valueStore.checkKeyBeforeEntry(key);
	}

	if (await stores.filterStore.canAuthenticateKeyBeforeEntry())
	{
		return await stores.filterStore.checkKeyBeforeEntry(key);
	}

	if (await stores.groupStore.canAuthenticateKeyBeforeEntry())
	{
		return await stores.groupStore.checkKeyBeforeEntry(key);
	}

	// no master key has been setup yet, anything goes
	return true;
}

async function checkKeyAfterEntry(key: string): Promise<boolean>
{
	if (stores.passwordStore.canAuthenticateKeyAfterEntry())
	{
		return stores.passwordStore.checkKeyAfterEntry(key);
	}

	if (stores.valueStore.canAuthenticateKeyAfterEntry())
	{
		return stores.valueStore.checkKeyAfterEntry(key);
	}

	if (stores.filterStore.canAuthenticateKeyAfterEntry())
	{
		return stores.filterStore.checkKeyAfterEntry(key);
	}

	if (stores.groupStore.canAuthenticateKeyAfterEntry())
	{
		return stores.groupStore.checkKeyAfterEntry(key);
	}

	// no master key has been setup yet, anything goes
	return true;
}

async function loadStoreData(key: string): Promise<any>
{
	const result = await Promise.all(
		[
			stores.appStore.readState(key),
			stores.settingsStore.readState(key),
			stores.passwordStore.readState(key),
			stores.valueStore.readState(key),
			stores.filterStore.readState(key),
			stores.groupStore.readState(key)
		]);

	// Only need to check from server if reading in failed. the server can never be newer than the file
	if (result.some(r => !r))
	{
		if (stores.settingsStore.enableSyncing)
		{
			//const response = await window.api.server.getUserData();

			if (!result[0])
			{
				// override app state
			}
			else if (!result[1])
			{
				// override settings stase
			}
			else if (!result[2])
			{
				// override encrypted data state
			}
			else if (!result[3])
			{
				// override filter state
			}
			else if (!result[4])
			{
				// orverride group state
			}
		}
	}
}

function resetStoresToDefault()
{
	stores.settingsStore.resetToDefault();
	stores.appStore.resetToDefault();
	stores.passwordStore.resetToDefault();
	stores.valueStore.resetToDefault();
	stores.filterStore.resetToDefault();
	stores.groupStore.resetToDefault();
	checkNeedsAuthenticating();
}

async function syncToServer(key: string, incrementUserDataVersion: boolean = true): Promise<void>
{
	if (!stores.settingsStore.enableSyncing)
	{
		return;
	}

	if (incrementUserDataVersion)
	{
		await stores.appStore.incrementUserDataVersion(key);
	}

	// window.api.server.syncUserData(key, stores.appStore.toString(), stores.settingsStore.toString(), stores.encryptedDataStore.toString(),
	// 	stores.filterStore.toString(), stores.groupStore.toString());
}

function getStates(): DataStoreStates
{
	return {
		filterStoreState: stores.filterStore.getState(),
		groupStoreState: stores.groupStore.getState(),
		passwordStoreState: stores.passwordStore.getState(),
		valueStoreState: stores.valueStore.getState()
	}
}

// TODO: MAKE SURE WE ARE ONLY CALLING THIS WITH VALID STATES AND A SUCCESSFUL REQEUST. OTHERWISE ALL OF THEIR DATA WILL BE LOST
function updateAllStates(key: string, states: DataStoreStates): Promise<[void, void, void, void]>
{
	return Promise.all([
		stores.filterStore.updateState(key, states.filterStoreState),
		stores.groupStore.updateState(key, states.groupStoreState),
		stores.passwordStore.updateState(key, states.passwordStoreState),
		stores.valueStore.updateState(key, states.valueStoreState)
	]);
}

export const stores: Stores =
{
	get needsAuthentication() { return storeState.needsAuthentication },
	set needsAuthentication(value: boolean) { storeState.needsAuthentication = value },
	settingsStore: useSettingsStore(),
	appStore: useAppStore(),
	filterStore: useFilterStore(),
	groupStore: useGroupStore(),
	passwordStore: usePasswordStore(),
	valueStore: useValueStore(),
	canAuthenticateKeyBeforeEntry,
	canAuthenticateKeyAfterEntry,
	checkKeyBeforeEntry,
	checkKeyAfterEntry,
	loadStoreData,
	resetStoresToDefault,
	init,
	syncToServer,
	getStates,
	updateAllStates
}

// additional setup that requires another store. Prevents circular dependencies
stores.settingsStore.init(stores);
stores.appStore.init(stores);
