import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { PrimaryDataTypeStore } from "./Base";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import app from "./AppStore";
import { CurrentAndSafeStructure, NameValuePair, NameValuePairType, AtRiskType, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { KnownMappedFields, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IFilterStoreState } from "./FilterStore";
import { IGroupStoreState } from "./GroupStore";
import { StoreState } from "@vaultic/shared/Types/Stores";

export interface IValueStoreState extends StoreState
{
    /** Values By ID */
    v: Map<string, ReactiveValue>;
    /** Duplicate Values */
    d: Map<string, Map<string, string>>;
    /** Current And Safe Values */
    c: CurrentAndSafeStructure;
    /** Values By Hash */
    h: Map<string, Map<string, string>>;
}

export type ValueStoreState = KnownMappedFields<IValueStoreState>;

export class ValueStore extends PrimaryDataTypeStore<ValueStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "valueStoreState");
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IValueStoreState>): Map<string, SecondaryDataObjectCollectionType>
    {
        return state.v;
    }

    protected defaultState()
    {
        return {
            version: 0,
            v: new Map<string, ReactiveValue>(),
            d: new Map<string, Map<string, string>>(),
            c: new CurrentAndSafeStructure(),
            h: new Map<string, Map<string, string>>()
        };
    }

    async addNameValuePair(masterKey: string, value: NameValuePair, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const pendingValueStoreState = this.cloneState();
        const pendingFilterStoreState = this.vault.filterStore.cloneState();
        const pendingGroupStoreState = this.vault.groupStore.cloneState();

        if (!await this.addNameValuePairToStores(masterKey, value, pendingValueStoreState, pendingFilterStoreState, pendingGroupStoreState))
        {
            return false;
        }

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        transaction.updateVaultStore(this, pendingValueStoreState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupStoreState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);

        return await transaction.commit(masterKey, backup);
    }

    async addNameValuePairToStores(masterKey: string, value: NameValuePair, pendingValueStoreState: IValueStoreState,
        pendingFilterStoreState: IFilterStoreState, pendingGroupStoreState: IGroupStoreState): Promise<boolean>
    {
        value.id = uniqueIDGenerator.generate();

        await this.updateValuesByHash(pendingValueStoreState.h, "v", value);

        // doing this before adding saves us from having to remove the current value from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, pendingValueStoreState.h, pendingValueStoreState.v, "v",
            pendingValueStoreState.d);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = createReactiveValue(value);
        pendingValueStoreState.v.set(reactiveValue.id, reactiveValue);

        await this.incrementCurrentAndSafeValues(pendingValueStoreState, pendingValueStoreState.v);

        // update groups before filters
        this.vault.groupStore.syncGroupsForValues(value.id, new RelatedDataTypeChanges(value.g), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForValues(new Map([[reactiveValue.id, reactiveValue]]), pendingGroupStoreState.v, true,
            pendingFilterStoreState);

        return true;
    }

    async updateNameValuePair(masterKey: string, updatedValue: NameValuePair, valueWasUpdated: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentValue = pendingState.v.get(updatedValue.id);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Upate")
            return false;
        }

        // retrieve these before updating
        const channgedGroups = this.getRelatedDataTypeChanges(currentValue.g, updatedValue.g);

        if (valueWasUpdated)
        {
            await this.updateValuesByHash(pendingState.h, "v", updatedValue, currentValue);
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, pendingState.h, pendingState.v, "v",
                pendingState.d);

            if (!(await this.setValueProperties(masterKey, updatedValue)))
            {
                return false;
            }
        }
        else
        {
            this.checkUpdateDuplicatePrimaryObjectsModifiedTime(updatedValue.id, pendingState.d);

            const response = await cryptHelper.decrypt(masterKey, updatedValue.v);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        await this.incrementCurrentAndSafeValues(pendingState, pendingState.v);

        const newReactiveValue = createReactiveValue(updatedValue);
        currentValue = newReactiveValue;

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForValues(updatedValue.id, channgedGroups, pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.syncFiltersForValues(new Map([[currentValue.id, currentValue]]), pendingGroupState.v, true,
            pendingFilterState);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    async deleteNameValuePair(masterKey: string, value: ReactiveValue): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentValue = pendingState.v.get(value.id);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingState.h, "v", undefined, currentValue);

        this.checkRemoveFromDuplicate(value, pendingState.d);
        pendingState.v.delete(currentValue.id);

        await this.incrementCurrentAndSafeValues(pendingState, pendingState.v);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForValues(value.id, new RelatedDataTypeChanges(undefined, value.g), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.removeValuesFromFilters(value.id);

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

    private async incrementCurrentAndSafeValues(pendingState: ValueStoreState, values: Map<string, ReactiveValue>)
    {
        const id = uniqueIDGenerator.generate();
        pendingState.c.c.set(id, values.size);

        const safePasswords = values.filter((k, v) => this.valueIsSafe(pendingState, v));
        pendingState.c.s.set(id, safePasswords.size);
    }

    private valueIsSafe(state: ValueStoreState, value: ReactiveValue)
    {
        return !value.isOld() && !value.w && !state.d.has(value.id);
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

        this.internalNameValuePairs = computed(() => this.state.v.valueArray());

        this.internalOldNameValuePairs = computed(() => this.state.v.mapWhere((k, v) => v.isOld(), (k, v) => v.id));

        this.internalWeakPassphraseValues = computed(() =>
            this.state.v.mapWhere((k, v) => v.y == NameValuePairType.Passphrase && v.w, (k, v) => v.id));

        this.internalWeakPasscodeValues = computed(() =>
            this.state.v.mapWhere((k, v) => v.y == NameValuePairType.Passcode && v.w, (k, v) => v.id));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);

        this.internalCurrentAndSafeValuesCurrent = computed(() => this.state.c.c.map((k, v) => v));
        this.internalCurrentAndSaveValuesSafe = computed(() => this.state.c.s.map((k, v) => v));
    }

    protected preAssignState(state: ValueStoreState): void 
    {
        for (const [key, value] of state.v.entries())
        {
            state.v.set(key, createReactiveValue(value));
        }
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueType;
    }
}