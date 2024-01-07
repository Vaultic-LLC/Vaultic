import { ComputedRef, computed, reactive } from "vue";
import { DataType } from "../../Types/Table";
import { LoginRecord } from "../../Types/EncryptedData";
import { Stores, stores } from ".";
import idGenerator from "../../Utilities/IdGenerator";

interface AppState
{
	readonly isWindows: boolean;
	lastUpdated: number;        // used to keep in sync if storing on google drive / other location
	authenticated: boolean;
	reloadMainUI: boolean;
	activePasswordValuesTable: DataType;
	activeFilterGroupsTable: DataType;
	sessionTimeLeft: number;
	loginHistory: LoginRecord[];
}

export interface AppStore extends AppState
{
	needsAuthentication: boolean;
	init: (stores: Stores) => void;
	recordLogin: (dateTime: number) => void;
	resetSessionTime: () => void;
}

const appState: AppState = reactive(
	{
		isWindows: window.api.platform === "win32",
		lastUpdated: 0,
		authenticated: false,
		reloadMainUI: false,
		activePasswordValuesTable: DataType.Passwords,
		activeFilterGroupsTable: DataType.Filters,
		sessionTimeLeft: 10000,
		loginHistory: [],
	});

export default function useAppStore(): AppStore
{
	let needsAuthentication: ComputedRef<boolean> = computed(() => true);
	let autoLockTimeoutID: NodeJS.Timeout;

	function init(stores: Stores)
	{
		needsAuthentication = computed(() =>
		{
			if (!stores.encryptedDataStore.canAuthenticateKey)
			{
				return false;
			}

			return !appState.authenticated;
		});
	}

	function resetSessionTime()
	{
		clearTimeout(autoLockTimeoutID);
		autoLockTimeoutID = setTimeout(() => appState.authenticated = false,
			stores.settingsStore.autoLockNumberTime);
	}

	function recordLogin(dateTime: number)
	{
		if (appState.loginHistory.length >= stores.settingsStore.loginRecordsToStore)
		{
			appState.loginHistory.pop();
		}

		appState.loginHistory.unshift({
			id: idGenerator.uniqueId(appState.loginHistory),
			datetime: dateTime,
			displayTime: new Date(dateTime).toLocaleString()
		});
	}

	// watch(() => appState.sessionTimeLeft, (newValue) =>
	// {

	// });

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
		get sessionTimeLeft() { return appState.sessionTimeLeft; },
		get loginHistory() { return appState.loginHistory; },
		init,
		recordLogin,
		resetSessionTime,
	};
}
