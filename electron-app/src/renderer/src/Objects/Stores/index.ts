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
}

export const stores: Stores =
{
    settingsStore: useSettingsStore(),
    appStore: useAppStore(),
    encryptedDataStore: useEncryptedDataStore(),
    groupStore: useGroupStore(),
    filterStore: useFilterStore(),
}

stores.encryptedDataStore.init(stores);
stores.settingsStore.init(stores);
stores.appStore.init(stores);