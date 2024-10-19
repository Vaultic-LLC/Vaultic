import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { PrimaryDataTypeStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import app from "./AppStore";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { CurrentAndSafeStructure, NameValuePair, DataType, NameValuePairType, AtRiskType } from "../../Types/DataTypes";

export interface ValueStoreState extends DataTypeStoreState<ReactiveValue>
{
    duplicateValues: Dictionary<string[]>;
    currentAndSafeValues: CurrentAndSafeStructure;
}

export class ValueStore extends PrimaryDataTypeStore<ReactiveValue, ValueStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "valueStoreState");
    }

    protected defaultState()
    {
        return {
            hash: "",
            hashSalt: "",
            values: [],
            duplicateValues: {},
            currentAndSafeValues: { current: [], safe: [] },
        }
    }

    async addNameValuePair(masterKey: string, value: NameValuePair, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        value.id.value = await generateUniqueID(pendingState.values);

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
        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(value.id.value, value.groups.value, []);
        const pendingFilterState = this.vault.filterStore.syncFiltersForValues([value],
            pendingGroupState.values.filter(g => g.type.value == DataType.NameValuePairs));

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey, backup);
    }

    async updateNameValuePair(masterKey: string, updatedValue: NameValuePair, valueWasUpdated: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentValueIndex = pendingState.values.findIndex(v => v.id.value == updatedValue.id.value);
        if (currentValueIndex < 0)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Upate")
            return false;
        }

        let currentValue = pendingState.values[currentValueIndex];
        const addedGroups = updatedValue.groups.value.filter(g => !currentValue.groups.value.includes(g));
        const removedGroups = currentValue.groups.value.filter(g => !updatedValue.groups.value.includes(g));

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
            const response = await cryptHelper.decrypt(masterKey, updatedValue.value.value);
            if (!response.success)
            {
                return false;
            }

            // check if the value is weak in case something changed
            this.checkIfValueIsWeak(response.value!, updatedValue);
        }

        this.incrementCurrentAndSafeValues(pendingState);

        // TODO: this breaks field reactivity
        const newReactiveValue = createReactiveValue(updatedValue);
        pendingState.values[currentValueIndex] = newReactiveValue;

        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(updatedValue.id.value, addedGroups, removedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForValues([updatedValue],
            pendingGroupState.values.filter(g => g.type.value == DataType.NameValuePairs));

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    async deleteNameValuePair(masterKey: string, value: ReactiveValue): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const valueIndex = pendingState.values.findIndex(v => v.id.value == value.id.value);
        if (valueIndex < 0)
        {
            await api.repositories.logs.log(undefined, `No Value`, "ValueStore.Delete")
            return false;
        }

        this.checkRemoveFromDuplicate(value, pendingState.duplicateValues);
        pendingState.values.splice(valueIndex, 1);
        this.incrementCurrentAndSafeValues(pendingState);

        const pendingGroupState = this.vault.groupStore.syncGroupsForValues(value.id.value, [], value.groups.value);
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

    private incrementCurrentAndSafeValues(pendingState: ValueStoreState)
    {
        pendingState.currentAndSafeValues.current.push(pendingState.values.length);

        const safeValues = pendingState.values.filter(v => v.isSafe());
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

        this.internalOldNameValuePairs = computed(() => this.state.values.filter(nvp => nvp.isOld()).map(nvp => nvp.id.value));
        this.internalWeakPassphraseValues = computed(() => this.state.values.filter(nvp => nvp.valueType?.value == NameValuePairType.Passphrase && nvp.isWeak.value).map(nvp => nvp.id.value));
        this.internalWeakPasscodeValues = computed(() => this.state.values.filter(nvp => nvp.valueType?.value == NameValuePairType.Passcode && nvp.isWeak.value).map(nvp => nvp.id.value));

        this.internalDuplicateNameValuePairs = computed(() => Object.keys(this.state.duplicateValues));
        this.internalDuplicateNameValuePairsLength = computed(() => Object.keys(this.state.duplicateValues).length);

        this.internalPinnedValues = computed(() => this.state.values.filter(nvp => this.vault.vaultPreferencesStore.pinnedValues.hasOwnProperty(nvp.id.value)));
        this.internalUnpinnedValues = computed(() => this.state.values.filter(nvp => !this.vault.vaultPreferencesStore.pinnedValues.hasOwnProperty(nvp.id.value)));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);
    }

    protected preAssignState(state: ValueStoreState): void 
    {
        super.preAssignState(state);
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