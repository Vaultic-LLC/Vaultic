import appStore, { AppStoreType } from "./AppStore";
import filterStore, { FilterStoreType, FilterStoreState } from "./FilterStore";
import groupStore, { GroupStoreType, GroupStoreState } from "./GroupStore";
import settingStore, { SettingStoreType } from "./SettingsStore";
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

	// everythings good
	if (result.every(r => r))
	{
		await checkUpdateStoresWithBackup(key);
	}
	else
	{
		stores.popupStore.showAlert("An Error has Occured", "Unable to use local data due to an unknown error. Falling back to backed up data.", false);
		await checkUpdateStoresWithBackup(key);
	}
}

async function checkUpdateStoresWithBackup(key: string)
{
	if (stores.appStore.isOnline)
	{
		const response = await window.api.server.user.getUserData();
		if (response.success)
		{
			if (response.appStoreState)
			{
				await checkUpdateEncryptedStore(key, stores.appStore, response.appStoreState);
			}

			if (response.settingsStoreState)
			{
				await checkUpdateEncryptedStore(key, stores.settingsStore, response.settingsStoreState);
			}

			if (response.filterStoreState)
			{
				await checkUpdateEncryptedStore(key, stores.filterStore, response.filterStoreState);
			}

			if (response.groupStoreState)
			{
				await checkUpdateEncryptedStore(key, stores.groupStore, response.groupStoreState);
			}

			if (response.passwordStoreState)
			{
				await checkUpdateEncryptedStore(key, stores.passwordStore, response.passwordStoreState);
			}

			if (response.valueStoreState)
			{
				await checkUpdateEncryptedStore(key, stores.valueStore, response.valueStoreState);
			}

			if (response.userPreferenceStoreState)
			{
				const userPreferenceState = JSON.parse(response.userPreferenceStoreState) as UserPreferencesStoreState;
				if (userPreferenceState.version > stores.userPreferenceStore.getState().version)
				{
					stores.userPreferenceStore.updateState(key, userPreferenceState);
				}
			}
		}
		else
		{
			stores.popupStore.showAlert("An Error has Occured", "An error has occured when trying to sync data. Please check your connection and try again", false);
		}
	}
}

async function checkUpdateEncryptedStore<T extends Store<U>, U extends StoreState>(key: string, store: T, storeState: string)
{
	const state = await cryptHelper.decrypt(key, storeState);
	if (state.success)
	{
		const parsedState = JSON.parse(state.value!) as U;
		if (parsedState.version > store.getState().version)
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
	handleUpdateStoreResponse
}

// additional setup that requires another store. Prevents circular dependencies
stores.userPreferenceStore.init(stores);
