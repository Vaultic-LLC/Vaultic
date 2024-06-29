import { Ref, ref, watch } from "vue";
import { DataType } from "../../Types/Table"
import { Stores, stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { hideAll } from 'tippy.js';
import { Store, StoreState } from "./Base";
import { DataFile } from "../../Types/EncryptedData";
import { AccountSetupView } from "../../Types/Models";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";

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

    public getFile(): DataFile
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

    private async update(masterKey: string, state: AppStoreState): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction();
        transaction.addStore(this, state);

        return transaction.commit(masterKey);
    }

    private async checkRemoveOldLoginRecords(masterKey: string)
    {
        let removedLogin: boolean = false;
        const daysToStoreLoginsAsMiliseconds: number = stores.settingsStore.numberOfDaysToStoreLoginRecords * 24 * 60 * 60 * 1000;

        const pendingState = this.cloneState();
        Object.keys(pendingState.loginHistory).forEach((s) =>
        {
            const date: number = Date.parse(s);
            if (date - Date.now() > daysToStoreLoginsAsMiliseconds)
            {
                removedLogin = true;
                delete pendingState.loginHistory[s];
            }
        });

        if (removedLogin)
        {
            await this.update(masterKey, pendingState);
        }
    }

    public async setKey(masterKey: string)
    {
        if (!this.state.masterKeyHash)
        {
            const pendingState = this.cloneState();
            const salt = await api.utilities.generator.randomValue(30);

            pendingState.masterKeyHash = await api.utilities.hash.hash(masterKey, salt);
            pendingState.masterKeySalt = salt;

            // TODO: Should check the result of this in the account setup view
            await this.update(masterKey, pendingState);
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
        hideAll();

        if (redirect)
        {
            stores.popupStore.showAccountSetup(AccountSetupView.SignIn);
        }

        if (expireSession && this.isOnline === true)
        {
            api.server.session.expire();
        }

        this.isOnline = false;
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

    public async recordLogin(masterKey: string, dateTime: number): Promise<void>
    {
        const pendingStte = this.cloneState();

        const dateObj: Date = new Date(dateTime);
        const loginHistoryKey: string = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

        if (!pendingStte.loginHistory[loginHistoryKey])
        {
            pendingStte.loginHistory[loginHistoryKey] = [dateTime];
        }
        else if (pendingStte.loginHistory[loginHistoryKey].length < stores.settingsStore.loginRecordsToStorePerDay)
        {
            pendingStte.loginHistory[loginHistoryKey].unshift(dateTime);
        }
        else
        {
            pendingStte.loginHistory[loginHistoryKey].pop();
            pendingStte.loginHistory[loginHistoryKey].unshift(dateTime);
        }

        this.update(masterKey, pendingStte);
    }
}

const appStore = new AppStore();
export default appStore;
export type AppStoreType = typeof appStore;
