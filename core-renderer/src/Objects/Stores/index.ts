import appStore, { AppStoreState, AppStoreType } from "./AppStore";
import filterStore, { FilterStoreType, FilterStoreState } from "./FilterStore";
import groupStore, { GroupStoreType, GroupStoreState } from "./GroupStore";
import settingStore, { SettingStoreType, SettingsStoreState } from "./SettingsStore";
import passwordStore, { PasswordStoreType, PasswordStoreState } from "./PasswordStore";
import valueStore, { ValueStoreType, ValueStoreState } from "./ValueStore";
import createPopupStore, { PopupStore } from "./PopupStore";
import userPreferenceStore, { UserPreferenceStoreType, UserPreferencesStoreState } from "./UserPreferencesStore";
import { Store, StoreState } from "./Base";
import cryptHelper from "../../Helpers/cryptHelper";
import userDataBreachStore, { UserDataBreachStoreType } from "./UserDataBreachStore";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { api } from "../../API";
import StoreUpdateTransaction from "../StoreUpdateTransaction";

export interface DataStoreStates
{
    filterStoreState: FilterStoreState;
    groupStoreState: GroupStoreState;
    passwordStoreState: PasswordStoreState;
    valueStoreState: ValueStoreState;
}

export interface Stores
{
    settingsStore: SettingStoreType;
    appStore: AppStoreType;
    filterStore: FilterStoreType;
    groupStore: GroupStoreType;
    passwordStore: PasswordStoreType;
    valueStore: ValueStoreType;
    popupStore: PopupStore;
    userPreferenceStore: UserPreferenceStoreType;
    userDataBreachStore: UserDataBreachStoreType;
    loadStoreData: (key: string) => Promise<any>;
    resetStoresToDefault: () => void;
    getStates: () => DataStoreStates;
    //handleUpdateStoreResponse: (key: string, response: any, suppressError?: boolean) => Promise<boolean>;
    checkUpdateStoresWithBackup: (key: string, userDataResponse: any, overrideVersionCheck?: boolean) => Promise<void>;
}

// Is only called from GlobalAuthPopup and SignInView and should stay that way since readState doesn't do any
// authenticating
async function loadStoreData(key: string): Promise<any>
{
    const result = await Promise.all([
        stores.appStore.readState(key),
        stores.settingsStore.readState(key),
        stores.passwordStore.readState(key),
        stores.valueStore.readState(key),
        stores.filterStore.readState(key),
        stores.groupStore.readState(key)
    ]);

    if (result.some(r => !r))
    {
        if (!stores.appStore.isOnline)
        {
            stores.popupStore.showAlert("An Error has Occured", "Unable to use local data due to an unknown error. Please log in to load backed up data or try to continue using the application as normal.", false);
        }
        else
        {
            stores.popupStore.showAlert("An Error has Occured", "Unable to use local data due to an unknown error. Loading backed up data.", false);
        }
    }

    await loadBackupData(key);
}

async function loadBackupData(key: string)
{
    if (stores.appStore.isOnline)
    {
        const response = await api.server.user.getUserData(key);
        if (response.Success)
        {
            await checkUpdateStoresWithBackup(key, response);
        }
        else
        {
            defaultHandleFailedResponse(response);
        }
    }
}

async function checkUpdateStoresWithBackup(masterKey: string, userDataResponse: any, overrideVersionCheck: boolean = false)
{
    if (userDataResponse.Success)
    {
        const transaction = new StoreUpdateTransaction();

        if (userDataResponse.appStoreState)
        {
            await checkUpdateEncryptedStore<AppStoreType, AppStoreState>(transaction, masterKey, stores.appStore, userDataResponse.appStoreState, overrideVersionCheck);
        }

        if (userDataResponse.settingsStoreState)
        {
            await checkUpdateEncryptedStore<SettingStoreType, SettingsStoreState>(transaction, masterKey, stores.settingsStore, userDataResponse.settingsStoreState, overrideVersionCheck);
        }

        if (userDataResponse.filterStoreState)
        {
            await checkUpdateEncryptedStore<FilterStoreType, FilterStoreState>(transaction, masterKey, stores.filterStore, userDataResponse.filterStoreState, overrideVersionCheck);
        }

        if (userDataResponse.groupStoreState)
        {
            await checkUpdateEncryptedStore<GroupStoreType, GroupStoreState>(transaction, masterKey, stores.groupStore, userDataResponse.groupStoreState, overrideVersionCheck);
        }

        if (userDataResponse.passwordStoreState)
        {
            await checkUpdateEncryptedStore<PasswordStoreType, PasswordStoreState>(transaction, masterKey, stores.passwordStore, userDataResponse.passwordStoreState, overrideVersionCheck);
        }

        if (userDataResponse.valueStoreState)
        {
            await checkUpdateEncryptedStore<ValueStoreType, ValueStoreState>(transaction, masterKey, stores.valueStore, userDataResponse.valueStoreState, overrideVersionCheck);
        }

        if (userDataResponse.userPreferenceStoreState)
        {
            const userPreferenceState = JSON.parse(userDataResponse.userPreferenceStoreState) as UserPreferencesStoreState;
            if (overrideVersionCheck || userPreferenceState.version > stores.userPreferenceStore.getVersion())
            {
                transaction.addStore(stores.userPreferenceStore, userPreferenceState);
            }
        }

        if (transaction.storeUpdateStates.length > 0)
        {
            if (!(await transaction.commit(masterKey)))
            {
                // TODO: Error message
                // Unable to back up data
            }
        }
    }
    else
    {
        defaultHandleFailedResponse(userDataResponse);
    }
}

async function checkUpdateEncryptedStore<T extends Store<U>, U extends StoreState>(transaction: StoreUpdateTransaction, masterKey: string, store: T,
    storeState: string, overrideVersionCheck: boolean)
{
    const state = await cryptHelper.decrypt(masterKey, storeState);
    if (state.success)
    {
        const parsedState = JSON.parse(state.value!) as U;
        if (overrideVersionCheck || parsedState.version > store.getVersion())
        {
            transaction.addStore(store, parsedState);
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
    stores.userDataBreachStore.resetToDefault();
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

// TODO: Remove this
// async function handleUpdateStoreResponse(key: string, response: any, suppressError: boolean = false): Promise<boolean>
// {
//     if (response.Success && response.FilterStoreState && response.GroupStoreState && response.PasswordStoreState
//         && response.ValueStoreState)
//     {
//         const results = await Promise.all([
//             stores.filterStore.updateState(key, response.FilterStoreState),
//             stores.groupStore.updateState(key, response.GroupStoreState),
//             stores.passwordStore.updateState(key, response.PasswordStoreState),
//             stores.valueStore.updateState(key, response.ValueStoreState)
//         ]);

//         return results.every(r => r);
//     }
//     else if (!suppressError)
//     {
//         defaultHandleFailedResponse(response);
//     }

//     return false;
// }

export const stores: Stores =
{
    settingsStore: settingStore,
    appStore: appStore,
    filterStore: filterStore,
    groupStore: groupStore,
    passwordStore: passwordStore,
    valueStore: valueStore,
    popupStore: createPopupStore(),
    userPreferenceStore: userPreferenceStore,
    userDataBreachStore: userDataBreachStore,
    loadStoreData,
    resetStoresToDefault,
    getStates,
    //handleUpdateStoreResponse,
    checkUpdateStoresWithBackup
}

// additional setup that requires another store. Prevents circular dependencies
stores.userPreferenceStore.init(stores);
stores.appStore.init(stores);
