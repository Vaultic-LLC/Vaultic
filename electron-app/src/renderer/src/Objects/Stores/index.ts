import useAppStore, { AppStore } from "./AppStore";
import useEncryptedDataStore, { EncryptedDataStore } from "./EncryptedDataStore";
import useFilterStore, { FilterStore } from "./FilterStore";
import useGroupStore, { GroupStore } from "./GroupStore";
import useSettingsStore, { SettingsStore } from "./SettingsStore";

export interface Store
{
	readState: (key: string) => Promise<boolean>;
	resetToDefault: () => void;
}

export interface AuthenticationStore extends Store
{
	canAuthenticateKey: () => boolean; // checks if file exists
	checkKey: (key: string) => Promise<boolean>; // checks if key is valid
}

export interface Stores
{
	settingsStore: SettingsStore;
	appStore: AppStore;
	encryptedDataStore: EncryptedDataStore;
	groupStore: GroupStore;
	filterStore: FilterStore;
	canAuthenticateKey: () => boolean;
	checkKey: (key: string) => Promise<boolean>;
	loadStoreData: (key: string) => Promise<any>;
	resetStoresToDefault: () => void;
}

export const stores: Stores =
{
	settingsStore: useSettingsStore(),
	appStore: useAppStore(),
	encryptedDataStore: useEncryptedDataStore(),
	groupStore: useGroupStore(),
	filterStore: useFilterStore(),
	canAuthenticateKey,
	checkKey,
	loadStoreData,
	resetStoresToDefault
}

// additional setup that requires another store. Prevents circular dependencies
stores.encryptedDataStore.init(stores);
stores.settingsStore.init(stores);
stores.appStore.init(stores);

function canAuthenticateKey(): boolean
{
	return stores.encryptedDataStore.canAuthenticateKey() ||
		stores.filterStore.canAuthenticateKey() ||
		stores.groupStore.canAuthenticateKey();
}

async function checkKey(key: string): Promise<boolean>
{
	if (stores.encryptedDataStore.canAuthenticateKey())
	{
		return await stores.encryptedDataStore.checkKey(key);
	}

	if (stores.filterStore.canAuthenticateKey())
	{
		return await stores.filterStore.checkKey(key);
	}

	if (stores.groupStore.canAuthenticateKey())
	{
		return await stores.groupStore.checkKey(key);
	}

	// no master key has been setup yet, anything goes
	return true;
}

function loadStoreData(key: string): Promise<any>
{
	return Promise.all(
		[
			stores.settingsStore.readState(key),
			stores.appStore.readState(key),
			stores.encryptedDataStore.readState(key),
			stores.filterStore.readState(key),
			stores.groupStore.readState(key)
		]);
}

function resetStoresToDefault()
{
	stores.settingsStore.resetToDefault();
	stores.appStore.resetToDefault();
	stores.encryptedDataStore.resetToDefault();
	stores.filterStore.resetToDefault();
	stores.groupStore.resetToDefault();
}
