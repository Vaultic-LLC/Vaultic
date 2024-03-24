import { reactive } from "vue";
import appStore, { AppStoreType } from "./AppStore";
import filterStore, { FilterStoreType, FilterStoreState } from "./FilterStore";
import groupStore, { GroupStoreType, GroupStoreState } from "./GroupStore";
import settingStore, { SettingStoreType } from "./SettingsStore";
import passwordStore, { PasswordStoreType, PasswordStoreState } from "./PasswordStore";
import valueStore, { ValueStoreType, ValueStoreState } from "./ValueStore";
import createPopupStore, { PopupStore } from "./PopupStore";
import { StoreState } from "./Base";

export interface DataStoreStates
{
	filterStoreState: FilterStoreState;
	groupStoreState: GroupStoreState;
	passwordStoreState: PasswordStoreState;
	valueStoreState: ValueStoreState;
}

interface StoresState
{
	needsAuthentication: boolean;
}

const storeState: StoresState = reactive({ needsAuthentication: true });
export interface Stores
{
	needsAuthentication: boolean;
	settingsStore: SettingStoreType;
	appStore: AppStoreType;
	filterStore: FilterStoreType;
	groupStore: GroupStoreType;
	passwordStore: PasswordStoreType;
	valueStore: ValueStoreType;
	popupStore: PopupStore;
	canAuthenticateKeyBeforeEntry: () => Promise<[boolean, boolean, boolean, boolean]>;
	canAuthenticateKeyAfterEntry: () => boolean;
	checkKeyBeforeEntry: (key: string) => Promise<boolean>;
	checkKeyAfterEntry: (key: string) => Promise<boolean>;
	loadStoreData: (key: string) => Promise<any>;
	resetStoresToDefault: () => void;
	init: () => Promise<void>;
	syncToServer: (key: string, incrementUserDataVersion?: boolean) => Promise<void>;
	getStates: () => DataStoreStates;
	handleUpdateStoreResponse: (key: string, response: any, suppressError?: boolean) => Promise<void>;
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

	// 1) Need to check to see if we are online
	// 2) If so, need to get data from server
	// 3) Override the older of the two with the newer
	// if (stores.appStore.isOnline && stores.settingsStore.backupData)
	// {
	// 	const response = await window.api.server.user.getUserData();
	// 	if (response.success)
	// 	{
	// 		[[stores.appStore.getState(), response.appStoreState]].forEach((states) =>
	// 		{
	// 			const serverStateObj: StoreState = JSON.parse(states[1]);

	// 			if (states[0].version == serverStateObj.version)
	// 			{
	// 				return 0;
	// 			}
	// 			else if (states[0].version > serverStateObj.version)
	// 			{
	// 				return -1;
	// 			}
	// 			else
	// 			{
	// 				return 1;
	// 			}
	// 		});
	// 	}
	// 	else
	// 	{

	// 	}
	// }
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
	if (!stores.settingsStore.backupData)
	{
		return;
	}

	if (incrementUserDataVersion)
	{
		//await stores.appStore.incrementUserDataVersion(key);
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

async function handleUpdateStoreResponse(key: string, response: any, suppressError: boolean = false): Promise<void>
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
	}
	else if (!suppressError)
	{
		if (response.UnknownError)
		{
			stores.popupStore.showErrorResponse(response.StatusCode);
		}
		else if (response.InvalidSession)
		{
			stores.popupStore.showSessionExpired();
		}
	}
}

export const stores: Stores =
{
	get needsAuthentication() { return storeState.needsAuthentication },
	set needsAuthentication(value: boolean) { storeState.needsAuthentication = value },
	settingsStore: settingStore,
	appStore: appStore,
	filterStore: filterStore,
	groupStore: groupStore,
	passwordStore: passwordStore,
	valueStore: valueStore,
	popupStore: createPopupStore(),
	canAuthenticateKeyBeforeEntry,
	canAuthenticateKeyAfterEntry,
	checkKeyBeforeEntry,
	checkKeyAfterEntry,
	loadStoreData,
	resetStoresToDefault,
	init,
	syncToServer,
	getStates,
	handleUpdateStoreResponse
}

// additional setup that requires another store. Prevents circular dependencies
stores.settingsStore.init(stores);
