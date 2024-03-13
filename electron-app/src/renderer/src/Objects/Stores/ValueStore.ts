import { NameValuePair, CurrentAndSafeStructure, AtRiskType, NameValuePairType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import { ReactiveValue } from "./ReactiveValue";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { AuthenticationStore, AuthenticationStoreState } from "./Base";

export interface ValueStoreState extends AuthenticationStoreState<ReactiveValue>
{
	duplicateValues: Dictionary<string[]>;
	currentAndSafeValues: CurrentAndSafeStructure;
}

// export interface IValueStore extends IAuthenticationStore
// {
// 	nameValuePairs: ReactiveValue[];
// 	unpinnedValues: ReactiveValue[];
// 	oldNameValuePairs: ComputedRef<string[]>;
// 	weakVerbalValues: ComputedRef<string[]>;
// 	weakPasscodeValues: ComputedRef<string[]>;
// 	duplicateNameValuePairs: ComputedRef<string[]>;
// 	duplicateNameValuePairsLength: number;
// 	currentAndSafeValues: CurrentAndSafeStructure;
// 	activeAtRiskValueType: AtRiskType;
// 	addNameValuePair: (key: string, nameValuePair: NameValuePair) => Promise<boolean>;
// 	updateNameValuePair: (nameValuePair: NameValuePair, valueWasUpdated: boolean, key: string) => Promise<void>;
// 	deleteNameValuePair: (key: string, nameValuePair: ReactiveValue) => Promise<void>;
// }

// let encryptedDataState: ValueStoreState;
// let loadedFile: boolean = false;

// export default function useValueStore(): ValueStore
// {
// 	encryptedDataState = reactive(defaultState());
// 	const events: Dictionary<{ (): void }[]> = {};

// 	// -- Generic Store Methods
// 	function defaultState(): ValueStoreState
// 	{
// 		loadedFile = false;
// 		return {
// 			values: [],
// 			valueHashSalt: "",
// 			valueHash: "",
// 			duplicateValues: {},
// 			currentAndSafeValues: { current: [], safe: [] },
// 		};
// 	}

// 	function toString()
// 	{
// 		return JSON.stringify(encryptedDataState);
// 	}

// 	function getState(): ValueStoreState
// 	{
// 		return encryptedDataState;
// 	}

// 	async function updateState(key: string, state: ValueStoreState): Promise<void>
// 	{
// 		Object.assign(encryptedDataState, state);

// 		encryptedDataState.values = encryptedDataState.values.map(v => createReactiveValue(v));
// 		await writeState(key);
// 	}

// 	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
// 	{
// 		return window.api.files.value.exists();
// 	}

// 	function canAuthenticateKeyAfterEntry(): boolean
// 	{
// 		return encryptedDataState.values.length > 0;
// 	}

// 	function writeState(key: string): Promise<void>
// 	{
// 		if (encryptedDataState.values.length == 0)
// 		{
// 			// TODO: error handling
// 			return window.api.files.value.empty();
// 		}
// 		else
// 		{
// 			// TODO: error handling
// 			return fileHelper.write(key, encryptedDataState, window.api.files.value);
// 		}
// 	}

// 	function resetToDefault()
// 	{
// 		Object.assign(encryptedDataState, defaultState());
// 	}

// 	// --- Private Helper Methods ---
// 	async function calculateHash<T extends { [key: string]: string }>(key: string, values: T[], salt: string)
// 	{
// 		let runningKeys: string = "";
// 		for (const value of values)
// 		{
// 			runningKeys += await window.api.utilities.crypt.decrypt(key, value.key);
// 		}

// 		return window.api.utilities.hash.hash(runningKeys, salt);
// 	}

// 	async function readState(key: string): Promise<boolean>
// 	{
// 		return new Promise((resolve, _) =>
// 		{
// 			if (loadedFile)
// 			{
// 				resolve(true);
// 			}
// 			// if the key is wrong there is a good chance that the json will fail when parsing, but its still possible to produce valid json that isn't right
// 			try
// 			{
// 				fileHelper.read<ValueStoreState>(key, window.api.files.value).then(async (data: ValueStoreState) =>
// 				{
// 					if (data.valueHash)
// 					{
// 						if (await calculateHash(key, data.values, data.valueHashSalt) == await window.api.utilities.crypt.decrypt(key, data.valueHash))
// 						{
// 							await assignState(data);
// 							resolve(true);
// 						}
// 					}

// 					// this happens when an exception is thrown while trying to parse / read in file
// 					resolve(false);
// 				}).catch(() =>
// 				{
// 					resolve(false);
// 				});
// 			}
// 			catch (e: any)
// 			{
// 				resolve(false);
// 			}
// 		});

// 		async function assignState(state: ValueStoreState): Promise<void>
// 		{
// 			Object.assign(encryptedDataState, state);
// 			loadedFile = true;

// 			encryptedDataState.values = [];

// 			state.values.forEach(nvp =>
// 			{
// 				const vs: ReactiveValue = createReactiveValue(nvp);
// 				encryptedDataState.values.push(vs);
// 			});
// 		}
// 	}

// 	// --- Public ---
// 	const oldNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.values.filter(nvp => nvp.isOld).map(nvp => nvp.id));
// 	const weakVerbalValues: ComputedRef<string[]> = computed(() => encryptedDataState.values.filter(nvp => nvp.valueType == NameValuePairType.Verbal && nvp.isWeak).map(nvp => nvp.id));
// 	const weakPasscodeValues: ComputedRef<string[]> = computed(() => encryptedDataState.values.filter(nvp => nvp.valueType == NameValuePairType.Passcode && nvp.isWeak).map(nvp => nvp.id));
// 	const duplicateNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.values.filter(nvp => nvp.isDuplicate).map(nvp => nvp.id));
// 	const duplicateNameValuePairsLength: ComputedRef<number> = computed(() => Object.keys(encryptedDataState.duplicateValues).length);

// 	const unpinnedValues: ComputedRef<ReactiveValue[]> = computed(() => encryptedDataState.values.filter(nvp => !nvp.isPinned));
// 	const activeAtRiskValueType: Ref<AtRiskType> = ref(AtRiskType.None);

// 	function init(_: Stores)
// 	{
// 	}

// 	async function checkKeyBeforeEntry(key: string): Promise<boolean>
// 	{
// 		if (!await canAuthenticateKeyBeforeEntry())
// 		{
// 			return true;
// 		}

// 		if (loadedFile)
// 		{
// 			if (encryptedDataState.valueHash)
// 			{
// 				return await calculateHash(key, encryptedDataState.values, encryptedDataState.valueHashSalt) == await window.api.utilities.crypt.decrypt(key, encryptedDataState.valueHash);
// 			}
// 		}
// 		else
// 		{
// 			return await readState(key);
// 		}

// 		return false;
// 	}

// 	async function checkKeyAfterEntry(key: string): Promise<boolean>
// 	{
// 		if (encryptedDataState.valueHash)
// 		{
// 			return await calculateHash(key, encryptedDataState.values, encryptedDataState.valueHashSalt) == await window.api.utilities.crypt.decrypt(key, encryptedDataState.valueHash);
// 		}

// 		return false;
// 	}

// 	async function addNameValuePair(key: string, value: NameValuePair): Promise<boolean>
// 	{
// 		const addValueData = {
// 			Sync: false,
// 			OldDays: stores.settingsStore.oldPasswordDays,
// 			Key: key,
// 			Value: value,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.value.add(JSON.stringify(addValueData));
// 		await stores.handleUpdateStoreResponse(key, data);

// 		events["onValueChange"]?.forEach(c => c());
// 		return true;
// 	}

// 	async function updateNameValuePair(value: NameValuePair, valueWasUpdated: boolean, key: string): Promise<void>
// 	{
// 		const updatedValueData = {
// 			Sync: false,
// 			OldDays: stores.settingsStore.oldPasswordDays,
// 			Key: key,
// 			Value: value,
// 			ValueWasUpdated: valueWasUpdated,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.value.update(JSON.stringify(updatedValueData));
// 		await stores.handleUpdateStoreResponse(key, data);

// 		events["onValueChange"]?.forEach(c => c());
// 	}

// 	async function deleteNameValuePair(key: string, value: ReactiveValue): Promise<void>
// 	{
// 		const deleteValueData = {
// 			Sync: false,
// 			Key: key,
// 			Value: value,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.value.delete(JSON.stringify(deleteValueData));
// 		await stores.handleUpdateStoreResponse(key, data);

// 		events["onValueChange"]?.forEach(c => c());
// 	}

// 	function toggleAtRiskModels(dataType: DataType, atRiskType: AtRiskType)
// 	{
// 		if (dataType == DataType.NameValuePairs)
// 		{
// 			if (activeAtRiskValueType.value != atRiskType)
// 			{
// 				activeAtRiskValueType.value = atRiskType;
// 				return;
// 			}

// 			activeAtRiskValueType.value = AtRiskType.None;
// 		}
// 	}

// 	function addEvent(event: ValueStoreEvents, callback: () => void)
// 	{
// 		if (events[event])
// 		{
// 			events[event].push(callback);
// 			return;
// 		}

// 		events[event] = [callback];
// 	}

// 	function removeEvent(event: ValueStoreEvents, callback: () => void)
// 	{
// 		if (!events[event])
// 		{
// 			return;
// 		}

// 		events[event] = events[event].filter(c => c != callback);
// 	}

// 	return {
// 		get nameValuePairs() { return encryptedDataState.values; },
// 		get unpinnedValues() { return unpinnedValues.value; },
// 		oldNameValuePairs,
// 		duplicateNameValuePairs,
// 		get duplicateNameValuePairsLength() { return duplicateNameValuePairsLength.value; },
// 		weakVerbalValues,
// 		weakPasscodeValues,
// 		get currentAndSafeValues() { return encryptedDataState.currentAndSafeValues; },
// 		get activeAtRiskValueType() { return activeAtRiskValueType.value; },
// 		getState,
// 		updateState,
// 		canAuthenticateKeyBeforeEntry,
// 		canAuthenticateKeyAfterEntry,
// 		init,
// 		toString,
// 		readState,
// 		resetToDefault,
// 		checkKeyBeforeEntry,
// 		checkKeyAfterEntry,
// 		addNameValuePair,
// 		updateNameValuePair,
// 		deleteNameValuePair,
// 		toggleAtRiskModels,
// 		addEvent,
// 		removeEvent
// 	};
// }

class ValueStore extends AuthenticationStore<ReactiveValue, ValueStoreState>
{
	private internalOldNameValuePairs: ComputedRef<string[]>;
	private internalWeakVerbalValues: ComputedRef<string[]>;
	private internalWeakPasscodeValues: ComputedRef<string[]>;

	private internalDuplicateNameValuePairs: ComputedRef<string[]>;
	private internalDuplicateNameValuePairsLength: ComputedRef<number>;

	private internalUnpinnedValues: ComputedRef<ReactiveValue[]>;

	private internalActiveAtRiskValueType: Ref<AtRiskType>;

	get nameValuePairs() { return this.state.values; }
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

		this.internalUnpinnedValues = computed(() => this.state.values.filter(nvp => !nvp.isPinned));

		this.internalActiveAtRiskValueType = ref(AtRiskType.None);
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
			Key: key,
			Value: value,
			...stores.getStates()
		};

		const data: any = await window.api.server.value.add(JSON.stringify(addValueData));
		await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return true;
	}

	async updateNameValuePair(value: NameValuePair, valueWasUpdated: boolean, key: string): Promise<void>
	{
		const updatedValueData = {
			Sync: false,
			OldDays: stores.settingsStore.oldPasswordDays,
			Key: key,
			Value: value,
			ValueWasUpdated: valueWasUpdated,
			...stores.getStates()
		};

		const data: any = await window.api.server.value.update(JSON.stringify(updatedValueData));
		await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
	}

	async deleteNameValuePair(key: string, value: ReactiveValue): Promise<void>
	{
		const deleteValueData = {
			Sync: false,
			Key: key,
			Value: value,
			...stores.getStates()
		};

		const data: any = await window.api.server.value.delete(JSON.stringify(deleteValueData));
		await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
	}
}

const valueStore = new ValueStore();
export default valueStore;

export type ValueStoreType = typeof valueStore;
