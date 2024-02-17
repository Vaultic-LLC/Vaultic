import { reactive } from "vue";
import { DataType } from "../../Types/Table";
import { Stores, stores, Store } from ".";
import File from "../Files/File"
import { Dictionary } from "@renderer/Types/DataStructures";

interface AppState
{
	loadedFile: boolean;
	readonly isWindows: boolean;
	lastUpdated: number;        // used to keep in sync if storing on google drive / other location
	authenticated: boolean;
	reloadMainUI: boolean;
	activePasswordValuesTable: DataType;
	activeFilterGroupsTable: DataType;
	loginHistory: Dictionary<number[]>,
}

export interface AppStore extends Store
{
	readonly isWindows: boolean;
	lastUpdated: number;        // used to keep in sync if storing on google drive / other location
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
}

const appFile: File = new File("app");
let appState: AppState;

export default function useAppStore(): AppStore
{
	appState = reactive(defaultState());

	let autoLockTimeoutID: NodeJS.Timeout;

	function defaultState(): AppState
	{
		return {
			loadedFile: false,
			isWindows: window.api.platform === "win32",
			lastUpdated: 0,
			authenticated: false,
			reloadMainUI: false,
			activePasswordValuesTable: DataType.Passwords,
			activeFilterGroupsTable: DataType.Filters,
			loginHistory: {},
		};
	}

	function init(_: Stores)
	{
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (appState.loadedFile)
			{
				resolve(true);
			}

			appFile.read<AppState>(key).then(async (obj: AppState) =>
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
		}
	}

	function writeState(key: string): Promise<void>
	{
		return appFile.write(key, appState);
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
			stores.resetStoresToDefault();
		}, stores.settingsStore.autoLockNumberTime);
	}

	function recordLogin(key: string, dateTime: number): Promise<void>
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

		return writeState(key);
	}

	return {
		get isWindows() { return appState.isWindows; },
		get lastUpdated() { return appState.lastUpdated; },
		get authenticated() { return appState.authenticated; },
		set authenticated(value: boolean) { appState.authenticated = value; },
		get reloadMainUI() { return appState.reloadMainUI; },
		set reloadMainUI(value: boolean) { appState.reloadMainUI = value; },
		get activePasswordValuesTable() { return appState.activePasswordValuesTable; },
		set activePasswordValuesTable(value: DataType) { appState.activePasswordValuesTable = value; },
		get activeFilterGroupsTable() { return appState.activeFilterGroupsTable; },
		set activeFilterGroupsTable(value: DataType) { appState.activeFilterGroupsTable = value; },
		get loginHistory() { return appState.loginHistory; },
		init,
		recordLogin,
		resetSessionTime,
		readState,
		resetToDefault
	};
}
