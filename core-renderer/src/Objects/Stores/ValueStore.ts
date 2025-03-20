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
    valuesByID: Map<string, ReactiveValue>;
    duplicateValues: Map<string, Map<string, string>>;
    currentAndSafeValues: CurrentAndSafeStructure;
    valuesByHash: Map<string, Map<string, string>>;
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
        return state.valuesByID;
    }

    protected defaultState()
    {
        return {
            version: 0,
            valuesByID: new Map<string, ReactiveValue>(),
            duplicateValues: new Map<string, Map<string, string>>(),
            currentAndSafeValues: new CurrentAndSafeStructure(),
            valuesByHash: new Map<string, Map<string, string>>()
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

        await this.updateValuesByHash(pendingValueStoreState.valuesByHash, "value", value);

        // doing this before adding saves us from having to remove the current value from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, pendingValueStoreState.valuesByHash, pendingValueStoreState.valuesByID, "value",
            pendingValueStoreState.duplicateValues);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = createReactiveValue(value);
        pendingValueStoreState.valuesByID.set(reactiveValue.id, reactiveValue);

        await this.incrementCurrentAndSafeValues(pendingValueStoreState, pendingValueStoreState.valuesByID);

        // update groups before filters
        this.vault.groupStore.syncGroupsForValues(value.id, new RelatedDataTypeChanges(value.groups), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForValues(new Map([[reactiveValue.id, reactiveValue]]), pendingGroupStoreState.valueGroupsByID, true,
            pendingFilterStoreState);

        return true;
    }

    async updateNameValuePair(masterKey: string, updatedValue: NameValuePair, valueWasUpdated: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentValue = pendingState.valuesByID.get(updatedValue.id);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Upate")
            return false;
        }

        // retrieve these before updating
        const channgedGroups = this.getRelatedDataTypeChanges(currentValue.groups, updatedValue.groups);

        if (valueWasUpdated)
        {
            await this.updateValuesByHash(pendingState.valuesByHash, "value", updatedValue, currentValue);
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, pendingState.valuesByHash, pendingState.valuesByID, "value",
                pendingState.duplicateValues);

            if (!(await this.setValueProperties(masterKey, updatedValue)))
            {
                return false;
            }
        }
        else
        {
            this.checkUpdateDuplicatePrimaryObjectsModifiedTime(updatedValue.id, pendingState.duplicateValues);

            const response = await cryptHelper.decrypt(masterKey, updatedValue.value);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        await this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        const newReactiveValue = createReactiveValue(updatedValue);
        currentValue = newReactiveValue;

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForValues(updatedValue.id, channgedGroups, pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.syncFiltersForValues(new Map([[currentValue.id, currentValue]]), pendingGroupState.valueGroupsByID, true,
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

        const currentValue = pendingState.valuesByID.get(value.id);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingState.valuesByHash, "value", undefined, currentValue);

        this.checkRemoveFromDuplicate(value, pendingState.duplicateValues);
        pendingState.valuesByID.delete(currentValue.id);

        await this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForValues(value.id, new RelatedDataTypeChanges(undefined, value.groups), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.removeValuesFromFilters(value.id);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private async setValueProperties(masterKey: string, value: NameValuePair): Promise<boolean>
    {
        value.lastModifiedTime = new Date().getTime().toString();
        this.checkIfValueIsWeak(value.value, value);

        const response = await cryptHelper.encrypt(masterKey, value.value);
        if (!response.success)
        {
            return false;
        }

        value.value = response.value!;
        return true;
    }

    // checks if value is weak
    // pass in value seperately from the object so that we don't have to decrypt it, assign it to the value, re encrypt it, and then re assign.
    // if we fail on the re encrypt, we would be in trouble
    private async checkIfValueIsWeak(value: string, nameValuePair: NameValuePair)
    {
        if (nameValuePair.valueType == NameValuePairType.Passphrase)
        {
            if (value.length < 16)
            {
                nameValuePair.isWeak = true;
                nameValuePair.isWeakMessage = 4;

                return;
            }
        }
        else if (nameValuePair.valueType == NameValuePairType.Passcode && nameValuePair.notifyIfWeak)
        {
            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(value);
            nameValuePair.isWeak = isWeak;
            nameValuePair.isWeakMessage = isWeakMessage;

            return;
        }

        nameValuePair.isWeak = false;
        nameValuePair.isWeakMessage = -1;
    }

    private async incrementCurrentAndSafeValues(pendingState: ValueStoreState, values: Map<string, ReactiveValue>)
    {
        const id = uniqueIDGenerator.generate();
        pendingState.currentAndSafeValues.current.set(id, values.size);

        const safePasswords = values.filter((k, v) => this.valueIsSafe(pendingState, v));
        pendingState.currentAndSafeValues.safe.set(id, safePasswords.size);
    }

    private valueIsSafe(state: ValueStoreState, value: ReactiveValue)
    {
        return !value.isOld() && !value.isWeak && !state.duplicateValues.has(value.id);
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
    get nameValuePairsByID() { return this.state.valuesByID; }
    get oldNameValuePairs() { return this.internalOldNameValuePairs }
    get duplicateNameValuePairs() { return this.state.duplicateValues }
    get weakPassphraseValues() { return this.internalWeakPassphraseValues }
    get weakPasscodeValues() { return this.internalWeakPasscodeValues }
    get currentAndSafeValuesCurrent() { return this.internalCurrentAndSafeValuesCurrent.value; }
    get currentAndSafeValuesSafe() { return this.internalCurrentAndSaveValuesSafe.value; }
    get activeAtRiskValueType() { return this.internalActiveAtRiskValueType.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalNameValuePairs = computed(() => this.state.valuesByID.valueArray());

        this.internalOldNameValuePairs = computed(() => this.state.valuesByID.mapWhere((k, v) => v.isOld(), (k, v) => v.id));

        this.internalWeakPassphraseValues = computed(() =>
            this.state.valuesByID.mapWhere((k, v) => v.valueType == NameValuePairType.Passphrase && v.isWeak, (k, v) => v.id));

        this.internalWeakPasscodeValues = computed(() =>
            this.state.valuesByID.mapWhere((k, v) => v.valueType == NameValuePairType.Passcode && v.isWeak, (k, v) => v.id));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);

        this.internalCurrentAndSafeValuesCurrent = computed(() => this.state.currentAndSafeValues.current.map((k, v) => v));
        this.internalCurrentAndSaveValuesSafe = computed(() => this.state.currentAndSafeValues.safe.map((k, v) => v));
    }

    protected preAssignState(state: ValueStoreState): void 
    {
        for (const [key, value] of state.valuesByID.entries())
        {
            state.valuesByID.set(key, createReactiveValue(value));
        }
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueType;
    }
}