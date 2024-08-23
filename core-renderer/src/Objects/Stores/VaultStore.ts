import { VaultData } from "../../Types/APITypes";
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
    vaultID: number | undefined;
    settings: VaultSettings;
    loginHistory: Dictionary<number[]>;
}

class BaseVaultStore<V extends PasswordStore,
    W extends ValueStore, X extends FilterStore, Y extends GroupStore> extends Store<VaultStoreState>
{
    protected internalPasswordStore: V;
    protected internalValueStore: W;
    protected internalFilterStore: X;
    protected internalGroupStore: Y;
    protected internalVaultPreferencesStore: VaultPreferencesStore;

    get vaultID() { return this.state.vaultID; }

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

    public setVaultData(masterKey: string, vault: VaultData)
    {
        this.updateState(JSON.parse(vault.vaultStoreState));
        this.internalVaultPreferencesStore.updateState(JSON.parse(vault.vaultPreferencesStoreState));
    }

    protected defaultState(): VaultStoreState 
    {
        return {
            vaultID: undefined,
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

    public setVaultData(masterKey: string, vault: VaultData)
    {
        this.internalPasswordStore.updateState(JSON.parse(vault.passwordStoreState));
        this.internalValueStore.updateState(JSON.parse(vault.valueStoreState));
        this.internalFilterStore.updateState(JSON.parse(vault.filterStoreState));
        this.internalGroupStore.updateState(JSON.parse(vault.groupStoreState));
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

    public setVaultData(masterKey: string, vault: VaultData)
    {
        this.internalPasswordStore.updateState(JSON.parse(vault.passwordStoreState));
        this.internalValueStore.updateState(JSON.parse(vault.valueStoreState));
        this.internalFilterStore.updateState(JSON.parse(vault.filterStoreState));
        this.internalGroupStore.updateState(JSON.parse(vault.groupStoreState));

        this.updateLogins(masterKey);
    }

    private async updateLogins(masterKey: string)
    {
        const pendingState = this.cloneState();
        await this.recordLogin(pendingState, Date.now());
        await this.checkRemoveOldLoginRecords(pendingState);

        const transaction = new StoreUpdateTransaction(Entity.Vault, this.state.vaultID);
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