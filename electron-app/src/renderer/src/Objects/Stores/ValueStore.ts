import { NameValuePair, CurrentAndSafeStructure, IIdentifiable, AtRiskType, NameValuePairType } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import createReactiveValue, { ReactiveValue } from "./ReactiveValue";
import { DataType, Filter, Group } from "../../Types/Table";
import { Dictionary } from "../../Types/DataStructures";
import { AuthenticationStore, Stores, stores } from ".";
import { generateUniqueID } from "@renderer/Helpers/generatorHelper";
import fileHelper from "@renderer/Helpers/fileHelper";

export interface ValueStoreState
{
	loadedFile: boolean;
	nameValuePairs: ReactiveValue[];
	valueHash: string;
	duplicateNameValuePairs: Dictionary<string[]>;
	currentAndSafeValues: CurrentAndSafeStructure;
}

type ValueStoreEvents = "onValueChange";

export interface ValueStore extends AuthenticationStore
{
	nameValuePairs: ReactiveValue[];
	unpinnedValues: ReactiveValue[];
	oldNameValuePairs: ComputedRef<string[]>;
	weakVerbalValues: ComputedRef<string[]>;
	weakPasscodeValues: ComputedRef<string[]>;
	duplicateNameValuePairs: ComputedRef<string[]>;
	duplicateNameValuePairsLength: number;
	currentAndSafeValues: CurrentAndSafeStructure;
	activeAtRiskValueType: AtRiskType;
	init: (stores: Stores) => void;
	addNameValuePair: (key: string, nameValuePair: NameValuePair) => Promise<boolean>;
	updateNameValuePair: (nameValuePair: NameValuePair, valueWasUpdated: boolean, key: string) => Promise<void>;
	deleteNameValuePair: (key: string, nameValuePair: ReactiveValue) => Promise<void>;
	addRemoveGroupsFromPasswordValue: (key: string, addedValues: string[], removedValues: string[], group: Group) => Promise<void>;
	removeFilterFromValues: (key: string, filter: Filter) => Promise<void>;
	removeGroupFromValues: (key: string, group: Group) => Promise<void>;
	toggleAtRiskModels: (dataType: DataType, atRiskType: AtRiskType) => void;
	addEvent: (event: ValueStoreEvents, callback: () => void) => void;
	removeEvent: (event: ValueStoreEvents, callback: () => void) => void;
}

let encryptedDataState: ValueStoreState;

