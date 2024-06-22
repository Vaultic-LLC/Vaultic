import { Ref, ref, watch } from "vue";
import { DataType } from "../../Types/Table"
import { Stores, stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { hideAll } from 'tippy.js';
import { Store, StoreState } from "./Base";
import { DataFile } from "../../Types/EncryptedData";
import { AccountSetupView } from "../../Types/Models";
import cryptHelper from "../../Helpers/cryptHelper";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { api } from "../../API";

export interface AppStoreState extends StoreState
{
    masterKeyHash: string;
    masterKeySalt: string;
    loginHistory: Dictionary<number[]>;
}

class AppStore extends Store<AppStoreState>
{
    private autoLockTimeoutID: NodeJS.Timeout | undefined;

    private internalActivePasswordValueTable: Ref<DataType> = ref(DataType.Passwords);
    private internalActiveFilterGroupTable: Ref<DataType> = ref(DataType.Filters);

    private internalIsOnline: Ref<boolean>;

    get isOnline() { return this.internalIsOnline.value; }
    set isOnline(value: boolean) { this.internalIsOnline.value = value; }
    get activePasswordValuesTable() { return this.internalActivePasswordValueTable.value; }
    set activePasswordValuesTable(value: DataType) { this.internalActivePasswordValueTable.value = value; }
    get activeFilterGroupsTable() { return this.internalActiveFilterGroupTable.value; }
    set activeFilterGroupsTable(value: DataType) { this.internalActiveFilterGroupTable.value = value; }
    get loginHistory() { return this.state.loginHistory; }

    constructor()
    {
        super();

        this.internalIsOnline = ref(false);
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
            isOnline: false,
            userDataVersion: 0,
            loginHistory: {},
        };
    }

    public init(stores: Stores)
    {
        watch(() => stores.settingsStore.autoLockTime, () =>
        {
            this.resetSessionTime();
        });
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
        return api.files.app;
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

    protected async writeState(key: string): Promise<boolean>
    {
        this.state.version += 1;
        const success = await super.writeState(key);
        if (!success)
        {
            return false;
        }

        if (!this.internalIsOnline.value)
        {
            return true;
        }

        const state = await cryptHelper.encrypt(key, JSON.stringify(this.state));
        if (state.success)
        {
            const data =
            {
                MasterKey: key,
                AppStoreState: state.value
            };

            const response = await api.server.user.backupAppStore(JSON.stringify(data));
            if (!response.Success)
            {
                defaultHandleFailedResponse(response, false);
            }

            return response.Success;
        }

        return false;

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
            const salt = await api.utilities.generator.randomValue(30);
            this.state.masterKeyHash = await api.utilities.hash.hash(masterKey, salt);
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

        const computedHash = await api.utilities.hash.hash(key, this.state.masterKeySalt);
        return await api.utilities.hash.compareHashes(this.state.masterKeyHash, computedHash);
    }

    public lock(redirect: boolean = true, expireSession: boolean = true)
    {
        console.time();
        hideAll();
        console.timeLog();
        if (redirect)
        {
            stores.popupStore.showAccountSetup(AccountSetupView.SignIn);
        }
        console.timeLog();

        if (expireSession && this.isOnline === true)
        {
            api.server.session.expire();
        }
        console.timeLog();

        this.isOnline = false;
        stores.resetStoresToDefault();
        console.timeLog();
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
