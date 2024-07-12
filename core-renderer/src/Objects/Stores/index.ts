import appStore, { AppStoreState, AppStoreType } from "./AppStore";
import filterStore, { FilterStoreType, FilterStoreState } from "./FilterStore";
import groupStore, { GroupStoreType, GroupStoreState } from "./GroupStore";
import settingStore, { SettingStoreType, SettingsStoreState } from "./SettingsStore";
import passwordStore, { PasswordStoreType, PasswordStoreState } from "./PasswordStore";
import valueStore, { ValueStoreType, ValueStoreState } from "./ValueStore";
import createPopupStore, { PopupStore } from "./PopupStore";
import userPreferenceStore, { UserPreferenceStoreType, UserPreferencesStoreState } from "./UserPreferencesStore";
import { Store, StoreState } from "./Base";
import userDataBreachStore, { UserDataBreachStoreType } from "./UserDataBreachStore";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
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
    loadStoreData: (key: string, response?: any) => Promise<any>;
    resetStoresToDefault: () => void;
    getStates: () => DataStoreStates;
    //handleUpdateStoreResponse: (key: string, response: any, suppressError?: boolean) => Promise<boolean>;
    checkUpdateStoresWithBackup: (key: string, userDataResponse: any, overrideVersionCheck?: boolean) => Promise<void>;
}

// Is only called from GlobalAuthPopup and SignInView and should stay that way since readState doesn't do any
// authenticating.
async function loadStoreData(key: string, response: any = undefined): Promise<any>
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
            stores.popupStore.showAlert("An Error has Occured", "Unable to load all local data due to an unknown error. Please log in to load backed up data or try to continue using the application as normal.", false);
        }
        else
        {
            stores.popupStore.showAlert("An Error has Occured", "Unable to load all local data due to an unknown error. Loading backed up data.", false);
        }
    }

    if (response)
    {
        await checkUpdateStoresWithBackup(key, response);
    }
}

async function checkUpdateStoresWithBackup(masterKey: string, userDataResponse: any, overrideVersionCheck: boolean = false)
{
    if (userDataResponse.Success)
    {
        const transaction = new StoreUpdateTransaction();

        if (userDataResponse.AppStoreState)
        {
            checkUpdateStoreState<AppStoreType, AppStoreState>(transaction, stores.appStore, userDataResponse.AppStoreState, overrideVersionCheck);
        }

        if (userDataResponse.SettingsStoreState)
        {
            checkUpdateStoreState<SettingStoreType, SettingsStoreState>(transaction, stores.settingsStore, userDataResponse.SettingsStoreState, overrideVersionCheck);
        }

        if (userDataResponse.FilterStoreState)
        {
            checkUpdateStoreState<FilterStoreType, FilterStoreState>(transaction, stores.filterStore, userDataResponse.FilterStoreState, overrideVersionCheck);
        }

        if (userDataResponse.GroupStoreState)
        {
            checkUpdateStoreState<GroupStoreType, GroupStoreState>(transaction, stores.groupStore, userDataResponse.GroupStoreState, overrideVersionCheck);
        }

        if (userDataResponse.PasswordStoreState)
        {
            checkUpdateStoreState<PasswordStoreType, PasswordStoreState>(transaction, stores.passwordStore, userDataResponse.PasswordStoreState, overrideVersionCheck);
        }

        if (userDataResponse.ValueStoreState)
        {
            checkUpdateStoreState<ValueStoreType, ValueStoreState>(transaction, stores.valueStore, userDataResponse.ValueStoreState, overrideVersionCheck);
        }

        if (userDataResponse.UserPreferencesStoreState)
        {
            checkUpdateStoreState<UserPreferenceStoreType, UserPreferencesStoreState>(transaction, stores.userPreferenceStore, userDataResponse.UserPreferencesStoreState, overrideVersionCheck);
        }

        if (transaction.storeUpdateStates.length > 0)
        {
            if (!(await transaction.commit(masterKey)))
            {
                // TODO: Error message
                // Unable to back up data
                // Only show error message if actually saving data, not when logging in and overriding current with backups?
            }
        }
    }
    else
    {
        defaultHandleFailedResponse(userDataResponse);
    }
}

function checkUpdateStoreState<T extends Store<U>, U extends StoreState>(transaction: StoreUpdateTransaction, store: T,
    storeState: string, overrideVersionCheck: boolean)
{
    const parsedState = JSON.parse(storeState) as U;
    if (overrideVersionCheck || parsedState.version > store.getVersion())
    {
        transaction.addStore(store, parsedState);
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
