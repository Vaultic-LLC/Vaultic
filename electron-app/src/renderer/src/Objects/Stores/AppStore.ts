import { Ref, reactive, ref } from "vue";
import { DataType } from "../../Types/Table"
import { Stores, stores, Store } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { hideAll } from 'tippy.js';
import fileHelper from "@renderer/Helpers/fileHelper";

interface AppState
{
	loadedFile: boolean;
	readonly isWindows: boolean;
	userDataVersion: number;
	authenticated: boolean;
	reloadMainUI: boolean;
	loginHistory: Dictionary<number[]>,
}

export interface AppStore extends Store
{
	readonly isWindows: boolean;
	userDataVersion: number;
	authenticated: boolean;
	reloadMainUI: boolean;
	activePasswordValuesTable: DataType;
	activeFilterGroupsTable: DataType;
	loginHistory: Dictionary<number[]>;
	init: (stores: Stores) => void;
	readState: (key: string) => Promise<boolean>;
	resetToDefault: () => void;
	recordLogin: (key: string, dateTime: number) => Promise<void>;
	resetSessionTime: () => void;
	incrementUserDataVersion: (key: string) => Promise<void>;
}

export default function useAppStore(): AppStore
{
	let appState = reactive(defaultState());
	let autoLockTimeoutID: NodeJS.Timeout;

	const activePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
	const activeFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

	function defaultState(): AppState
	{
		return {
			loadedFile: false,
			isWindows: window.api.device.platform === "win32",
			userDataVersion: 0,
			authenticated: false,
			reloadMainUI: false,
			loginHistory: {},
		};
	}

	function init(_: Stores)
	{
	}

	function toString()
	{
		return JSON.stringify(appState);
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (appState.loadedFile)
			{
				resolve(true);
			}

			fileHelper.read<AppState>(key, window.api.files.app).then(async (obj: AppState) =>
			{
				obj.loadedFile = true;

				// set to false so we don't read in a previous 'true' value. This should get set properly
				// after all the stores are read in
				obj.authenticated = false;
				Object.assign(appState, obj);
				await checkRemoveOldLoginRecords(key);

				resolve(true);
			}).catch(() =>
			{
				resolve(false);
			});
		})
	}

	async function checkRemoveOldLoginRecords(key: string)
	{
		let removedLogin: boolean = false;
		const daysToStoreLoginsAsMiliseconds: number = stores.settingsStore.numberOfDaysToStoreLoginRecords * 24 * 60 * 60 * 1000;

		Object.keys(appState.loginHistory).forEach((s) =>
		{
			const date: number = Date.parse(s);
			if (date - Date.now() > daysToStoreLoginsAsMiliseconds)
			{
				removedLogin = true;
				delete appState.loginHistory[s];
			}
		});

		if (removedLogin)
		{
			await writeState(key);
			stores.syncToServer(key, false);
		}
	}

	function writeState(key: string): Promise<void>
	{
		appState.userDataVersion += 1;
		return fileHelper.write<AppState>(key, appState, window.api.files.app);
	}

	function resetToDefault()
	{
		Object.assign(appState, defaultState());
	}

	function resetSessionTime()
	{
		clearTimeout(autoLockTimeoutID);
		autoLockTimeoutID = setTimeout(() =>
		{
			hideAll();
			stores.resetStoresToDefault();
		}, stores.settingsStore.autoLockNumberTime);
	}

	async function recordLogin(key: string, dateTime: number): Promise<void>
	{
		const dateObj: Date = new Date(dateTime);
		const loginHistoryKey: string = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

		if (!appState.loginHistory[loginHistoryKey])
		{
			appState.loginHistory[loginHistoryKey] = [dateTime];
		}
		else if (appState.loginHistory[loginHistoryKey].length < stores.settingsStore.loginRecordsToStorePerDay)
		{
			appState.loginHistory[loginHistoryKey].unshift(dateTime);
		}
		else
		{
			appState.loginHistory[loginHistoryKey].pop();
			appState.loginHistory[loginHistoryKey].unshift(dateTime);
		}

		await writeState(key);
		stores.syncToServer(key, false);
	}

	async function incrementUserDataVersion(key: string)
	{
		appState.userDataVersion += 1;
		await writeState(key);
	}

	return {
		get isWindows() { return appState.isWindows; },
		get userDataVersion() { return appState.userDataVersion; },
		get authenticated() { return appState.authenticated; },
		set authenticated(value: boolean) { appState.authenticated = value; },
		get reloadMainUI() { return appState.reloadMainUI; },
		set reloadMainUI(value: boolean) { appState.reloadMainUI = value; },
		get activePasswordValuesTable() { return activePasswordValueTable.value; },
		set activePasswordValuesTable(value: DataType) { activePasswordValueTable.value = value; },
		get activeFilterGroupsTable() { return activeFilterGroupTable.value; },
		set activeFilterGroupsTable(value: DataType) { activeFilterGroupTable.value = value; },
		get loginHistory() { return appState.loginHistory; },
		init,
		toString,
		recordLogin,
		resetSessionTime,
		readState,
		resetToDefault,
		incrementUserDataVersion
	};
}
