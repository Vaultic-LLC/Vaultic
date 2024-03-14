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