export default function useValueStore(): ValueStore
{
	encryptedDataState = reactive(defaultState());
	const events: Dictionary<{ (): void }[]> = {};

	// -- Generic Store Methods
	function defaultState(): ValueStoreState
	{
		return {
			loadedFile: false,
			nameValuePairs: [],
			valueHash: "",
			duplicateNameValuePairs: {},
			currentAndSafeValues: { current: [], safe: [] },
		};
	}

	function toString()
	{
		return JSON.stringify(encryptedDataState);
	}

	function getState(): ValueStoreState
	{
		return encryptedDataState;
	}

	async function updateState(key: string, state: ValueStoreState): Promise<void>
	{
		Object.assign(encryptedDataState, state);
		await writeState(key);
	}

	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
	{
		return window.api.files.encryptedData.exists();
	}

	function canAuthenticateKeyAfterEntry(): boolean
	{
		return encryptedDataState.nameValuePairs.length > 0;
	}

	function writeState(key: string): Promise<void>
	{
		if (encryptedDataState.nameValuePairs.length == 0)
		{
			// TODO: error handling
			return window.api.files.encryptedData.empty();
		}
		else
		{
			// TODO: error handling
			return fileHelper.write(key, encryptedDataState, window.api.files.encryptedData);
		}
	}

	function resetToDefault()
	{
		Object.assign(encryptedDataState, defaultState());
	}

	// --- Private Helper Methods ---
	function calculateHash<T extends { [key: string]: string }>(key: string, values: T[], property: string)
	{
		let runningPasswords: string = "";
		values.forEach(v => runningPasswords += window.api.utilities.crypt.decrypt(key, v[property]));

		return window.api.utilities.hash.hash(runningPasswords);
	}

	async function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (encryptedDataState.loadedFile)
			{
				resolve(true);
			}
			// if the key is wrong there is a good chance that the json will fail when parsing, but its still possible to produce valid json that isn't right
			try
			{
				fileHelper.read<ValueStoreState>(key, window.api.files.encryptedData).then(async (data: ValueStoreState) =>
				{
					if (data.valueHash)
					{
						if (calculateHash(key, data.nameValuePairs, 'value') == window.api.utilities.crypt.decrypt(key, data.valueHash))
						{
							await assignState(data);
							resolve(true);
						}
					}

					// this happens when an exception is thrown while trying to parse / read in file
					resolve(false);
				}).catch(() =>
				{
					resolve(false);
				});
			}
			catch (e: any)
			{
				resolve(false);
			}
		});

		async function assignState(state: ValueStoreState): Promise<void>
		{
			Object.assign(encryptedDataState, state);
			encryptedDataState.loadedFile = true;

			encryptedDataState.nameValuePairs = [];

			state.nameValuePairs.forEach(async nvp =>
			{
				const vs: ReactiveValue = await createReactiveValue(key, nvp, true);
				encryptedDataState.nameValuePairs.push(vs);
			});
		}
	}

	function checkKeyUpdateValueHash(key: string, newValue: string): boolean
	{
		let runningValues: string = "";
		encryptedDataState.nameValuePairs.forEach(nvp => runningValues += window.api.utilities.crypt.decrypt(key, nvp.value));

		if (encryptedDataState.valueHash === "" || window.api.utilities.hash.hash(runningValues) == window.api.utilities.crypt.decrypt(key, encryptedDataState.valueHash))
		{
			runningValues += newValue;
			encryptedDataState.valueHash = window.api.utilities.crypt.encrypt(key, window.api.utilities.hash.hash(runningValues));

			return true;
		}

		return false;
	}

	function updateDuplicatePasswordOrValueIndex<T extends IIdentifiable & (ReactiveValue)>
		(key: string, value: T, property: string, allValues: T[], duplicateValues: Dictionary<string[]>)
	{
		const potentialDupllicates: T[] = allValues.filter(v => v.id != value.id);
		const decryptedValue: string = window.api.utilities.crypt.decrypt(key, value[property]);

		if (!duplicateValues[value.id])
		{
			duplicateValues[value.id] = [];
		}

		potentialDupllicates.forEach(d =>
		{
			if (!duplicateValues[d.id])
			{
				duplicateValues[d.id] = [];
			}

			const potentialDuplicateDecryptedValue: string = window.api.utilities.crypt.decrypt(key, d[property]);
			if (decryptedValue == potentialDuplicateDecryptedValue)
			{
				if (!duplicateValues[value.id].includes(d.id))
				{
					value.isDuplicate = true;
					duplicateValues[value.id].push(d.id)
				}

				if (!duplicateValues[d.id].includes(value.id))
				{
					allValues.filter(v => v.id == d.id)[0].isDuplicate = true;
					duplicateValues[d.id].push(value.id);
				}
			}
			else
			{
				if (duplicateValues[value.id].includes(d.id))
				{
					duplicateValues[value.id].splice(duplicateValues[value.id].indexOf(d.id), 1);
				}

				if (duplicateValues[d.id].includes(value.id))
				{
					duplicateValues[d.id].splice(duplicateValues[d.id].indexOf(value.id), 1);
				}

				if (duplicateValues[d.id].length == 0)
				{
					allValues.filter(v => v.id == d.id)[0].isDuplicate = false;
					delete duplicateValues[d.id];
				}
			}
		});

		if (duplicateValues[value.id].length == 0)
		{
			value.isDuplicate = false;
			delete duplicateValues[value.id];
		}
	}

	function removeValueFromDuplicates<T extends IIdentifiable & (ReactiveValue)>
		(value: T, duplicateValues: Dictionary<string[]>)
	{
		if (!duplicateValues[value.id])
		{
			return;
		}

		duplicateValues[value.id].forEach(v =>
		{
			if (!duplicateValues[v])
			{
				return;
			}

			if (duplicateValues[v].includes(value.id))
			{
				duplicateValues[v].splice(duplicateValues[v].indexOf(value.id), 1);
			}

			if (duplicateValues[v].length == 0)
			{
				delete duplicateValues[v];
			}
		});

		delete duplicateValues[value.id];
	}

	// --- Public ---
	const oldNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.isOld).map(nvp => nvp.id));
	const weakVerbalValues: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.valueType == NameValuePairType.Verbal && nvp.isWeak).map(nvp => nvp.id));
	const weakPasscodeValues: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.valueType == NameValuePairType.Passcode && nvp.isWeak).map(nvp => nvp.id));
	const duplicateNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.isDuplicate).map(nvp => nvp.id));
	const duplicateNameValuePairsLength: ComputedRef<number> = computed(() => Object.keys(encryptedDataState.duplicateNameValuePairs).length);
	const safeNameValuePairs: ComputedRef<string[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => nvp.isSafe).map(nvp => nvp.id));

	const unpinnedValues: ComputedRef<ReactiveValue[]> = computed(() => encryptedDataState.nameValuePairs.filter(nvp => !nvp.isPinned));
	const activeAtRiskValueType: Ref<AtRiskType> = ref(AtRiskType.None);

	function init(_: Stores)
	{
	}

	async function checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!await canAuthenticateKeyBeforeEntry())
		{
			return true;
		}

		if (encryptedDataState.loadedFile)
		{
			if (encryptedDataState.valueHash)
			{
				return calculateHash(key, encryptedDataState.nameValuePairs, "value") == window.api.utilities.crypt.decrypt(key, encryptedDataState.valueHash);
			}
		}
		else
		{
			return await readState(key);
		}

		return false;
	}

	function checkKeyAfterEntry(key: string): boolean
	{
		if (encryptedDataState.valueHash)
		{
			return calculateHash(key, encryptedDataState.nameValuePairs, "value") == window.api.utilities.crypt.decrypt(key, encryptedDataState.valueHash);
		}

		return false;
	}

	async function addNameValuePair(key: string, nameValuePair: NameValuePair): Promise<boolean>
	{
		if (!checkKeyUpdateValueHash(key, nameValuePair.value))
		{
			return false;
		}

		nameValuePair.id = generateUniqueID(encryptedDataState.nameValuePairs);

		const ReactiveValue: ReactiveValue = await createReactiveValue(key, nameValuePair);
		encryptedDataState.nameValuePairs.push(ReactiveValue);

		updateDuplicatePasswordOrValueIndex(key, ReactiveValue, "value", encryptedDataState.nameValuePairs, encryptedDataState.duplicateNameValuePairs);

		encryptedDataState.currentAndSafeValues.current.push(encryptedDataState.nameValuePairs.length);
		encryptedDataState.currentAndSafeValues.safe.push(safeNameValuePairs.value.length);

		await stores.groupStore.syncGroupsAfterPasswordOrValueWasAdded(key, DataType.NameValuePairs, nameValuePair);

		await writeState(key);
		events["onValueChange"]?.forEach(c => c());
		stores.syncToServer(key);

		return true;
	}

	async function updateNameValuePair(nameValuePair: NameValuePair, valueWasUpdated: boolean, key: string): Promise<void>
	{
		if (valueWasUpdated && !checkKeyAfterEntry(key))
		{
			return;
		}

		const currentValue: ReactiveValue[] = encryptedDataState.nameValuePairs.filter(nvp => nvp.id == nameValuePair.id);
		if (currentValue.length != 1)
		{
			// TODO: show toast message
			return;
		}

		// get groups before updating
		const addedGroups: string[] = nameValuePair.Groups.filter(currentGroup => !currentValue[0].Groups.includes(currentGroup));
		const removedGroups: string[] = currentValue[0].Groups.filter(previousGroup => !nameValuePair.Groups.includes(previousGroup));

		currentValue[0].updateValue(key, nameValuePair, valueWasUpdated);

		if (valueWasUpdated)
		{
			updateDuplicatePasswordOrValueIndex(key, currentValue[0], "value", encryptedDataState.nameValuePairs, encryptedDataState.duplicateNameValuePairs);

			encryptedDataState.currentAndSafeValues.current.push(encryptedDataState.nameValuePairs.length);
			encryptedDataState.currentAndSafeValues.safe.push(safeNameValuePairs.value.length);

			encryptedDataState.valueHash = window.api.utilities.crypt.encrypt(key, calculateHash(key, encryptedDataState.nameValuePairs, "value"));
		}

		await stores.groupStore.syncGroupsAfterPasswordOrValueWasUpdated(key, DataType.NameValuePairs, addedGroups, removedGroups, nameValuePair.id);
		await stores.filterStore.syncFiltersForValues(key, stores.filterStore.nameValuePairFilters, [nameValuePair as ReactiveValue], "nameValuePairs", true);

		await writeState(key);
		events["onValueChange"]?.forEach(c => c());
		stores.syncToServer(key);
	}

	async function deleteNameValuePair(key: string, nameValuePair: ReactiveValue): Promise<void>
	{
		// empty the password so we can just run it through the duplicate logic since no other passwords should be empty
		removeValueFromDuplicates(nameValuePair, encryptedDataState.duplicateNameValuePairs);

		encryptedDataState.nameValuePairs.splice(encryptedDataState.nameValuePairs.indexOf(nameValuePair), 1);

		encryptedDataState.currentAndSafeValues.current.push(encryptedDataState.nameValuePairs.length);
		encryptedDataState.currentAndSafeValues.safe.push(safeNameValuePairs.value.length);

		encryptedDataState.valueHash = window.api.utilities.crypt.encrypt(key, calculateHash(key, encryptedDataState.nameValuePairs, "value"));

		// remove from groups and filters
		await stores.groupStore.removeValueFromGroups(key, DataType.NameValuePairs, nameValuePair);
		await stores.filterStore.removeValueFromFilers(key, DataType.NameValuePairs, nameValuePair);

		await writeState(key);
		events["onValueChange"]?.forEach(c => c());
		stores.syncToServer(key);
	}

	function addRemoveGroupsFromPasswordValue(key: string, addedValues: string[], removedValues: string[], group: Group): Promise<void>
	{
		if (group.type == DataType.NameValuePairs)
		{
			addedValues.forEach(v =>
			{
				const nameValuePair: ReactiveValue = encryptedDataState.nameValuePairs.filter(nvp => nvp.id == v)[0];
				if (!nameValuePair.Groups.includes(group.id))
				{
					nameValuePair.Groups.push(group.id);
				}
			});

			removedValues.forEach(v =>
			{
				const nameValuePair: ReactiveValue = encryptedDataState.nameValuePairs.filter(nvp => nvp.id == v)[0];
				if (nameValuePair.Groups.includes(group.id))
				{
					nameValuePair.Groups.splice(nameValuePair.Groups.indexOf(v), 1);
				}
			});
		}

		return writeState(key);
	}

	function removeFilterFromValues(key: string, filter: Filter): Promise<void>
	{
		if (filter.type == DataType.NameValuePairs)
		{
			encryptedDataState.nameValuePairs.forEach(nvp =>
			{
				if (nvp.filters.includes(filter.id))
				{
					nvp.filters.splice(nvp.filters.indexOf(filter.id), 1);
				}
			});
		}

		return writeState(key);
	}

	function removeGroupFromValues(key: string, group: Group): Promise<void>
	{
		if (group.type == DataType.NameValuePairs)
		{
			encryptedDataState.nameValuePairs.forEach(nvp =>
			{
				if (nvp.Groups.includes(group.id))
				{
					nvp.Groups.splice(nvp.Groups.indexOf(group.id), 1);
				}
			});
		}

		return writeState(key);
	}

	function toggleAtRiskModels(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.NameValuePairs)
		{
			if (activeAtRiskValueType.value != atRiskType)
			{
				activeAtRiskValueType.value = atRiskType;
				return;
			}

			activeAtRiskValueType.value = AtRiskType.None;
		}
	}

	function addEvent(event: ValueStoreEvents, callback: () => void)
	{
		if (events[event])
		{
			events[event].push(callback);
			return;
		}

		events[event] = [callback];
	}

	function removeEvent(event: ValueStoreEvents, callback: () => void)
	{
		if (!events[event])
		{
			return;
		}

		events[event] = events[event].filter(c => c != callback);
	}

	return {
		get nameValuePairs() { return encryptedDataState.nameValuePairs; },
		get unpinnedValues() { return unpinnedValues.value; },
		oldNameValuePairs,
		duplicateNameValuePairs,
		get duplicateNameValuePairsLength() { return duplicateNameValuePairsLength.value; },
		weakVerbalValues,
		weakPasscodeValues,
		get currentAndSafeValues() { return encryptedDataState.currentAndSafeValues; },
		get activeAtRiskValueType() { return activeAtRiskValueType.value; },
		getState,
		updateState,
		canAuthenticateKeyBeforeEntry,
		canAuthenticateKeyAfterEntry,
		init,
		toString,
		readState,
		resetToDefault,
		checkKeyBeforeEntry,
		checkKeyAfterEntry,
		addNameValuePair,
		updateNameValuePair,
		addRemoveGroupsFromPasswordValue,
		deleteNameValuePair,
		removeFilterFromValues,
		removeGroupFromValues,
		toggleAtRiskModels,
		addEvent,
		removeEvent
	};
}
