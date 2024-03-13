import { Ref, ref } from "vue";
import { DataType } from "../../Types/Table"
import { stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { hideAll } from 'tippy.js';
import { Store } from "./Base";
import { DataFile } from "@renderer/Types/EncryptedData";

interface AppStoreState
{
	loadedFile: boolean;
	readonly isWindows: boolean;
	userDataVersion: number;
	reloadMainUI: boolean;
	loginHistory: Dictionary<number[]>,
}

// export interface AppStore
// {
// 	readonly isWindows: boolean;
// 	userDataVersion: number;
// 	authenticated: boolean;
// 	reloadMainUI: boolean;
// 	activePasswordValuesTable: DataType;
// 	activeFilterGroupsTable: DataType;
// 	loginHistory: Dictionary<number[]>;
// 	init: (stores: Stores) => void;
// 	readState: (key: string) => Promise<boolean>;
// 	resetToDefault: () => void;
// 	recordLogin: (key: string, dateTime: number) => Promise<void>;
// 	resetSessionTime: () => void;
// 	incrementUserDataVersion: (key: string) => Promise<void>;
// }

// export default function useAppStore(): AppStore
// {
// 	let appState = reactive(defaultState());
// 	let autoLockTimeoutID: NodeJS.Timeout;

// 	const activePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
// 	const activeFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

// 	function defaultState(): AppStoreState
// 	{
// 		return {
// 			loadedFile: false,
// 			isWindows: window.api.device.platform === "win32",
// 			userDataVersion: 0,
// 			authenticated: false,
// 			reloadMainUI: false,
// 			loginHistory: {},
// 		};
// 	}

// 	function init(_: Stores)
// 	{
// 	}

// 	function toString()
// 	{
// 		return JSON.stringify(appState);
// 	}

// 	function readState(key: string): Promise<boolean>
// 	{
// 		return new Promise((resolve, _) =>
// 		{
// 			if (appState.loadedFile)
// 			{
// 				resolve(true);
// 			}

// 			fileHelper.read<AppState>(key, window.api.files.app).then(async (obj: AppState) =>
// 			{
// 				obj.loadedFile = true;

// 				// set to false so we don't read in a previous 'true' value. This should get set properly
// 				// after all the stores are read in
// 				obj.authenticated = false;
// 				Object.assign(appState, obj);
// 				await checkRemoveOldLoginRecords(key);

// 				resolve(true);
// 			}).catch(() =>
// 			{
// 				resolve(false);
// 			});
// 		})
// 	}

// 	async function checkRemoveOldLoginRecords(key: string)
// 	{
// 		let removedLogin: boolean = false;
// 		const daysToStoreLoginsAsMiliseconds: number = stores.settingsStore.numberOfDaysToStoreLoginRecords * 24 * 60 * 60 * 1000;

// 		Object.keys(appState.loginHistory).forEach((s) =>
// 		{
// 			const date: number = Date.parse(s);
// 			if (date - Date.now() > daysToStoreLoginsAsMiliseconds)
// 			{
// 				removedLogin = true;
// 				delete appState.loginHistory[s];
// 			}
// 		});

// 		if (removedLogin)
// 		{
// 			await writeState(key);
// 			stores.syncToServer(key, false);
// 		}
// 	}

// 	function writeState(key: string): Promise<void>
// 	{
// 		appState.userDataVersion += 1;
// 		return fileHelper.write<AppState>(key, appState, window.api.files.app);
// 	}

// 	function resetToDefault()
// 	{
// 		Object.assign(appState, defaultState());
// 	}

// 	function resetSessionTime()
// 	{
// 		clearTimeout(autoLockTimeoutID);
// 		autoLockTimeoutID = setTimeout(() =>
// 		{
// 			hideAll();
// 			stores.resetStoresToDefault();
// 		}, stores.settingsStore.autoLockNumberTime);
// 	}

// 	async function recordLogin(key: string, dateTime: number): Promise<void>
// 	{
// 		const dateObj: Date = new Date(dateTime);
// 		const loginHistoryKey: string = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

// 		if (!appState.loginHistory[loginHistoryKey])
// 		{
// 			appState.loginHistory[loginHistoryKey] = [dateTime];
// 		}
// 		else if (appState.loginHistory[loginHistoryKey].length < stores.settingsStore.loginRecordsToStorePerDay)
// 		{
// 			appState.loginHistory[loginHistoryKey].unshift(dateTime);
// 		}
// 		else
// 		{
// 			appState.loginHistory[loginHistoryKey].pop();
// 			appState.loginHistory[loginHistoryKey].unshift(dateTime);
// 		}

// 		await writeState(key);
// 		stores.syncToServer(key, false);
// 	}

// 	async function incrementUserDataVersion(key: string)
// 	{
// 		appState.userDataVersion += 1;
// 		await writeState(key);
// 	}

// 	return {
// 		get isWindows() { return appState.isWindows; },
// 		get userDataVersion() { return appState.userDataVersion; },
// 		get authenticated() { return appState.authenticated; },
// 		set authenticated(value: boolean) { appState.authenticated = value; },
// 		get reloadMainUI() { return appState.reloadMainUI; },
// 		set reloadMainUI(value: boolean) { appState.reloadMainUI = value; },
// 		get activePasswordValuesTable() { return activePasswordValueTable.value; },
// 		set activePasswordValuesTable(value: DataType) { activePasswordValueTable.value = value; },
// 		get activeFilterGroupsTable() { return activeFilterGroupTable.value; },
// 		set activeFilterGroupsTable(value: DataType) { activeFilterGroupTable.value = value; },
// 		get loginHistory() { return appState.loginHistory; },
// 		init,
// 		toString,
// 		recordLogin,
// 		resetSessionTime,
// 		readState,
// 		resetToDefault,
// 		incrementUserDataVersion
// 	};
// }

class AppStore extends Store<AppStoreState>
{
	private autoLockTimeoutID: NodeJS.Timeout | undefined;

	private internalAuthenticated: boolean;

	private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
	private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

	get isWindows() { return this.state.isWindows; }
	get userDataVersion() { return this.state.userDataVersion; }
	get authenticated() { return this.internalAuthenticated; }
	set authenticated(value: boolean) { this.internalAuthenticated = value; }
	get reloadMainUI() { return this.state.reloadMainUI; }
	set reloadMainUI(value: boolean) { this.state.reloadMainUI = value; }
	get activePasswordValuesTable() { return this.internalActivePasswordValueTable.value; }
	set activePasswordValuesTable(value: DataType) { this.internalActivePasswordValueTable.value = value; }
	get activeFilterGroupsTable() { return this.internalActiveFilterGroupTable.value; }
	set activeFilterGroupsTable(value: DataType) { this.internalActiveFilterGroupTable.value = value; }
	get loginHistory() { return this.state.loginHistory; }

	constructor()
	{
		super();

		this.internalAuthenticated = false;

		this.internalActivePasswordValueTable = ref(DataType.Passwords);
		this.internalActiveFilterGroupTable = ref(DataType.Filters);
	}

	protected defaultState()
	{
		return {
			loadedFile: false,
			isWindows: window.api.device.platform === "win32",
			userDataVersion: 0,
			reloadMainUI: false,
			loginHistory: {},
		};
	}

	protected getFile(): DataFile
	{
		return window.api.files.app;
	}

	public async readState(key: string)
	{
		if (await super.readState(key))
		{
			this.checkRemoveOldLoginRecords(key);
			return true;
		}

		return false;
	}

	protected writeState(key: string)
	{
		this.state.userDataVersion += 1;
		return super.writeState(key);
	}

	private async checkRemoveOldLoginRecords(key: string)
	{
		let removedLogin: boolean = false;
		const daysToStoreLoginsAsMiliseconds: number = stores.settingsStore.numberOfDaysToStoreLoginRecords * 24 * 60 * 60 * 1000;

		Object.keys(this.state.loginHistory).forEach((s) =>
		{
			const date: number = Date.parse(s);
			if (date - Date.now() > daysToStoreLoginsAsMiliseconds)
			{
				removedLogin = true;
				delete this.state.loginHistory[s];
			}
		});

		if (removedLogin)
		{
			await this.writeState(key);
			stores.syncToServer(key, false);
		}
	}

	public resetSessionTime()
	{
		clearTimeout(this.autoLockTimeoutID);
		this.autoLockTimeoutID = setTimeout(() =>
		{
			hideAll();
			stores.resetStoresToDefault();
		}, stores.settingsStore.autoLockNumberTime);
	}

	public async recordLogin(key: string, dateTime: number): Promise<void>
	{
		const dateObj: Date = new Date(dateTime);
		const loginHistoryKey: string = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

		if (!this.state.loginHistory[loginHistoryKey])
		{
			this.state.loginHistory[loginHistoryKey] = [dateTime];
		}
		else if (this.state.loginHistory[loginHistoryKey].length < stores.settingsStore.loginRecordsToStorePerDay)
		{
			this.state.loginHistory[loginHistoryKey].unshift(dateTime);
		}
		else
		{
			this.state.loginHistory[loginHistoryKey].pop();
			this.state.loginHistory[loginHistoryKey].unshift(dateTime);
		}

		this.writeState(key);
		//TODO
		stores.syncToServer(key, false);
	}
}

const appStore = new AppStore();
export default appStore;
export type AppStoreType = typeof appStore;
