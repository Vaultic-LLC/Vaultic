import { NameValuePair, CurrentAndSafeStructure, AtRiskType, NameValuePairType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import { ReactiveValue } from "./ReactiveValue";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { DataTypeStore, DataTypeStoreState } from "./Base";

export interface ValueStoreState extends DataTypeStoreState<ReactiveValue>
{
	duplicateValues: Dictionary<string[]>;
	currentAndSafeValues: CurrentAndSafeStructure;
}

class ValueStore extends DataTypeStore<ReactiveValue, ValueStoreState>
{
	private internalOldNameValuePairs: ComputedRef<string[]>;
	private internalWeakVerbalValues: ComputedRef<string[]>;
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
	get weakVerbalValues() { return this.internalWeakVerbalValues }
	get weakPasscodeValues() { return this.internalWeakPasscodeValues }
	get currentAndSafeValues() { return this.state.currentAndSafeValues; }
	get activeAtRiskValueType() { return this.internalActiveAtRiskValueType.value; }

	constructor()
	{
		super();

		this.internalOldNameValuePairs = computed(() => this.state.values.filter(nvp => nvp.isOld).map(nvp => nvp.id));
		this.internalWeakVerbalValues = computed(() => this.state.values.filter(nvp => nvp.valueType == NameValuePairType.Verbal && nvp.isWeak).map(nvp => nvp.id));
		this.internalWeakPasscodeValues = computed(() => this.state.values.filter(nvp => nvp.valueType == NameValuePairType.Passcode && nvp.isWeak).map(nvp => nvp.id));

		this.internalDuplicateNameValuePairs = computed(() => this.state.values.filter(nvp => nvp.isDuplicate).map(nvp => nvp.id));
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
		return window.api.files.value;
	}

	protected getValueAtRiskType(): Ref<AtRiskType>
	{
		return this.internalActiveAtRiskValueType;
	}

	async addNameValuePair(key: string, value: NameValuePair): Promise<boolean>
	{
		const addValueData = {
			Sync: false,
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Value: value,
			...stores.getStates()
		};

		const data: any = await window.api.server.value.add(JSON.stringify(addValueData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}

	async updateNameValuePair(value: NameValuePair, valueWasUpdated: boolean, key: string): Promise<boolean>
	{
		const updatedValueData = {
			Sync: false,
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Value: value,
			ValueWasUpdated: valueWasUpdated,
			...stores.getStates()
		};

		const data: any = await window.api.server.value.update(JSON.stringify(updatedValueData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}

	async deleteNameValuePair(key: string, value: ReactiveValue): Promise<boolean>
	{
		const deleteValueData = {
			Sync: false,
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Value: value,
			...stores.getStates()
		};

		const data: any = await window.api.server.value.delete(JSON.stringify(deleteValueData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}
}

const valueStore = new ValueStore();
export default valueStore;

export type ValueStoreType = typeof valueStore;
