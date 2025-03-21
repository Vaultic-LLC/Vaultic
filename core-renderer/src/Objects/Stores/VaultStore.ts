import { computed, ComputedRef, ref, Ref } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { Store } from "./Base";
import { FilterStore, ReactiveFilterStore } from "./FilterStore";
import { GroupStore, ReactiveGroupStore } from "./GroupStore";
import { PasswordStore, PasswordStoreState, ReactivePasswordStore } from "./PasswordStore";
import { ValueStore, ReactiveValueStore } from "./ValueStore";
import { VaultPreferencesStore } from "./VaultPreferencesStore";
import { CondensedVaultData, DisplayVault } from "@vaultic/shared/Types/Entities";
import { ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";
import { StoreState } from "@vaultic/shared/Types/Stores";

const MAX_LOGIN_RECORDS = 500;
export interface VaultSettings { }

interface IVaultStoreState extends StoreState
{
    s: VaultSettings;
    l: Map<number, number>;
}

export type VaultStoreState = IVaultStoreState;

export class BaseVaultStore<V extends PasswordStore,
    W extends ValueStore, X extends FilterStore, Y extends GroupStore> extends Store<VaultStoreState>
{
    protected internalName: string;
    protected internalShared: boolean;
    protected internalIsArchived: boolean;
    protected internalIsOwner: boolean;
    protected internalIsReadOnly: Ref<boolean>;
    protected internalUserOrganizationID: number;
    protected internalUserVaultID: number;
    protected internalVaultID: number;
    protected internalPasswordsByDomain: Map<string, Map<string, string>> | undefined;

    protected internalPasswordStore: V;
    protected internalValueStore: W;
    protected internalFilterStore: X;
    protected internalGroupStore: Y;
    protected internalVaultPreferencesStore: VaultPreferencesStore;

    get name() { return this.internalName; }
    get shared() { return this.internalShared; }
    get isArchived() { return this.internalIsArchived; }
    get isOwner() { return this.internalIsOwner; }
    get isReadOnly() { return this.internalIsReadOnly; }
    get userOrganizationID() { return this.internalUserOrganizationID; }
    get userVaultID() { return this.internalUserVaultID; }
    get vaultID() { return this.internalVaultID; }
    get passwordsByDomain() { return this.internalPasswordsByDomain; }
    set passwordsByDomain(value) { this.internalPasswordsByDomain = value; }

    get settings() { return this.state.s; }

    get passwordStore() { return this.internalPasswordStore; }
    get valueStore() { return this.internalValueStore; }
    get filterStore() { return this.internalFilterStore; }
    get groupStore() { return this.internalGroupStore; }
    get vaultPreferencesStore() { return this.internalVaultPreferencesStore; }

    constructor() 
    {
        super("vaultStoreState");
        this.internalIsReadOnly = ref(false);
        this.internalVaultPreferencesStore = new VaultPreferencesStore(this);
    }

    protected async setBaseVaultStoreData(data: CondensedVaultData)
    {
        this.internalUserOrganizationID = data.userOrganizationID;
        this.internalUserVaultID = data.userVaultID;
        this.internalVaultID = data.vaultID;
        this.internalIsOwner = data.isOwner;
        this.internalIsReadOnly.value = data.isArchived || (data.isOwner === false && data.permissions === ServerPermissions.View);
        this.internalShared = data.shared;
        this.internalIsArchived = data.isArchived;
        this.internalPasswordsByDomain = (JSON.vaulticParse(data.passwordStoreState) as PasswordStoreState).passwordsByDomain ?? new Map();

        await this.initalizeNewStateFromJSON(data.vaultStoreState);
        await this.internalVaultPreferencesStore.initalizeNewStateFromJSON(data.vaultPreferencesStoreState);
    }

    protected defaultState(): VaultStoreState 
    {
        return {
            version: 0,
            s: {},
            l: new Map<number, number>()
        };
    }
}

// Currently not used anymore with the change to store archived / shared vaults locally
export class BasicVaultStore extends BaseVaultStore<PasswordStore, ValueStore, FilterStore, GroupStore>
{
    protected internalIsLoaded: boolean;

    get isLoaded() { return this.internalIsLoaded; }

    constructor(displayVault: DisplayVault)
    {
        super();
        this.internalPasswordStore = new PasswordStore(this);
        this.internalValueStore = new ValueStore(this);
        this.internalFilterStore = new FilterStore(this);
        this.internalGroupStore = new GroupStore(this);

        this.internalIsLoaded = false;
        this.internalName = displayVault.name;
        this.internalShared = displayVault.shared;
        this.internalUserOrganizationID = displayVault.userOrganizationID;
        this.internalUserVaultID = displayVault.userVaultID;
        this.internalVaultID = displayVault.vaultID;
    }

    public async setBasicVaultStoreData(data: CondensedVaultData)
    {
        await super.setBaseVaultStoreData(data);
        await this.internalPasswordStore.initalizeNewStateFromJSON(data.passwordStoreState);
        await this.internalValueStore.initalizeNewStateFromJSON(data.valueStoreState);
        await this.internalFilterStore.initalizeNewStateFromJSON(data.filterStoreState);
        await this.internalGroupStore.initalizeNewStateFromJSON(data.groupStoreState);

        this.internalIsLoaded = true;
    }
}

export class ReactiveVaultStore extends BaseVaultStore<ReactivePasswordStore,
    ReactiveValueStore, ReactiveFilterStore, ReactiveGroupStore>
{
    protected internalReactiveUserVaultID: ComputedRef<number>;

    get reactiveUserVaultID() { return this.internalReactiveUserVaultID.value; }
    get loginHistory() { return this.state.l; }

    constructor()
    {
        super();
        this.internalReactiveUserVaultID = computed(() => this.userVaultID);
        this.internalPasswordStore = new ReactivePasswordStore(this);
        this.internalValueStore = new ReactiveValueStore(this);
        this.internalFilterStore = new ReactiveFilterStore(this);
        this.internalGroupStore = new ReactiveGroupStore(this);
    }

    public async setReactiveVaultStoreData(masterKey: string, data: CondensedVaultData)
    {
        await super.setBaseVaultStoreData(data);

        await this.internalPasswordStore.initalizeNewStateFromJSON(data.passwordStoreState);
        await this.internalValueStore.initalizeNewStateFromJSON(data.valueStoreState);
        await this.internalFilterStore.initalizeNewStateFromJSON(data.filterStoreState);
        await this.internalGroupStore.initalizeNewStateFromJSON(data.groupStoreState);

        await this.updateLogins(masterKey);
    }

    public async setVaultDataFromBasicVault(masterKey: string, basicVault: BasicVaultStore, recordLogin: boolean, readOnly: boolean)
    {
        this.internalIsReadOnly.value = readOnly;
        this.internalUserOrganizationID = basicVault.userOrganizationID;
        this.internalUserVaultID = basicVault.userVaultID;
        this.internalVaultID = basicVault.vaultID;
        this.internalPasswordsByDomain = basicVault.passwordsByDomain;
        this.initalizeNewState(basicVault.getState());
        this.internalVaultPreferencesStore.initalizeNewState(basicVault.vaultPreferencesStore.getState());

        this.internalPasswordStore.initalizeNewState(basicVault.passwordStore.getState());
        this.internalValueStore.initalizeNewState(basicVault.valueStore.getState());
        this.filterStore.initalizeNewState(basicVault.filterStore.getState());
        this.groupStore.initalizeNewState(basicVault.groupStore.getState());

        if (recordLogin)
        {
            await this.updateLogins(masterKey);
        }
    }

    private async updateLogins(masterKey: string)
    {
        const pendingState = this.cloneState();
        await this.recordLogin(pendingState, Date.now());

        const transaction = new StoreUpdateTransaction(this.userVaultID);
        transaction.updateVaultStore(this, pendingState);

        await transaction.commit(masterKey);
    }

    private async recordLogin(pendingState: VaultStoreState, dateTime: number): Promise<void>
    {
        if (pendingState.l.size >= MAX_LOGIN_RECORDS)
        {
            for (let i = pendingState.l.size - MAX_LOGIN_RECORDS; i >= 0; i--)
            {
                const result = pendingState.l.entries().next();
                if (result.value)
                {
                    pendingState.l.delete(result.value[0]);
                }
            }
        }

        pendingState.l.set(dateTime, dateTime);
    }
}

export type VaultStoreParameter = BaseVaultStore<PasswordStore, ValueStore, FilterStore, GroupStore>;
