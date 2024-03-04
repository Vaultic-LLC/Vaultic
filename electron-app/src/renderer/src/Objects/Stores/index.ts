import { reactive } from "vue";
import useAppStore, { AppStore } from "./AppStore";
import useEncryptedDataStore, { EncryptedDataStore } from "./EncryptedDataStore";
import useFilterStore, { FilterStore } from "./FilterStore";
import useGroupStore, { GroupStore } from "./GroupStore";
import useSettingsStore, { SettingsStore } from "./SettingsStore";

export interface Store
{
	readState: (key: string) => Promise<boolean>;
	resetToDefault: () => void;
	toString: () => string;
}

export interface AuthenticationStore extends Store
{
	canAuthenticateKeyBeforeEntry: () => Promise<boolean>; 		// checks if file exists
	canAuthenticateKeyAfterEntry: () => boolean; 				// checks if the store has data.
	checkKeyBeforeEntry: (key: string) => Promise<boolean>;
	checkKeyAfterEntry: (key: string) => boolean;
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
	encryptedDataStore: EncryptedDataStore;
	groupStore: GroupStore;
	filterStore: FilterStore;
	canAuthenticateKeyBeforeEntry: () => Promise<[boolean, boolean, boolean]>;
	canAuthenticateKeyAfterEntry: () => boolean;
	checkKeyBeforeEntry: (key: string) => Promise<boolean>;
	checkKeyAfterEntry: (key: string) => boolean;
	loadStoreData: (key: string) => Promise<any>;
	resetStoresToDefault: () => void;
	init: () => Promise<void>;
	syncToServer: (key: string, incrementUserDataVersion?: boolean) => Promise<void>;
}

async function init(): Promise<void>
{
	return checkNeedsAuthenticating();
}

async function checkNeedsAuthenticating(): Promise<void>
{
	stores.needsAuthentication = (await canAuthenticateKeyBeforeEntry()).some((v) => v);
}

function canAuthenticateKeyBeforeEntry(): Promise<[boolean, boolean, boolean]>
{
	return Promise.all([
		stores.encryptedDataStore.canAuthenticateKeyBeforeEntry(),
		stores.filterStore.canAuthenticateKeyBeforeEntry(),
		stores.groupStore.canAuthenticateKeyBeforeEntry()
	]);
}

function canAuthenticateKeyAfterEntry(): boolean
{
	return stores.encryptedDataStore.canAuthenticateKeyAfterEntry() ||
		stores.filterStore.canAuthenticateKeyAfterEntry() ||
		stores.groupStore.canAuthenticateKeyAfterEntry();
}

async function checkKeyBeforeEntry(key: string): Promise<boolean>
{
	if (await stores.encryptedDataStore.canAuthenticateKeyBeforeEntry())
	{
		return await stores.encryptedDataStore.checkKeyBeforeEntry(key);
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

function checkKeyAfterEntry(key: string): boolean
{
	if (stores.encryptedDataStore.canAuthenticateKeyAfterEntry())
	{
		return stores.encryptedDataStore.checkKeyAfterEntry(key);
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
			stores.encryptedDataStore.readState(key),
			stores.filterStore.readState(key),
			stores.groupStore.readState(key)
		]);

	// Only need to check from server if reading in failed. the server can never be newer than the file
	if (result.some(r => !r))
	{
		if (stores.settingsStore.enableSyncing)
		{
			const response = await window.api.server.getUserData();

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
	stores.encryptedDataStore.resetToDefault();
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

	window.api.server.syncUserData(key, stores.appStore.toString(), stores.settingsStore.toString(), stores.encryptedDataStore.toString(),
		stores.filterStore.toString(), stores.groupStore.toString());
}

export const stores: Stores =
{
	get needsAuthentication() { return storeState.needsAuthentication },
	set needsAuthentication(value: boolean) { storeState.needsAuthentication = value },
	settingsStore: useSettingsStore(),
	appStore: useAppStore(),
	encryptedDataStore: useEncryptedDataStore(),
	groupStore: useGroupStore(),
	filterStore: useFilterStore(),
	canAuthenticateKeyBeforeEntry,
	canAuthenticateKeyAfterEntry,
	checkKeyBeforeEntry,
	checkKeyAfterEntry,
	loadStoreData,
	resetStoresToDefault,
	init,
	syncToServer
}

// additional setup that requires another store. Prevents circular dependencies
stores.encryptedDataStore.init(stores);
stores.settingsStore.init(stores);
stores.appStore.init(stores);
