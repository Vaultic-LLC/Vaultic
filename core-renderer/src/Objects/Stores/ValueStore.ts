import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { PrimaryDataTypeStore, StoreState } from "./Base";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import app from "./AppStore";
import { CurrentAndSafeStructure, NameValuePair, NameValuePairType, AtRiskType, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { Field, IFieldedObject, KnownMappedFields, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { FieldTreeUtility } from "../../Types/Tree";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IFilterStoreState } from "./FilterStore";
import { IGroupStoreState } from "./GroupStore";

export interface IValueStoreState extends StoreState
{
    valuesByID: Field<Map<string, Field<ReactiveValue>>>;
    duplicateValues: Field<Map<string, Field<Map<string, Field<string>>>>>;
    currentAndSafeValues: Field<KnownMappedFields<CurrentAndSafeStructure>>;
    valuesByHash: Field<Map<string, Field<Map<string, Field<string>>>>>;
}

export type ValueStoreState = KnownMappedFields<IValueStoreState>;

export class ValueStore extends PrimaryDataTypeStore<ValueStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "valueStoreState");
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IValueStoreState>): Field<Map<string, Field<SecondaryDataObjectCollectionType & IFieldedObject>>>
    {
        return state.valuesByID;
    }

    protected defaultState()
    {
        return FieldTreeUtility.setupIDs<IValueStoreState>({
            version: Field.create(0),
            valuesByID: Field.create(new Map<string, Field<ReactiveValue>>()),
            duplicateValues: Field.create(new Map<string, Field<Map<string, Field<string>>>>()),
            currentAndSafeValues: Field.create(new CurrentAndSafeStructure()),
            valuesByHash: Field.create(new Map<string, Field<Map<string, Field<string>>>>())
        });
    }

    async addNameValuePair(masterKey: string, value: NameValuePair): Promise<boolean>
    {
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

        return await transaction.commit(masterKey);
    }

    async addNameValuePairToStores(masterKey: string, value: NameValuePair, pendingValueStoreState: IValueStoreState,
        pendingFilterStoreState: IFilterStoreState, pendingGroupStoreState: IGroupStoreState): Promise<boolean>
    {
        value.id.value = uniqueIDGenerator.generate();

        await this.updateValuesByHash(pendingValueStoreState.valuesByHash, "value", value);

        // doing this before adding saves us from having to remove the current value from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, pendingValueStoreState.valuesByHash, pendingValueStoreState.valuesByID, "value",
            pendingValueStoreState.duplicateValues);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = Field.create(createReactiveValue(value));
        pendingValueStoreState.valuesByID.addMapValue(reactiveValue.value.id.value, reactiveValue);

        await this.incrementCurrentAndSafeValues(pendingValueStoreState, pendingValueStoreState.valuesByID);

        // update groups before filters
        this.vault.groupStore.syncGroupsForValues(value.id.value, new RelatedDataTypeChanges(value.groups.value), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForValues(new Map([[reactiveValue.value.id.value, reactiveValue]]), pendingGroupStoreState.valueGroupsByID, true,
            pendingFilterStoreState);

        return true;
    }

    async updateNameValuePair(masterKey: string, updatedValue: NameValuePair, valueWasUpdated: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentValue = pendingState.valuesByID.value.get(updatedValue.id.value);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Upate")
            return false;
        }

        // retrieve these before updating
        const channgedGroups = this.getRelatedDataTypeChanges(currentValue.value.groups.value, updatedValue.groups.value);

        if (valueWasUpdated)
        {
            await this.updateValuesByHash(pendingState.valuesByHash, "value", updatedValue, currentValue.value);
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, pendingState.valuesByHash, pendingState.valuesByID, "value",
                pendingState.duplicateValues);

            if (!(await this.setValueProperties(masterKey, updatedValue)))
            {
                return false;
            }
        }
        else
        {
            this.checkUpdateDuplicatePrimaryObjectsModifiedTime(updatedValue.id.value, pendingState.duplicateValues);

            const response = await cryptHelper.decrypt(masterKey, updatedValue.value.value);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        await this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        const newReactiveValue = createReactiveValue(updatedValue);
        currentValue.value = newReactiveValue;

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForValues(updatedValue.id.value, channgedGroups, pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.syncFiltersForValues(new Map([[currentValue.value.id.value, currentValue]]), pendingGroupState.valueGroupsByID, true,
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

        const currentValue = pendingState.valuesByID.value.get(value.id.value);
        if (!currentValue)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingState.valuesByHash, "value", undefined, currentValue.value);

        this.checkRemoveFromDuplicate(value, pendingState.duplicateValues);
        pendingState.valuesByID.removeMapValue(currentValue.value.id.value);

        await this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForValues(value.id.value, new RelatedDataTypeChanges(undefined, value.groups.value), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.removeValuesFromFilters(value.id.value);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private async setValueProperties(masterKey: string, value: NameValuePair): Promise<boolean>
    {
        value.lastModifiedTime.value = new Date().getTime().toString();
        this.checkIfValueIsWeak(value.value.value, value);

        const response = await cryptHelper.encrypt(masterKey, value.value.value);
        if (!response.success)
        {
            return false;
        }

        value.value.value = response.value!;
        return true;
    }

    // checks if value is weak
    // pass in value seperately from the object so that we don't have to decrypt it, assign it to the value, re encrypt it, and then re assign.
    // if we fail on the re encrypt, we would be in trouble
    private async checkIfValueIsWeak(value: string, nameValuePair: NameValuePair)
    {
        if (nameValuePair.valueType?.value == NameValuePairType.Passphrase)
        {
            if (value.length < 16)
            {
                nameValuePair.isWeak.value = true;
                nameValuePair.isWeakMessage.value = `Passphrase is less than 16 characters. For best security, create Passphrases that are at least 16 characters long.`;

                return;
            }
        }
        else if (nameValuePair.valueType?.value == NameValuePairType.Passcode && nameValuePair.notifyIfWeak.value)
        {
            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(value, "Value");
            nameValuePair.isWeak.value = isWeak;
            nameValuePair.isWeakMessage.value = isWeakMessage;

            return;
        }

        nameValuePair.isWeak.value = false;
        nameValuePair.isWeakMessage.value = "";
    }

    private async incrementCurrentAndSafeValues(pendingState: ValueStoreState, values: Field<Map<string, Field<ReactiveValue>>>)
    {
        const id = uniqueIDGenerator.generate();
        pendingState.currentAndSafeValues.value.current.addMapValue(id, Field.create(values.value.size));

        const safePasswords = values.value.filter((k, v) => this.valueIsSafe(pendingState, v.value));
        pendingState.currentAndSafeValues.value.safe.addMapValue(id, Field.create(safePasswords.size));
    }

    private valueIsSafe(state: ValueStoreState, value: ReactiveValue)
    {
        return !value.isOld() && !value.isWeak.value && !state.duplicateValues.value.has(value.id.value);
    }
}

export class ReactiveValueStore extends ValueStore 
{
    private internalNameValuePairs: ComputedRef<Field<ReactiveValue>[]>;

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

        this.internalNameValuePairs = computed(() => this.state.valuesByID.value.valueArray());

        this.internalOldNameValuePairs = computed(() => this.state.valuesByID.value.mapWhere((k, v) => v.value.isOld(), (k, v) => v.value.id.value));

        this.internalWeakPassphraseValues = computed(() =>
            this.state.valuesByID.value.mapWhere((k, v) => v.value.valueType?.value == NameValuePairType.Passphrase && v.value.isWeak.value, (k, v) => v.value.id.value));

        this.internalWeakPasscodeValues = computed(() =>
            this.state.valuesByID.value.mapWhere((k, v) => v.value.valueType?.value == NameValuePairType.Passcode && v.value.isWeak.value, (k, v) => v.value.id.value));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);

        this.internalCurrentAndSafeValuesCurrent = computed(() => this.state.currentAndSafeValues.value.current.value.map((k, v) => v.value));
        this.internalCurrentAndSaveValuesSafe = computed(() => this.state.currentAndSafeValues.value.safe.value.map((k, v) => v.value));
    }

    protected preAssignState(state: ValueStoreState): void 
    {
        for (const [key, value] of state.valuesByID.value.entries())
        {
            value.value = createReactiveValue(value.value);
        }
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueType;
    }
}