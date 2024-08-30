import { NameValuePair, CurrentAndSafeStructure, AtRiskType, NameValuePairType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { Dictionary } from "../../Types/DataStructures";
import { PrimaryDataObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import { DataType } from "../../Types/Table";
import { VaultStoreParameter } from "./VaultStore";

export interface ValueStoreState extends DataTypeStoreState<ReactiveValue>
{
    duplicateValues: Dictionary<string[]>;
    currentAndSafeValues: CurrentAndSafeStructure;
}

export class ValueStore extends PrimaryDataObjectStore<ReactiveValue, ValueStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "valueStoreState");
    }

    protected defaultState()
    {
        return {
            version: 0,
            hash: "",
            hashSalt: "",
            values: [],
            duplicateValues: {},
            currentAndSafeValues: { current: [], safe: [] },
        }
    }

    async addNameValuePair(masterKey: string, value: NameValuePair, skipBackup: boolean = false): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.Vault, this.vault.vaultID);
        const pendingState = this.cloneState();

        value.id = await generateUniqueID(pendingState.values);

        // doing this before adding saves us from having to remove the current value from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, pendingState.values, "value", pendingState.duplicateValues);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = createReactiveValue(value);
        pendingState.values.push(reactiveValue);
        this.incrementCurrentAndSafeValues(pendingState);

        // update groups before filters
        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(value.id, value.groups, []);
        const pendingFilterState = this.vault.filterStore.syncFiltersForValues([value],
            pendingGroupState.values.filter(g => g.type == DataType.NameValuePairs));

        transaction.addStore(this, pendingState);
        transaction.addStore(this.vault.groupStore, pendingGroupState);
        transaction.addStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey, skipBackup);
    }

    async updateNameValuePair(masterKey: string, updatedValue: NameValuePair, valueWasUpdated: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.Vault, this.vault.vaultID);
        const pendingState = this.cloneState();

        let currentValueIndex = pendingState.values.findIndex(v => v.id == updatedValue.id);
        if (currentValueIndex < 0)
        {
            return false;
        }

        let currentValue = pendingState.values[currentValueIndex];
        const addedGroups = updatedValue.groups.filter(g => !currentValue.groups.includes(g));
        const removedGroups = currentValue.groups.filter(g => !updatedValue.groups.includes(g));

        if (valueWasUpdated)
        {
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, pendingState.values, "value", pendingState.duplicateValues);
            if (!(await this.setValueProperties(masterKey, updatedValue)))
            {
                return false;
            }
        }
        else
        {
            const response = await cryptHelper.decrypt(masterKey, updatedValue.value);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        this.incrementCurrentAndSafeValues(pendingState);

        const newReactiveValue = createReactiveValue(updatedValue);
        pendingState.values[currentValueIndex] = newReactiveValue;

        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(updatedValue.id, addedGroups, removedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForValues([updatedValue],
            pendingGroupState.values.filter(g => g.type == DataType.NameValuePairs));

        transaction.addStore(this, pendingState);
        transaction.addStore(this.vault.groupStore, pendingGroupState);
        transaction.addStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    async deleteNameValuePair(masterKey: string, value: ReactiveValue): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.Vault, this.vault.vaultID);
        const pendingState = this.cloneState();

        const valueIndex = pendingState.values.findIndex(v => v.id == value.id);
        if (valueIndex < 0)
        {
            return false;
        }

        this.checkRemoveFromDuplicate(value, pendingState.duplicateValues);
        pendingState.values.splice(valueIndex, 1);
        this.incrementCurrentAndSafeValues(pendingState);

        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(value.id, [], value.groups);
        const pendingFilterState = this.vault.filterStore.removeValuesFromFilters(value.id);

        transaction.addStore(this, pendingState);
        transaction.addStore(this.vault.groupStore, pendingGroupState);
        transaction.addStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private async setValueProperties(masterKey: string, value: NameValuePair): Promise<boolean>
    {
        value.valueLength = value.value.length;
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
            const wordCount = value.split(' ').length;
            if (wordCount < 5)
            {
                nameValuePair.isWeak = true;
                nameValuePair.isWeakMessage = "Passphrase has less than 5 words in it. For best security, create a Passphrase that is longer than 5 words";

                return;
            }
        }
        else if (nameValuePair.valueType == NameValuePairType.Passcode && nameValuePair.notifyIfWeak)
        {
            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(value, "Value");
            nameValuePair.isWeak = isWeak;
            nameValuePair.isWeakMessage = isWeakMessage;

            return;
        }

        nameValuePair.isWeak = false;
        nameValuePair.isWeakMessage = "";
    }

    private incrementCurrentAndSafeValues(pendingState: ValueStoreState)
    {
        pendingState.currentAndSafeValues.current.push(pendingState.values.length);

        const safeValues = pendingState.values.filter(
            v => !v.isWeak && !pendingState.duplicateValues[v.id] && !v.isOld);

        pendingState.currentAndSafeValues.safe.push(safeValues.length);
    }
}

export class ReactiveValueStore extends ValueStore 
{
    private internalOldNameValuePairs: ComputedRef<string[]>;
    private internalWeakPassphraseValues: ComputedRef<string[]>;
    private internalWeakPasscodeValues: ComputedRef<string[]>;

    private internalDuplicateNameValuePairs: ComputedRef<string[]>;
    private internalDuplicateNameValuePairsLength: ComputedRef<number>;

    private internalPinnedValues: ComputedRef<ReactiveValue[]>;
    private internalUnpinnedValues: ComputedRef<ReactiveValue[]>;

    private internalActiveAtRiskValueType: Ref<AtRiskType>;

    get nameValuePairs() { return this.state.values; }
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

        this.internalOldNameValuePairs = computed(() => this.state.values.filter(nvp => nvp.isOld).map(nvp => nvp.id));
        this.internalWeakPassphraseValues = computed(() => this.state.values.filter(nvp => nvp.valueType == NameValuePairType.Passphrase && nvp.isWeak).map(nvp => nvp.id));
        this.internalWeakPasscodeValues = computed(() => this.state.values.filter(nvp => nvp.valueType == NameValuePairType.Passcode && nvp.isWeak).map(nvp => nvp.id));

        this.internalDuplicateNameValuePairs = computed(() => Object.keys(this.state.duplicateValues));
        this.internalDuplicateNameValuePairsLength = computed(() => Object.keys(this.state.duplicateValues).length);

        this.internalPinnedValues = computed(() => this.state.values.filter(nvp => this.vault.vaultPreferencesStore.pinnedValues.hasOwnProperty(nvp.id)));
        this.internalUnpinnedValues = computed(() => this.state.values.filter(nvp => !this.vault.vaultPreferencesStore.pinnedValues.hasOwnProperty(nvp.id)));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);
    }

    protected postAssignState(state: ValueStoreState): void 
    {
        for (let i = 0; i < state.values.length; i++)
        {
            state.values[i] = createReactiveValue(state.values[i]);
        }
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueType;
    }
}