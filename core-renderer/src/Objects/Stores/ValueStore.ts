import { NameValuePair, CurrentAndSafeStructure, AtRiskType, NameValuePairType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { PrimaryDataObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"

export interface ValueStoreState extends DataTypeStoreState<ReactiveValue>
{
    duplicateValues: Dictionary<string[]>;
    currentAndSafeValues: CurrentAndSafeStructure;
}

class ValueStore extends PrimaryDataObjectStore<ReactiveValue, ValueStoreState>
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

    constructor()
    {
        super();

        this.internalOldNameValuePairs = computed(() => this.state.values.filter(nvp => nvp.isOld).map(nvp => nvp.id));
        this.internalWeakPassphraseValues = computed(() => this.state.values.filter(nvp => nvp.valueType == NameValuePairType.Passphrase && nvp.isWeak).map(nvp => nvp.id));
        this.internalWeakPasscodeValues = computed(() => this.state.values.filter(nvp => nvp.valueType == NameValuePairType.Passcode && nvp.isWeak).map(nvp => nvp.id));

        this.internalDuplicateNameValuePairs = computed(() => Object.keys(this.state.duplicateValues));
        this.internalDuplicateNameValuePairsLength = computed(() => Object.keys(this.state.duplicateValues).length);

        this.internalPinnedValues = computed(() => this.state.values.filter(nvp => stores.userPreferenceStore.pinnedValues.hasOwnProperty(nvp.id)));
        this.internalUnpinnedValues = computed(() => this.state.values.filter(nvp => !stores.userPreferenceStore.pinnedValues.hasOwnProperty(nvp.id)));

        this.internalActiveAtRiskValueType = ref(AtRiskType.None);
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

    protected getFile(): DataFile
    {
        return api.files.value;
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueType;
    }

    async addNameValuePair(masterKey: string, value: NameValuePair): Promise<boolean>
    {
        value.id = await generateUniqueID(this.state.values);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, value, this.state.values, "value", this.state.duplicateValues);

        if (!(await this.setValueProperties(masterKey, value)))
        {
            return false;
        }

        const reactiveValue = createReactiveValue(value);
        this.state.values.push(reactiveValue);
        this.incrementCurrentAndSafeValues();

        // update groups before filters
        stores.groupStore.syncGroupsForValues(value.id, value.groups, []);
        stores.filterStore.syncFiltersForValues(stores.filterStore.nameValuePairFilters, [value]);

        if (!(await stores.groupStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await this.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        this.events["onChange"]?.forEach(c => c());
        return true;
    }

    async updateNameValuePair(masterKey: string, updatedValue: NameValuePair, valueWasUpdated: boolean): Promise<boolean>
    {
        let currentValueIndex = this.state.values.findIndex(v => v.id == updatedValue.id);
        if (currentValueIndex < 0)
        {
            return false;
        }

        let currentValue = this.state.values[currentValueIndex];
        const addedGroups = updatedValue.groups.filter(g => !currentValue.groups.includes(g));
        const removedGroups = currentValue.groups.filter(g => !updatedValue.groups.includes(g));

        if (valueWasUpdated)
        {
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatedValue, this.state.values, "value", this.state.duplicateValues);
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

        this.incrementCurrentAndSafeValues();

        const newReactiveValue = createReactiveValue(updatedValue);
        this.state.values[currentValueIndex] = newReactiveValue;

        stores.groupStore.syncGroupsForValues(updatedValue.id, addedGroups, removedGroups);
        stores.filterStore.syncFiltersForValues(stores.filterStore.nameValuePairFilters, [updatedValue]);

        if (!(await stores.groupStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await this.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        this.events["onChange"]?.forEach(c => c());
        return true;
    }

    async deleteNameValuePair(masterKey: string, value: ReactiveValue): Promise<boolean>
    {
        const valueIndex = this.state.values.findIndex(v => v.id == value.id);
        if (valueIndex < 0)
        {
            return false;
        }

        this.checkRemoveFromDuplicate(value, this.state.duplicateValues);
        this.state.values.splice(valueIndex, 1);
        this.incrementCurrentAndSafeValues();

        stores.groupStore.syncGroupsForValues(value.id, [], value.groups);
        stores.filterStore.removeValuesFromFilters(value.id);

        if (!(await stores.groupStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await this.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        this.events["onChange"]?.forEach(c => c());
        return true;
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

    private incrementCurrentAndSafeValues()
    {
        this.state.currentAndSafeValues.current.push(this.state.values.length);

        const safeValues = this.state.values.filter(
            v => !v.isWeak && !this.duplicateNameValuePairs.value.includes(v.id) && !v.isOld);

        this.state.currentAndSafeValues.safe.push(safeValues.length);
    }
}

const valueStore = new ValueStore();
export default valueStore;

export type ValueStoreType = typeof valueStore;
