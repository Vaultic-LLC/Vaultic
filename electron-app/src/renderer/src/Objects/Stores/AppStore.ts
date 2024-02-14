import { ComputedRef, computed, reactive } from "vue";
import { DataType } from "../../Types/Table";
import { LoginRecord } from "../../Types/EncryptedData";
import { Stores, stores, Store } from ".";
import generator from "../../Utilities/Generator";
import File from "../Files/File"

interface AppState
{
	loadedFile: boolean;
	readonly isWindows: boolean;
	lastUpdated: number;        // used to keep in sync if storing on google drive / other location
	authenticated: boolean;
	reloadMainUI: boolean;
	activePasswordValuesTable: DataType;
	activeFilterGroupsTable: DataType;
	loginHistory: LoginRecord[];
}

export interface AppStore extends Store
{
	readonly isWindows: boolean;
	lastUpdated: number;        // used to keep in sync if storing on google drive / other location
	authenticated: boolean;
	reloadMainUI: boolean;
	activePasswordValuesTable: DataType;
	activeFilterGroupsTable: DataType;
	loginHistory: LoginRecord[];
	needsAuthentication: boolean;
	init: (stores: Stores) => void;
	readState: (key: string) => Promise<boolean>;
	resetToDefault: () => void;
	recordLogin: (key: string, dateTime: number) => void;
	resetSessionTime: () => void;
}

const appFile: File = new File("app");
let appState: AppState;

export default function useAppStore(): AppStore
{
	appState = reactive(defaultState());

	let needsAuthentication: ComputedRef<boolean> = computed(() => true);
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
			loginHistory: [],
		};
	}

	function init(stores: Stores)
	{
		// TODO: Update to include all stores
		needsAuthentication = computed(() =>
		{
			if (!stores.canAuthenticateKey())
			{
				return false;
			}

			return !appState.authenticated;
		});
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (appState.loadedFile)
			{
				resolve(true);
			}

			appFile.read<AppState>(key).then((obj: AppState) =>
			{
				obj.loadedFile = true;

				// set to false so we don't read in a previous 'true' value. This should get set properly
				// after all the stores are read in
				obj.authenticated = false;
				Object.assign(appState, obj);

				resolve(true);
			}).catch(() =>
			{
				resolve(false);
			});
		})
	}

	function writeState(key: string)
	{
		appFile.write(key, appState);
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

	function recordLogin(key: string, dateTime: number)
	{
		if (appState.loginHistory.length >= stores.settingsStore.loginRecordsToStore)
		{
			appState.loginHistory.pop();
		}

		appState.loginHistory.unshift({
			id: generator.uniqueId(appState.loginHistory),
			datetime: dateTime,
			displayTime: new Date(dateTime).toLocaleString()
		});

		writeState(key);
	}

	return {
		get isWindows() { return appState.isWindows; },
		get lastUpdated() { return appState.lastUpdated; },
		get needsAuthentication() { return needsAuthentication.value; },
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
