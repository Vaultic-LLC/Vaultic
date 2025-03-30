import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { PrimaryDataTypeStore, PrimarydataTypeStoreStateKeys, SecondarydataTypeStoreStateKeys } from "./Base";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import app from "./AppStore";
import { NameValuePair, NameValuePairType, AtRiskType, RelatedDataTypeChanges, IPrimaryDataObject } from "../../Types/DataTypes";
import { KnownMappedFields } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { FilterStoreState, FilterStoreStateKeys } from "./FilterStore";
import { GroupStoreState } from "./GroupStore";
import { CurrentAndSafeStructure, defaultValueStoreState, DictionaryAsList, DoubleKeyedObject, PendingStoreState, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

export interface IValueStoreState extends StoreState
{
    /** Values By ID */
    v: { [key: string]: ReactiveValue };
    /** Duplicate Values */
    d: DoubleKeyedObject;
    /** Current And Safe Values */
    c: CurrentAndSafeStructure;
    /** Values By Hash */
    h: DoubleKeyedObject;
}

const ValueStorePathRetriever: StorePathRetriever<PrimarydataTypeStoreStateKeys> =
{
    'dataTypesByID': (...ids: string[]) => `v`,
    'dataTypesByID.dataType': (...ids: string[]) => `v.${ids[0]}`,
    'dataTypesByID.dataType.filters': (...ids: string[]) => `v.${ids[0]}.i`,
    'dataTypesByID.dataType.groups': (...ids: string[]) => `v.${ids[0]}.g`,
    'duplicateDataTypes': (...ids: string[]) => 'd',
    'duplicateDataTypes.dataTypes': (...ids: string[]) => `d.${ids[0]}`,
    'currentAndSafeDataTypes': (...ids: string[]) => 'c',
    'currentAndSafeDataTypes.current': (...ids: string[]) => 'c.c',
    'currentAndSafeDataTypes.safe': (...ids: string[]) => 'c.s',
    'dataTypesByHash': (...ids: string[]) => 'h',
    'dataTypesByHash.dataTypes': (...ids: string[]) => `h.${ids[0]}`
};

export type ValueStoreState = KnownMappedFields<IValueStoreState>;

export class ValueStore extends PrimaryDataTypeStore<ValueStoreState, PrimarydataTypeStoreStateKeys>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, StoreType.Value, ValueStorePathRetriever);
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IValueStoreState>): { [key: string]: IPrimaryDataObject }
    {
        return state.v;
    }

    protected defaultState()
    {
        return defaultValueStoreState;
    }

    async addNameValuePair(
        masterKey: string,
        value: NameValuePair,
        pendingValueStoreState: PendingStoreState<ValueStoreState, PrimarydataTypeStoreStateKeys>,
        backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const pendingFilterStoreState = this.vault.filterStore.getPendingState()!;
        const pendingGroupStoreState = this.vault.groupStore.getPendingState()!;

        if (!await this.addNameValuePairToStores(masterKey, value, pendingValueStoreState, pendingFilterStoreState, pendingGroupStoreState))
        {
            return false;
        }

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        transaction.updateVaultStore(this, pendingValueStoreState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupStoreState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);

        return await transaction.commit(masterKey);
    }

    async addNameValuePairToStores(
        masterKey: string,
        value: NameValuePair,
        pendingValueStoreState: PendingStoreState<ValueStoreState, PrimarydataTypeStoreStateKeys>,
        pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>,
        pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>): Promise<boolean>
    {
        value.id = uniqueIDGenerator.generate();

        await this.updateValuesByHash(pendingValueStoreState, "v", value);

        // doing this before adding saves us from having to remove the current value from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, "v", pendingValueStoreState);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = createReactiveValue(value);
        pendingValueStoreState.addValue('duplicateDataTypes', reactiveValue.id, reactiveValue);

        await this.incrementCurrentAndSafe(pendingValueStoreState, this.valueIsSafe);

        // update groups before filters
        this.vault.groupStore.syncGroupsForValues(value.id, new RelatedDataTypeChanges(value.g), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForValues([reactiveValue], pendingValueStoreState, pendingGroupStoreState.state.v, pendingFilterStoreState);

        return true;
    }

    async updateNameValuePair(
        masterKey: string,
        updatedValue: NameValuePair,
        valueWasUpdated: boolean,
        groups: DictionaryAsList,
        pendingValueStoreState: PendingStoreState<ValueStoreState, PrimarydataTypeStoreStateKeys>): Promise<boolean>
    {
        let currentValue: ReactiveValue | undefined = pendingValueStoreState.getObject('dataTypesByID', updatedValue.id);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Upate")
            return false;
        }

        // retrieve these before updating
        const channgedGroups = this.getRelatedDataTypeChanges(currentValue.g, groups);

        if (valueWasUpdated)
        {
            await this.updateValuesByHash(pendingValueStoreState, "v", updatedValue, currentValue);
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, "v", pendingValueStoreState);

            if (!(await this.setValueProperties(masterKey, updatedValue)))
            {
                return false;
            }
        }
        else
        {
            const response = await cryptHelper.decrypt(masterKey, updatedValue.v);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        await this.incrementCurrentAndSafe(pendingValueStoreState, this.valueIsSafe);
        pendingValueStoreState.commitProxyObject('dataTypesByID.dataType', updatedValue, updatedValue.id);

        const pendingGroupState = this.vault.groupStore.getPendingState()!;
        this.vault.groupStore.syncGroupsForValues(updatedValue.id, channgedGroups, pendingGroupState);

        const pendingFilterState = this.vault.filterStore.getPendingState()!;
        this.vault.filterStore.syncFiltersForValues([currentValue], pendingValueStoreState, pendingGroupState.state.v, pendingFilterState);

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        transaction.updateVaultStore(this, pendingValueStoreState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    async deleteNameValuePair(masterKey: string, value: ReactiveValue): Promise<boolean>
    {
        const pendingState = this.getPendingState()!;

        const currentValue: ReactiveValue | undefined = pendingState?.getObject('dataTypesByID', value.id);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingState, "v", undefined, currentValue);

        this.checkRemoveFromDuplicate(value, pendingState);
        pendingState.deleteValue('dataTypesByID', currentValue.id);

        await this.incrementCurrentAndSafe(pendingState, this.valueIsSafe);

        const pendingGroupState = this.vault.groupStore.getPendingState()!;
        this.vault.groupStore.syncGroupsForValues(value.id, new RelatedDataTypeChanges(undefined, value.g), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.getPendingState()!;
        this.vault.filterStore.removeValuesFromFilters(value.id, pendingFilterState);

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private async setValueProperties(masterKey: string, value: NameValuePair): Promise<boolean>
    {
        value.t = new Date().getTime().toString();
        this.checkIfValueIsWeak(value.v, value);

        const response = await cryptHelper.encrypt(masterKey, value.v);
        if (!response.success)
        {
            return false;
        }

        value.v = response.value!;
        return true;
    }

    // checks if value is weak
    // pass in value seperately from the object so that we don't have to decrypt it, assign it to the value, re encrypt it, and then re assign.
    // if we fail on the re encrypt, we would be in trouble
    private async checkIfValueIsWeak(value: string, nameValuePair: NameValuePair)
    {
        if (nameValuePair.y == NameValuePairType.Passphrase)
        {
            if (value.length < 16)
            {
                nameValuePair.w = true;
                nameValuePair.m = 4;

                return;
            }
        }
        else if (nameValuePair.y == NameValuePairType.Passcode && nameValuePair.o)
        {
            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(value);
            nameValuePair.w = isWeak;
            nameValuePair.m = isWeakMessage;

            return;
        }

        nameValuePair.w = false;
        nameValuePair.m = -1;
    }

    private valueIsSafe(allDuplicates: DoubleKeyedObject, value: ReactiveValue)
    {
        return !value.isOld() && !value.w && !OH.has(allDuplicates, value.id);
    }
}

export class ReactiveValueStore extends ValueStore 
{
    private internalNameValuePairs: ComputedRef<ReactiveValue[]>;

    private internalOldNameValuePairs: ComputedRef<string[]>;
    private internalWeakPassphraseValues: ComputedRef<string[]>;
    private internalWeakPasscodeValues: ComputedRef<string[]>;

    private internalActiveAtRiskValueType: Ref<AtRiskType>;

    private internalCurrentAndSafeValuesCurrent: ComputedRef<number[]>;
    private internalCurrentAndSaveValuesSafe: ComputedRef<number[]>;

    get nameValuePairs() { return this.internalNameValuePairs.value; }
    get nameValuePairsByID() { return this.state.v; }
    get oldNameValuePairs() { return this.internalOldNameValuePairs }
    get duplicateNameValuePairs() { return this.state.d }
    get weakPassphraseValues() { return this.internalWeakPassphraseValues }
    get weakPasscodeValues() { return this.internalWeakPasscodeValues }
    get currentAndSafeValuesCurrent() { return this.internalCurrentAndSafeValuesCurrent.value; }
    get currentAndSafeValuesSafe() { return this.internalCurrentAndSaveValuesSafe.value; }
    get activeAtRiskValueType() { return this.internalActiveAtRiskValueType.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalNameValuePairs = computed(() => Object.values(this.state.v));

        this.internalOldNameValuePairs = computed(() => OH.mapWhere(this.state.v, (_, v) => v.isOld(), (k, _) => k));

        this.internalWeakPassphraseValues = computed(() =>
            OH.mapWhere(this.state.v, (_, v) => v.y == NameValuePairType.Passphrase && v.w, (k, _) => k));

        this.internalWeakPasscodeValues = computed(() =>
            OH.mapWhere(this.state.v, (_, v) => v.y == NameValuePairType.Passcode && v.w, (k, _) => k));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);

        this.internalCurrentAndSafeValuesCurrent = computed(() => this.state.c.c.map((k, v) => v));
        this.internalCurrentAndSaveValuesSafe = computed(() => this.state.c.s.map((k, v) => v));
    }

    protected preAssignState(state: ValueStoreState): void 
    {
        for (const [key, value] of Object.entries(state.v))
        {
            state.v[key] = createReactiveValue(value);
        }
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueType;
    }
}