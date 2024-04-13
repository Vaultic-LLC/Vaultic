import appStore, { AppStoreState, AppStoreType } from "./AppStore";
import filterStore, { FilterStoreType, FilterStoreState } from "./FilterStore";
import groupStore, { GroupStoreType, GroupStoreState } from "./GroupStore";
import settingStore, { SettingStoreType, SettingsStoreState } from "./SettingsStore";
import passwordStore, { PasswordStoreType, PasswordStoreState } from "./PasswordStore";
import valueStore, { ValueStoreType, ValueStoreState } from "./ValueStore";
import createPopupStore, { PopupStore } from "./PopupStore";
import userPreferenceStore, { UserPreferenceStoreType, UserPreferencesStoreState } from "./UserPreferencesStore";
import { Store, StoreState } from "./Base";
import cryptHelper from "@renderer/Helpers/cryptHelper";

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
	loadStoreData: (key: string) => Promise<any>;
	resetStoresToDefault: () => void;
	getStates: () => DataStoreStates;
	handleUpdateStoreResponse: (key: string, response: any, suppressError?: boolean) => Promise<boolean>;
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
		const response = await window.api.server.user.getUserData();
		if (response.success)
		{
			await checkUpdateStoresWithBackup(key, response);
		}
		else
		{
			if (response.InvalidSession)
			{
				stores.popupStore.showSessionExpired();
			}
			else if (response.IncorrectDevice)
			{
				stores.popupStore.showIncorrectDevice(response);
			}
			else if (response.UnknownError)
			{
				stores.popupStore.showErrorResponseAlert(response)
			}
		}
	}
}

async function checkUpdateStoresWithBackup(key: string, userDataResponse: any, overrideVersionCheck: boolean = false)
{
	if (userDataResponse.success)
	{
		if (userDataResponse.appStoreState)
		{
			await checkUpdateEncryptedStore<AppStoreType, AppStoreState>(key, stores.appStore, userDataResponse.appStoreState, overrideVersionCheck);
		}

		if (userDataResponse.settingsStoreState)
		{
			await checkUpdateEncryptedStore<SettingStoreType, SettingsStoreState>(key, stores.settingsStore, userDataResponse.settingsStoreState, overrideVersionCheck);
		}

		if (userDataResponse.filterStoreState)
		{
			await checkUpdateEncryptedStore<FilterStoreType, FilterStoreState>(key, stores.filterStore, userDataResponse.filterStoreState, overrideVersionCheck);
		}

		if (userDataResponse.groupStoreState)
		{
			await checkUpdateEncryptedStore<GroupStoreType, GroupStoreState>(key, stores.groupStore, userDataResponse.groupStoreState, overrideVersionCheck);
		}

		if (userDataResponse.passwordStoreState)
		{
			await checkUpdateEncryptedStore<PasswordStoreType, PasswordStoreState>(key, stores.passwordStore, userDataResponse.passwordStoreState, overrideVersionCheck);
		}

		if (userDataResponse.valueStoreState)
		{
			await checkUpdateEncryptedStore<ValueStoreType, ValueStoreState>(key, stores.valueStore, userDataResponse.valueStoreState, overrideVersionCheck);
		}

		if (userDataResponse.userPreferenceStoreState)
		{
			const userPreferenceState = JSON.parse(userDataResponse.userPreferenceStoreState) as UserPreferencesStoreState;
			if (overrideVersionCheck || userPreferenceState.version > stores.userPreferenceStore.getState().version)
			{
				stores.userPreferenceStore.updateState(key, userPreferenceState);
			}
		}
	}
	else
	{
		if (userDataResponse.InvalidSession)
		{
			stores.popupStore.showSessionExpired();
		}
		else if (userDataResponse.IncorrectDevice)
		{
			stores.popupStore.showIncorrectDevice(userDataResponse);
		}
		else if (userDataResponse.UnknownError)
		{
			stores.popupStore.showErrorResponseAlert(userDataResponse)
		}
	}
}

async function checkUpdateEncryptedStore<T extends Store<U>, U extends StoreState>(key: string, store: T, storeState: string, overrideVersionCheck: boolean)
{
	const state = await cryptHelper.decrypt(key, storeState);
	if (state.success)
	{
		const parsedState = JSON.parse(state.value!) as U;
		if (overrideVersionCheck || parsedState.version > store.getState().version)
		{
			store.updateState(key, parsedState);
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

async function handleUpdateStoreResponse(key: string, response: any, suppressError: boolean = false): Promise<boolean>
{
	if (response.success && response.filterStoreState && response.groupStoreState && response.passwordStoreState
		&& response.valueStoreState)
	{
		await Promise.all([
			stores.filterStore.updateState(key, response.filterStoreState),
			stores.groupStore.updateState(key, response.groupStoreState),
			stores.passwordStore.updateState(key, response.passwordStoreState),
			stores.valueStore.updateState(key, response.valueStoreState)
		]);

		// TODO: handel failed state updates?
		return true;
	}
	else if (!suppressError)
	{
		if (response.UnknownError)
		{
			stores.popupStore.showErrorResponseAlert(response.StatusCode);
		}
		else if (response.InvalidSession)
		{
			stores.popupStore.showSessionExpired();
		}
	}

	return false;
}

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
	loadStoreData,
	resetStoresToDefault,
	getStates,
	handleUpdateStoreResponse,
	checkUpdateStoresWithBackup
}

// additional setup that requires another store. Prevents circular dependencies
stores.userPreferenceStore.init(stores);
