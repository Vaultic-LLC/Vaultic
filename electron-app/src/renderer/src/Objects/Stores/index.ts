import useAppStore, { AppStore } from "./AppStore";
import useEncryptedDataStore, { EncryptedDataStore } from "./EncryptedDataStore";
import useFilterStore, { FilterStore } from "./FilterStore";
import useGroupStore, { GroupStore } from "./GroupStore";
import useSettingsStore, { SettingsStore } from "./SettingsStore";

export interface Stores
{
	settingsStore: SettingsStore;
	appStore: AppStore;
	encryptedDataStore: EncryptedDataStore;
	groupStore: GroupStore;
	filterStore: FilterStore;
	loadStoreData: (key: string) => void;
}

export const stores: Stores =
{
	settingsStore: useSettingsStore(),
	appStore: useAppStore(),
	encryptedDataStore: useEncryptedDataStore(),
	groupStore: useGroupStore(),
	filterStore: useFilterStore(),
	loadStoreData
}

stores.encryptedDataStore.init(stores);
stores.settingsStore.init(stores);
stores.appStore.init(stores);

function loadStoreData(key: string): void
{

}
