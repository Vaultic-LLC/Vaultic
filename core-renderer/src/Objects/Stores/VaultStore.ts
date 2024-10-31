import { ref, Ref } from "vue";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { Store, StoreState } from "./Base";
import { FilterStore, ReactiveFilterStore } from "./FilterStore";
import { GroupStore, ReactiveGroupStore } from "./GroupStore";
import { PasswordStore, ReactivePasswordStore } from "./PasswordStore";
import { ValueStore, ReactiveValueStore } from "./ValueStore";
import { VaultPreferencesStore } from "./VaultPreferencesStore";
import { CondensedVaultData, DisplayVault } from "@vaultic/shared/Types/Entities";
import { Field, FieldedObject, KnownMappedFields } from "@vaultic/shared/Types/Fields";

export interface VaultSettings extends FieldedObject
{
    loginRecordsToStorePerDay: Field<number>;
    numberOfDaysToStoreLoginRecords: Field<number>;
}

interface DaysLogins extends FieldedObject
{
    daysLogin: Field<Map<number, Field<number>>>;
}

interface IVaultStoreState extends StoreState
{
    settings: Field<VaultSettings>;
    loginHistory: Field<Map<string, Field<KnownMappedFields<DaysLogins>>>>;
}

export type VaultStoreState = KnownMappedFields<IVaultStoreState>;

export class BaseVaultStore<V extends PasswordStore,
    W extends ValueStore, X extends FilterStore, Y extends GroupStore> extends Store<VaultStoreState> implements DisplayVault
{
    protected internalName: string;

    protected internalUserVaultID: Ref<number | undefined>;
    protected internalPasswordStore: V;
    protected internalValueStore: W;
    protected internalFilterStore: X;
    protected internalGroupStore: Y;
    protected internalVaultPreferencesStore: VaultPreferencesStore;

    get name() { return this.internalName; }
    get userVaultID() { return this.internalUserVaultID.value; }
    get settings() { return this.state.settings; }

    get passwordStore() { return this.internalPasswordStore; }
    get valueStore() { return this.internalValueStore; }
    get filterStore() { return this.internalFilterStore; }
    get groupStore() { return this.internalGroupStore; }
    get vaultPreferencesStore() { return this.internalVaultPreferencesStore; }

    constructor() 
    {
        super("vaultStoreState");
        this.internalUserVaultID = ref(undefined);
        this.internalVaultPreferencesStore = new VaultPreferencesStore(this);
    }

    protected async setBaseVaultStoreData(data: CondensedVaultData)
    {
        this.internalUserVaultID.value = data.userVaultID;
        await this.initalizeNewStateFromJSON(data.vaultStoreState);
        await this.internalVaultPreferencesStore.initalizeNewStateFromJSON(data.vaultPreferencesStoreState);
    }

    protected defaultState(): VaultStoreState 
    {
        return {
            settings: new Field(
                {
                    id: new Field(""),
                    loginRecordsToStorePerDay: new Field(13),
                    numberOfDaysToStoreLoginRecords: new Field(30)
                }),
            loginHistory: new Field(new Map<string, Field<KnownMappedFields<DaysLogins>>>())
        }
    }
}

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
        this.internalUserVaultID.value = displayVault.userVaultID;
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
    protected internalIsReadOnly: Ref<boolean>;

    get isReadOnly() { return this.internalIsReadOnly; }
    get loginHistory() { return this.state.loginHistory; }

    constructor()
    {
        super();
        this.internalIsReadOnly = ref(false);
        this.internalPasswordStore = new ReactivePasswordStore(this);
        this.internalValueStore = new ReactiveValueStore(this);
        this.internalFilterStore = new ReactiveFilterStore(this);
        this.internalGroupStore = new ReactiveGroupStore(this);
    }

    public async setReactiveVaultStoreData(masterKey: string, data: CondensedVaultData)
    {
        await super.setBaseVaultStoreData(data);

        this.internalIsReadOnly.value = false;

        await this.internalPasswordStore.initalizeNewStateFromJSON(data.passwordStoreState);
        await this.internalValueStore.initalizeNewStateFromJSON(data.valueStoreState);
        await this.internalFilterStore.initalizeNewStateFromJSON(data.filterStoreState);
        await this.internalGroupStore.initalizeNewStateFromJSON(data.groupStoreState);

        await this.updateLogins(masterKey);
    }

    public async setVaultDataFromBasicVault(masterKey: string, basicVault: BasicVaultStore, recordLogin: boolean, readOnly: boolean)
    {
        this.internalIsReadOnly.value = readOnly;
        this.internalUserVaultID.value = basicVault.userVaultID;
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
        await this.checkRemoveOldLoginRecords(pendingState);

        const transaction = new StoreUpdateTransaction(this.userVaultID);
        transaction.updateVaultStore(this, pendingState);

        await transaction.commit(masterKey);
    }

    private async recordLogin(pendingState: VaultStoreState, dateTime: number): Promise<void>
    {
        const dateObj: Date = new Date(dateTime);
        const loginHistoryKey: string = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;

        if (!pendingState.loginHistory.value.has(loginHistoryKey))
        {
            const daysLogin: KnownMappedFields<DaysLogins> =
            {
                id: new Field(""),
                daysLogin: new Field(new Map<number, Field<number>>([[dateTime, new Field(dateTime)]]))
            };

            pendingState.loginHistory.value.set(loginHistoryKey, new Field(daysLogin));
        }
        else if (pendingState.loginHistory.value.get(loginHistoryKey)!.value.daysLogin.value.size < this.state.settings.value.loginRecordsToStorePerDay.value)
        {
            pendingState.loginHistory.value.get(loginHistoryKey)?.value.daysLogin.value.set(dateTime, new Field(dateTime));
        }
        else
        {
            const valueToDelete = pendingState.loginHistory.value.get(loginHistoryKey)!.value.daysLogin.value.entries().next().value![0];
            pendingState.loginHistory.value.get(loginHistoryKey)!.value.daysLogin.value.delete(valueToDelete);
            pendingState.loginHistory.value.get(loginHistoryKey)?.value.daysLogin.value.set(dateTime, new Field(dateTime));
        }
    }

    private async checkRemoveOldLoginRecords(pendingState: VaultStoreState)
    {
        const daysToStoreLoginsAsMiliseconds: number = this.state.settings.value.numberOfDaysToStoreLoginRecords.value * 24 * 60 * 60 * 1000;
        pendingState.loginHistory.value.forEach((v, k, m) => 
        {
            const date: number = Date.parse(k);
            if (date - Date.now() > daysToStoreLoginsAsMiliseconds)
            {
                pendingState.loginHistory.value.delete(k);
            }
        });
    }
}

export type VaultStoreParameter = BaseVaultStore<PasswordStore, ValueStore, FilterStore, GroupStore>;
