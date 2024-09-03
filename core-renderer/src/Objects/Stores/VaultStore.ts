import { CondensedVaultData } from "../../Types/APITypes";
import { Dictionary } from "../../Types/DataStructures";
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import { Store } from "./Base";
import { FilterStore, ReactiveFilterStore } from "./FilterStore";
import { GroupStore, ReactiveGroupStore } from "./GroupStore";
import { PasswordStore, ReactivePasswordStore } from "./PasswordStore";
import { ValueStore, ReactiveValueStore } from "./ValueStore";
import { VaultPreferencesStore } from "./VaultPreferencesStore";

interface VaultSettings 
{
    loginRecordsToStorePerDay: number;
    numberOfDaysToStoreLoginRecords: number;
}

interface VaultStoreState
{
    settings: VaultSettings;
    loginHistory: Dictionary<number[]>;
}

export class BaseVaultStore<V extends PasswordStore,
    W extends ValueStore, X extends FilterStore, Y extends GroupStore> extends Store<VaultStoreState>
{
    protected internalUserVaultID: number;
    protected internalPasswordStore: V;
    protected internalValueStore: W;
    protected internalFilterStore: X;
    protected internalGroupStore: Y;
    protected internalVaultPreferencesStore: VaultPreferencesStore;

    get userVaultID() { return this.internalUserVaultID; }

    get passwordStore() { return this.internalPasswordStore; }
    get valueStore() { return this.internalValueStore; }
    get filterStore() { return this.internalFilterStore; }
    get groupStore() { return this.internalGroupStore; }
    get vaultPreferencesStore() { return this.internalVaultPreferencesStore; }

    constructor() 
    {
        super("vaultStoreState");
        this.internalVaultPreferencesStore = new VaultPreferencesStore(this);
    }

    public setVaultData(masterKey: string, data: CondensedVaultData)
    {
        this.internalUserVaultID = data.userVaultID;
        this.updateState(JSON.parse(data.vaultStoreState));
        this.internalVaultPreferencesStore.updateState(JSON.parse(data.vaultPreferencesStoreState));
    }

    protected defaultState(): VaultStoreState 
    {
        return {
            settings: {
                loginRecordsToStorePerDay: 13,
                numberOfDaysToStoreLoginRecords: 30
            },
            loginHistory: {}
        }
    }
}

export class BasicVaultStore extends BaseVaultStore<PasswordStore, ValueStore, FilterStore, GroupStore>
{
    constructor()
    {
        super();
        this.internalPasswordStore = new PasswordStore(this);
        this.internalValueStore = new ValueStore(this);
        this.internalFilterStore = new FilterStore(this);
        this.internalGroupStore = new GroupStore(this);
    }

    public setVaultData(masterKey: string, data: CondensedVaultData)
    {
        super.setVaultData(masterKey, data);
        this.internalPasswordStore.updateState(JSON.parse(data.passwordStoreState));
        this.internalValueStore.updateState(JSON.parse(data.valueStoreState));
        this.internalFilterStore.updateState(JSON.parse(data.filterStoreState));
        this.internalGroupStore.updateState(JSON.parse(data.groupStoreState));
    }
}

export class ReactiveVaultStore extends BaseVaultStore<ReactivePasswordStore,
    ReactiveValueStore, ReactiveFilterStore, ReactiveGroupStore>
{
    constructor()
    {
        super();
        this.internalPasswordStore = new ReactivePasswordStore(this);
        this.internalValueStore = new ReactiveValueStore(this);
        this.internalFilterStore = new ReactiveFilterStore(this);
        this.internalGroupStore = new ReactiveGroupStore(this);
    }

    get loginHistory() { return this.state.loginHistory; }

    public setVaultData(masterKey: string, data: CondensedVaultData)
    {
        super.setVaultData(masterKey, data);
        this.internalPasswordStore.updateState(JSON.parse(data.passwordStoreState));
        this.internalValueStore.updateState(JSON.parse(data.valueStoreState));
        this.internalFilterStore.updateState(JSON.parse(data.filterStoreState));
        this.internalGroupStore.updateState(JSON.parse(data.groupStoreState));

        this.updateLogins(masterKey);
    }

    private async updateLogins(masterKey: string)
    {
        const pendingState = this.cloneState();
        await this.recordLogin(pendingState, Date.now());
        await this.checkRemoveOldLoginRecords(pendingState);

        const transaction = new StoreUpdateTransaction(Entity.Vault, this.userVaultID);
        transaction.addStore(this, pendingState);

        await transaction.commit(masterKey);
    }

    private async recordLogin(pendingState: VaultStoreState, dateTime: number): Promise<void>
    {
        const dateObj: Date = new Date(dateTime);
        const loginHistoryKey: string = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

        if (!pendingState.loginHistory[loginHistoryKey])
        {
            pendingState.loginHistory[loginHistoryKey] = [dateTime];
        }
        else if (pendingState.loginHistory[loginHistoryKey].length < this.state.settings.loginRecordsToStorePerDay)
        {
            pendingState.loginHistory[loginHistoryKey].unshift(dateTime);
        }
        else
        {
            pendingState.loginHistory[loginHistoryKey].pop();
            pendingState.loginHistory[loginHistoryKey].unshift(dateTime);
        }
    }

    private async checkRemoveOldLoginRecords(pendingState: VaultStoreState)
    {
        let removedLogin: boolean = false;
        const daysToStoreLoginsAsMiliseconds: number = this.state.settings.numberOfDaysToStoreLoginRecords * 24 * 60 * 60 * 1000;

        Object.keys(pendingState.loginHistory).forEach((s) =>
        {
            const date: number = Date.parse(s);
            if (date - Date.now() > daysToStoreLoginsAsMiliseconds)
            {
                removedLogin = true;
                delete pendingState.loginHistory[s];
            }
        });
    }
}

export type VaultStoreParameter = BasicVaultStore | ReactiveVaultStore;
