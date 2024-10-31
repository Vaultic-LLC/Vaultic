import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { PrimaryDataTypeStore, StoreState } from "./Base";
import { generateUniqueIDForMap } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import app from "./AppStore";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { CurrentAndSafeStructure, NameValuePair, NameValuePairType, AtRiskType } from "../../Types/DataTypes";
import { Field, FieldedObject, KnownMappedFields, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";

interface IValueStoreState extends StoreState
{
    valuesByID: Field<Map<string, Field<ReactiveValue>>>;
    duplicateValues: Dictionary<string[]>;
    currentAndSafeValues: CurrentAndSafeStructure;
}

export type ValueStoreState = KnownMappedFields<IValueStoreState>;

export class ValueStore extends PrimaryDataTypeStore<ValueStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "valueStoreState");
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IValueStoreState>): Field<Map<string, Field<SecondaryDataObjectCollectionType & FieldedObject>>>
    {
        return state.valuesByID;
    }

    protected defaultState()
    {
        return {
            valuesByID: new Field(new Map<string, Field<ReactiveValue>>()),
            duplicateValues: {},
            currentAndSafeValues: { current: [], safe: [] },
        }
    }

    async addNameValuePair(masterKey: string, value: NameValuePair, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        value.id.value = await generateUniqueIDForMap(pendingState.valuesByID.value);

        // doing this before adding saves us from having to remove the current value from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, pendingState.valuesByID, "value", pendingState.duplicateValues);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = new Field(createReactiveValue(value));
        pendingState.valuesByID.value.set(reactiveValue.value.id.value, reactiveValue);

        this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        // update groups before filters
        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(value.id.value, value.groups.value, new Map());
        const pendingFilterState = this.vault.filterStore.syncFiltersForValues(new Map([[reactiveValue.value.id.value, reactiveValue]]), pendingGroupState.valueGroupsByID);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey, backup);
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

        const addedGroups = updatedValue.groups.value.difference(currentValue.value.groups.value);
        const removedGroups = currentValue.value.groups.value.difference(updatedValue.groups.value);

        if (valueWasUpdated)
        {
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, pendingState.valuesByID, "value", pendingState.duplicateValues);
            if (!(await this.setValueProperties(masterKey, updatedValue)))
            {
                return false;
            }
        }
        else
        {
            const response = await cryptHelper.decrypt(masterKey, updatedValue.value.value);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        const newReactiveValue = createReactiveValue(updatedValue);
        currentValue.value = newReactiveValue;

        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(updatedValue.id.value, addedGroups, removedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForValues(new Map([[currentValue.value.id.value, currentValue]]), pendingGroupState.valueGroupsByID);

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

        this.checkRemoveFromDuplicate(value, pendingState.duplicateValues);
        pendingState.valuesByID.value.delete(currentValue.value.id.value);

        this.incrementCurrentAndSafeValues(pendingState, pendingState.valuesByID);

        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(value.id.value, new Map(), value.groups.value);
        const pendingFilterState = this.vault.filterStore.removeValuesFromFilters(value.id.value);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private async setValueProperties(masterKey: string, value: NameValuePair): Promise<boolean>
    {
        value.valueLength.value = value.value.value.length;
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
            const wordCount = value.split(' ').length;
            if (wordCount < 5)
            {
                nameValuePair.isWeak.value = true;
                nameValuePair.isWeakMessage.value = "Passphrase has less than 5 words in it. For best security, create a Passphrase that is longer than 5 words";

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

    private incrementCurrentAndSafeValues(pendingState: ValueStoreState, values: Field<Map<string, Field<ReactiveValue>>>)
    {
        pendingState.currentAndSafeValues.current.push(values.value.size);

        const safeValues = values.value.filter((k, v) => v.value.isSafe());
        pendingState.currentAndSafeValues.safe.push(safeValues.size);
    }
}

export class ReactiveValueStore extends ValueStore 
{
    private internalNameValuePairs: ComputedRef<Field<ReactiveValue>[]>;

    private internalOldNameValuePairs: ComputedRef<string[]>;
    private internalWeakPassphraseValues: ComputedRef<string[]>;
    private internalWeakPasscodeValues: ComputedRef<string[]>;

    private internalDuplicateNameValuePairs: ComputedRef<string[]>;
    private internalDuplicateNameValuePairsLength: ComputedRef<number>;

    private internalPinnedValues: ComputedRef<Field<ReactiveValue>[]>;
    private internalUnpinnedValues: ComputedRef<Field<ReactiveValue>[]>;

    private internalActiveAtRiskValueType: Ref<AtRiskType>;

    get nameValuePairs() { return this.internalNameValuePairs.value; }
    get pinnedValues() { return this.internalPinnedValues.value }
    get unpinnedValues() { return this.internalUnpinnedValues.value; }
    get oldNameValuePairs() { return this.internalOldNameValuePairs }
    get duplicateNameValuePairs() { return this.internalDuplicateNameValuePairs }
    get duplicateNameValuePairsLength() { return this.internalDuplicateNameValuePairsLength.value; }
    get weakPassphraseValues() { return this.internalWeakPassphraseValues }
    get weakPasscodeValues() { return this.internalWeakPasscodeValues }
    get currentAndSafeValues() { return this.state.currentAndSafeValues; }
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

        this.internalDuplicateNameValuePairs = computed(() => Object.keys(this.state.duplicateValues));
        this.internalDuplicateNameValuePairsLength = computed(() => Object.keys(this.state.duplicateValues).length);

        this.internalPinnedValues = computed(() => this.nameValuePairs.filter(nvp => app.userPreferences.pinnedValues.value.has(nvp.value.id.value)));
        this.internalUnpinnedValues = computed(() => this.nameValuePairs.filter(nvp => !app.userPreferences.pinnedValues.value.has(nvp.value.id.value)));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);
    }

    protected preAssignState(state: ValueStoreState): void 
    {
        super.preAssignState(state);

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