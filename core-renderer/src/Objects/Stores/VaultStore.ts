import { computed, ComputedRef, ref, Ref } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { Store } from "./Base";
import { FilterStore, ReactiveFilterStore } from "./FilterStore";
import { GroupStore, ReactiveGroupStore } from "./GroupStore";
import { PasswordStore, IPasswordStoreState, ReactivePasswordStore } from "./PasswordStore";
import { ValueStore, ReactiveValueStore } from "./ValueStore";
import { VaultPreferencesStore } from "./VaultPreferencesStore";
import { CondensedVaultData, DisplayVault } from "@vaultic/shared/Types/Entities";
import { ServerPermissions } from "@vaultic/shared/Types/ClientServerTypes";
import { defaultVaultStoreState, DoubleKeyedObject, PendingStoreState, StateKeys, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import app from "./AppStore";

const MAX_LOGIN_RECORDS = 500;
export interface VaultSettings { }

interface IVaultStoreState extends StoreState
{
    /** Settings */
    s: VaultSettings;
    /** Login History */
    l: number[];
}

export interface VaultStoreStateKeys extends StateKeys
{
    'loginHistory': '';
}

const VaultStorePathRetriever: StorePathRetriever<VaultStoreStateKeys> =
{
    'loginHistory': (...ids: string[]) => `l`,
};

export type VaultStoreState = IVaultStoreState;

export class BaseVaultStore<V extends PasswordStore,
    W extends ValueStore, X extends FilterStore, Y extends GroupStore> extends Store<VaultStoreState, VaultStoreStateKeys>
{
    protected internalName: string;
    protected internalShared: boolean;
    protected internalIsArchived: Ref<boolean>;
    protected internalIsOwner: Ref<boolean>;
    protected internalPermissions: Ref<ServerPermissions | undefined>;
    protected internalIsReadOnly: Ref<boolean>;
    protected internalReadOnlyComputed: ComputedRef<boolean>;
    protected internalUserOrganizationID: number;
    protected internalUserVaultID: number;
    protected internalVaultID: number;
    protected internalPasswordsByDomain: DoubleKeyedObject | undefined;

    protected internalPasswordStore: V;
    protected internalValueStore: W;
    protected internalFilterStore: X;
    protected internalGroupStore: Y;
    protected internalVaultPreferencesStore: VaultPreferencesStore;

    get name() { return this.internalName; }
    get shared() { return this.internalShared; }
    get isArchived() { return this.internalIsArchived.value; }
    set isArchived(val: boolean) { this.internalIsArchived.value = val; }
    get isOwner() { return this.internalIsOwner; }
    get isReadOnly() { return this.internalReadOnlyComputed; }
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
        super(StoreType.Vault, VaultStorePathRetriever);
        this.internalIsReadOnly = ref(false);
        this.internalReadOnlyComputed = computed(() => this.internalIsArchived.value || this.internalIsReadOnly.value || app.isSyncing.value || app.forceReadOnly.value ||
            (this.internalIsOwner.value === false && this.internalPermissions.value == ServerPermissions.View));
        this.internalVaultPreferencesStore = new VaultPreferencesStore(this);

        this.internalIsArchived = ref(false);
        this.internalIsOwner = ref(false);
        this.internalPermissions = ref(ServerPermissions.View);
    }

    protected async setBaseVaultStoreData(data: CondensedVaultData)
    {
        this.internalUserOrganizationID = data.userOrganizationID;
        this.internalUserVaultID = data.userVaultID;
        this.internalVaultID = data.vaultID;
        this.internalIsOwner.value = data.isOwner;
        this.internalPermissions.value = data.permissions;
        this.internalShared = data.shared;
        this.internalIsArchived.value = data.isArchived;
        this.internalPasswordsByDomain = (JSON.parse(data.passwordStoreState) as IPasswordStoreState).o ?? new Map();

        await this.initalizeNewStateFromJSON(data.vaultStoreState);
        await this.internalVaultPreferencesStore.initalizeNewStateFromJSON(data.vaultPreferencesStoreState);
    }

    protected defaultState(): VaultStoreState 
    {
        return defaultVaultStoreState();
    }

    public toCondensedVaultData(): CondensedVaultData
    {
        return {
            userOrganizationID: this.internalUserOrganizationID,
            userVaultID: this.internalUserVaultID,
            vaultID: this.internalVaultID,
            vaultPreferencesStoreState: JSON.stringify(this.internalVaultPreferencesStore.getState()),
            name: this.internalName,
            shared: this.internalShared,
            isArchived: this.internalIsArchived.value,
            isOwner: this.internalIsOwner.value,
            isReadOnly: this.internalReadOnlyComputed.value,
            lastUsed: true,
            permissions: this.internalPermissions.value,
            vaultStoreState: JSON.stringify(this.getState()),
            passwordStoreState: JSON.stringify(this.internalPasswordStore.getState()),
            valueStoreState: JSON.stringify(this.internalValueStore.getState()),
            filterStoreState: JSON.stringify(this.internalFilterStore.getState()),
            groupStoreState: JSON.stringify(this.internalGroupStore.getState()),
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

    public resetToDefault()
    {
        super.resetToDefault();
        this.internalName = "";
        this.internalShared = false;
        this.internalUserOrganizationID = 0;
        this.internalUserVaultID = 0;
        this.internalVaultID = 0;    
        this.internalIsOwner.value = false;
        this.internalPermissions.value = ServerPermissions.View;
        this.internalIsArchived.value = false;
        this.internalPasswordsByDomain = undefined;
    }

    public async setReactiveVaultStoreData(masterKey: string, data: CondensedVaultData, secondLoad: boolean)
    {
        await super.setBaseVaultStoreData(data);

        await this.internalPasswordStore.initalizeNewStateFromJSON(data.passwordStoreState);
        await this.internalValueStore.initalizeNewStateFromJSON(data.valueStoreState);
        await this.internalFilterStore.initalizeNewStateFromJSON(data.filterStoreState);
        await this.internalGroupStore.initalizeNewStateFromJSON(data.groupStoreState);

        if (!secondLoad)
        {
            await this.updateLogins(masterKey);
        }
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
        const pendingState = this.getPendingState()!;
        await this.recordLogin(pendingState, Date.now());

        const transaction = new StoreUpdateTransaction(this.userVaultID);
        transaction.updateVaultStore(this, pendingState);

        await transaction.commit(masterKey);
    }

    private async recordLogin(
        pendingState: PendingStoreState<VaultStoreState, VaultStoreStateKeys>,
        dateTime: number): Promise<void>
    {
        if (pendingState.state.l.length >= MAX_LOGIN_RECORDS)
        {
            for (let i = pendingState.state.l.length - MAX_LOGIN_RECORDS; i >= 0; i--)
            {
                pendingState.deleteValue("loginHistory", "");
            }
        }

        pendingState.addValue("loginHistory", "", dateTime);
    }
}

export type VaultStoreParameter = BaseVaultStore<PasswordStore, ValueStore, FilterStore, GroupStore>;
