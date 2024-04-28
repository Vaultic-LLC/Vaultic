import { Ref, ref } from "vue";
import { DataType } from "../../Types/Table"
import { stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { hideAll } from 'tippy.js';
import { Store, StoreState } from "./Base";
import { DataFile } from "@renderer/Types/EncryptedData";
import { AccountSetupView } from "@renderer/Types/Models";
import cryptHelper from "@renderer/Helpers/cryptHelper";

export interface AppStoreState extends StoreState
{
	readonly isWindows: boolean;
	masterKeyHash: string;
	masterKeySalt: string;
	isOnline: boolean;
	reloadMainUI: boolean;
	loginHistory: Dictionary<number[]>;
}

class AppStore extends Store<AppStoreState>
{
	private autoLockTimeoutID: NodeJS.Timeout | undefined;

	private internalAuthenticated: boolean;

	private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
	private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

	get isWindows() { return this.state.isWindows; }
	get isOnline() { return this.state.isOnline; }
	set isOnline(value: boolean) { this.state.isOnline = value; }
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
			version: 0,
			masterKeyHash: '',
			masterKeySalt: '',
			privateKey: '',
			isWindows: window.api.device.platform === "win32",
			isOnline: false,
			userDataVersion: 0,
			reloadMainUI: false,
			loginHistory: {},
		};
	}

	// don't need app state anywhere so don't expose it
	public getState()
	{
		return this.defaultState();
	}

	public resetToDefault()
	{
		super.resetToDefault();
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

	protected async writeState(key: string)
	{
		this.state.version += 1;
		await super.writeState(key);

		if (this.state.isOnline)
		{
			const state = await cryptHelper.encrypt(key, JSON.stringify(this.state));
			if (state.success)
			{
				window.api.server.user.backupAppStore(state.value!);
			}
		}
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
		}
	}

	public async setKey(masterKey: string)
	{
		if (!this.state.masterKeyHash)
		{
			const salt = window.api.utilities.generator.randomValue(30);
			this.state.masterKeyHash = await window.api.utilities.hash.hash(masterKey, salt);
			this.state.masterKeySalt = salt;

			await this.writeState(masterKey);
		}
	}

	public canAuthenticateKey(): Promise<boolean>
	{
		return this.getFile().exists();
	}

	public async authenticateKey(key: string): Promise<boolean>
	{
		if (!this.loadedFile && !(await this.readState(key)))
		{
			return false;
		}

		return this.state.masterKeyHash === await window.api.utilities.hash.hash(key, this.state.masterKeySalt);
	}

	public lock()
	{
		hideAll();
		stores.popupStore.showAccountSetup(AccountSetupView.SignIn);
		if (this.isOnline === true)
		{
			window.api.server.session.expire();
		}

		stores.resetStoresToDefault();
	}

	public resetSessionTime()
	{
		clearTimeout(this.autoLockTimeoutID);
		this.autoLockTimeoutID = setTimeout(() =>
		{
			this.lock();
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
	}
}

const appStore = new AppStore();
export default appStore;
export type AppStoreType = typeof appStore;
