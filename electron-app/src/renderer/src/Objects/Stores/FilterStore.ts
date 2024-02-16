import generator from "../../Utilities/Generator";
import { Filter, DataType, FilterCondition, FilterConditionType, Group } from "../../Types/Table";
import { ComputedRef, computed, reactive } from "vue";
import { AuthenticationStore, stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { AtRiskType, IFilterable, IGroupable, IIdentifiable } from "../../Types/EncryptedData";
import File from "../Files/File"
import cryptUtility from "@renderer/Utilities/CryptUtility";
import hashUtility from "@renderer/Utilities/HashUtility";

interface FilterState
{
	loadedFile: boolean;
	filterHash: string;
	filters: Filter[];
	activeAtRiskPasswordFilterType: AtRiskType;
	activeAtRiskValueFilterType: AtRiskType;
	emptyPasswordFilters: string[];
	emptyValueFilters: string[];
	duplicatePasswordFilters: Dictionary<string[]>;
	duplicateValueFilters: Dictionary<string[]>;
}

export interface FilterStore extends AuthenticationStore
{
	passwordFilters: Filter[];
	activePasswordFilters: Filter[];
	nameValuePairFilters: Filter[];
	activeNameValuePairFilters: Filter[];
	activeAtRiskPasswordFilterType: AtRiskType;
	activeAtRiskValueFilterType: AtRiskType;
	emptyPasswordFilters: string[];
	emptyValueFilters: string[];
	duplicatePasswordFilters: Dictionary<string[]>;
	duplicatePasswordFiltersLength: number;
	duplicateValueFilters: Dictionary<string[]>;
	duplicateValueFiltersLength: number;
	addFilter(key: string, filter: Filter): void;
	toggleFilter(id: string): boolean | undefined;
	updateFilter(key: string, updatedFilter: Filter): void;
	deleteFilter: (key: string, filter: Filter) => void;
	addFiltersToNewValue: <T extends { [index: string]: string | number } & IFilterable & IGroupable & IIdentifiable>(filters: Filter[], value: T, valuesProperty: string) => void;
	syncFiltersForValues: <T extends { [index: string]: string | number } & IFilterable & IGroupable & IIdentifiable>(filters: Filter[], arr: T[], valuesProperty: string) => void;
	recalcGroupFilters: <T extends { [index: string]: string | number } & IFilterable & IGroupable & IIdentifiable>(filters: Filter[], arr: T[], valuesProperty: string) => void;
	removeValueFromFilers: <T extends { [index: string]: string | number } & IFilterable & IIdentifiable>(dataType: DataType, value: T) => void;
	toggleAtRiskType: (dataType: DataType, atRiskType: AtRiskType) => void;
}

const filterFile: File = new File("filters");
let filterState: FilterState;

export default function useFilterStore(): FilterStore
{
	filterState = reactive(defaultState());

	// --- Generic Store methods ---
	function defaultState(): FilterState
	{
		return {
			loadedFile: false,
			filterHash: '',
			filters: [],
			activeAtRiskPasswordFilterType: AtRiskType.None,
			activeAtRiskValueFilterType: AtRiskType.None,
			emptyPasswordFilters: [],
			emptyValueFilters: [],
			duplicatePasswordFilters: {},
			duplicateValueFilters: {}
		};
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (filterState.loadedFile)
			{
				resolve(true);
			}

			filterFile.read<FilterState>(key).then((state: FilterState) =>
			{
				state.loadedFile = true;
				Object.assign(filterState, state);

				resolve(true);
			}).catch(() =>
			{
				resolve(false);
			});
		});
	}

	function writeState(key: string)
	{
		if (filterState.filters.length == 0)
		{
			filterFile.empty();
			return;
		}

		filterFile.write<FilterState>(key, filterState);
	}

	function resetToDefault()
	{
		Object.assign(filterState, defaultState());
	}

	async function canAuthenticateKeyBeforeEntry()
	{
		return await filterFile.exists();
	}

	function canAuthenticateKeyAfterEntry()
	{
		return filterState.filterHash != "";
	}

	async function checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!await readState(key))
		{
			return false;
		}

		let runningKeys: string = "";
		filterState.filters.forEach(f => runningKeys += cryptUtility.decrypt(key, f.key));

		return hashUtility.hash(runningKeys) === cryptUtility.decrypt(key, filterState.filterHash);
	}

	function checkKeyAfterEntry(key: string): boolean
	{
		return getHash(key) == cryptUtility.decrypt(key, filterState.filterHash);
	}

	function getHash(key: string)
	{
		let runningKeys: string = "";
		filterState.filters.forEach(f => runningKeys += cryptUtility.decrypt(key, f.key));

		return hashUtility.hash(runningKeys)
	}

	function updateHash(key: string, filter: Filter | undefined = undefined)
	{
		let runningKeys: string = "";
		filterState.filters.forEach(f => runningKeys += cryptUtility.decrypt(key, f.key));

		if (filterState.filterHash === "" || cryptUtility.decrypt(key, filterState.filterHash) === hashUtility.hash(runningKeys))
		{
			if (filter && filter.key)
			{
				runningKeys += filter.key;
			}

			filterState.filterHash = cryptUtility.encrypt(key, hashUtility.hash(runningKeys));
		}
	}

	// --- Private ---
	// TODO: Test w/ multiple conditions
	function filterAppliesToValue<T extends { [index: string]: string | number } & IFilterable & IGroupable>(conditions: FilterCondition[], value: T): boolean
	{
		let allFilterConditionsApply: boolean = true;
		conditions.forEach(fc =>
		{
			if (allFilterConditionsApply == false)
			{
				return allFilterConditionsApply;
			}

			if (fc.property === "groups")
			{
				const groups: Group[] = stores.groupStore.groups.filter(g => value.groups.includes(g.id));

				switch (fc.filterType)
				{
					case FilterConditionType.StartsWith:
						allFilterConditionsApply = allFilterConditionsApply && groups.some(g => g.name.toLowerCase().startsWith(fc.value.toLowerCase()));
						break;
					case FilterConditionType.EndsWith:
						allFilterConditionsApply = allFilterConditionsApply && groups.some(g => g.name.toLowerCase().endsWith(fc.value.toLowerCase()));
						break;
					case FilterConditionType.Contains:
						allFilterConditionsApply = allFilterConditionsApply && groups.some(g => g.name.toLowerCase().includes(fc.value.toLowerCase()));
						break;
					case FilterConditionType.EqualTo:
						allFilterConditionsApply = allFilterConditionsApply && groups.some(g => g.name.toLowerCase() == fc.value.toLowerCase());
						break;
					default:
						return false;
				}
			}
			else
			{
				switch (fc.filterType)
				{
					case FilterConditionType.StartsWith:
						allFilterConditionsApply = allFilterConditionsApply && value[fc.property].toString().toLowerCase().startsWith(fc.value.toLowerCase());
						break;
					case FilterConditionType.EndsWith:
						allFilterConditionsApply = allFilterConditionsApply && value[fc.property].toString().toLowerCase().endsWith(fc.value.toLowerCase());
						break;
					case FilterConditionType.Contains:
						allFilterConditionsApply = allFilterConditionsApply && value[fc.property].toString().toLowerCase().includes(fc.value.toLowerCase());
						break;
					case FilterConditionType.EqualTo:
						allFilterConditionsApply = allFilterConditionsApply && value[fc.property].toString().toLowerCase() == fc.value.toLowerCase();
						break;
					default:
						return false;
				}
			}
		})

		return allFilterConditionsApply;
	}

	function updateEmptyFilters(filter: Filter, valuesProperty: string, emptyFilters: string[])
	{
		if (filter[valuesProperty].length == 0)
		{
			if (!emptyFilters.includes(filter.id))
			{
				emptyFilters.push(filter.id);
			}
		}
		else
		{
			if (emptyFilters.includes(filter.id))
			{
				emptyFilters.splice(emptyFilters.indexOf(filter.id), 1);
			}
		}
	}

	function getDuplicateFilters(filter: Filter, valuesProperty: string, allFilters: Filter[]): string[]
	{
		if (filter[valuesProperty].length == 0)
		{
			return allFilters.filter(f => f[valuesProperty].length == 0 && f.id != filter.id).map(f => f.id);
		}

		let potentialDuplicateFilters: Filter[] = allFilters.filter(f => f.id != filter.id && f[valuesProperty].length == filter[valuesProperty].length);
		for (let i = 0; i < filter[valuesProperty].length; i++)
		{
			if (potentialDuplicateFilters.length == 0)
			{
				return [];
			}

			potentialDuplicateFilters = potentialDuplicateFilters.filter(f => f[valuesProperty].includes(filter[valuesProperty][i]));
		}

		return potentialDuplicateFilters.map(f => f.id);
	}

	function checkAddRemoveDuplicateFilters(filter: Filter, valuesProperty: string, allFilters: Filter[], duplicateFilters: Dictionary<string[]>)
	{
		if (!duplicateFilters[filter.id])
		{
			duplicateFilters[filter.id] = [];
		}

		const newDuplicateGroups: string[] = getDuplicateFilters(filter, valuesProperty, allFilters);
		const addedDuplicateGroups: string[] = newDuplicateGroups.filter(g => !duplicateFilters[filter.id].includes(g));
		const removedDuplicateGroups: string[] = duplicateFilters[filter.id].filter(g => !newDuplicateGroups.includes(g));

		// nothing changed, everything is still good
		if (newDuplicateGroups.length == 0 && duplicateFilters[filter.id].length == 0)
		{
			delete duplicateFilters[filter.id];
			return;
		}

		// add all new duplicate groups
		addedDuplicateGroups.forEach(g =>
		{
			if (!duplicateFilters[filter.id].includes(g))
			{
				duplicateFilters[filter.id].push(g);
			}

			if (!duplicateFilters[g])
			{
				duplicateFilters[g] = [];
			}

			if (!duplicateFilters[g].includes(filter.id))
			{
				duplicateFilters[g].push(filter.id);
			}
		});

		// remove all duplicates group that are no longer duplciate. Delete property if its now empty
		removedDuplicateGroups.forEach(g =>
		{
			if (duplicateFilters[filter.id].includes(g))
			{
				duplicateFilters[filter.id].splice(duplicateFilters[filter.id].indexOf(g), 1);
			}

			if (duplicateFilters[g].includes(filter.id))
			{
				duplicateFilters[g].splice(duplicateFilters[g].indexOf(filter.id), 1);
				if (duplicateFilters[g].length == 0)
				{
					delete duplicateFilters[g];
				}
			}
		});

		// delete property if its now empty
		if (duplicateFilters[filter.id].length == 0)
		{
			delete duplicateFilters[filter.id];
		}
	}

	function removeDuplicateFilter(filter: Filter, duplicateFilters: Dictionary<string[]>)
	{
		if (!duplicateFilters[filter.id])
		{
			return;
		}

		duplicateFilters[filter.id].forEach(f =>
		{
			if (!duplicateFilters[f])
			{
				return;
			}

			if (duplicateFilters[f].includes(filter.id))
			{
				duplicateFilters[f].splice(duplicateFilters[f].indexOf(filter.id), 1);
			}

			if (duplicateFilters[f].length == 0)
			{
				delete duplicateFilters[f];
			}
		});

		delete duplicateFilters[filter.id];
	}

	// --- Public ---
	const passwordFilters: ComputedRef<Filter[]> = computed(() => filterState.filters.filter(f => f.type == DataType.Passwords));
	const activePasswordFilters: ComputedRef<Filter[]> = computed(() => passwordFilters.value.filter(f => f.isActive) ?? []);

	const nameValuePairFilters: ComputedRef<Filter[]> = computed(() => filterState.filters.filter(f => f.type == DataType.NameValuePairs));
	const activeNameValuePairFilters: ComputedRef<Filter[]> = computed(() => nameValuePairFilters.value.filter(f => f.isActive) ?? []);

	const duplicatePasswordFiltersLength: ComputedRef<number> = computed(() => Object.keys(filterState.duplicatePasswordFilters).length);
	const duplicateValueFiltersLength: ComputedRef<number> = computed(() => Object.keys(filterState.duplicateValueFilters).length);

	function toggleFilter(id: string): boolean | undefined
	{
		const filterIndex: number = filterState.filters.findIndex(f => f.id == id);
		if (filterIndex >= 0)
		{
			filterState.filters[filterIndex].isActive = !filterState.filters[filterIndex].isActive;
			// TODO Write State to file
			return filterState.filters[filterIndex].isActive;
		}

		return undefined;
	}

	function addFilter(key: string, filter: Filter)
	{
		filter.id = generator.uniqueId(filterState.filters);
		filter.key = generator.randomValue(30);

		filterState.filters.push(filter);

		if (filter.type == DataType.Passwords)
		{
			syncFiltersForValues([filter], stores.encryptedDataStore.passwords, "passwords");
			updateEmptyFilters(filter, "passwords", filterState.emptyPasswordFilters);

			const duplicateFilters: string[] = getDuplicateFilters(filter, "passwords", passwordFilters.value);
			if (duplicateFilters.length > 0)
			{
				filterState.duplicatePasswordFilters[filter.id] = duplicateFilters;
			}

		}
		else if (filter.type == DataType.NameValuePairs)
		{
			syncFiltersForValues([filter], stores.encryptedDataStore.nameValuePairs, "nameValuePairs");
			updateEmptyFilters(filter, "nameValuePairs", filterState.emptyValueFilters);

			const duplicateFilters: string[] = getDuplicateFilters(filter, "nameValuePairs", nameValuePairFilters.value);
			if (duplicateFilters.length > 0)
			{
				filterState.duplicateValueFilters[filter.id] = duplicateFilters;
			}
		}

		updateHash(key, filter);
		filter.key = cryptUtility.encrypt(key, filter.key);

		writeState(key);
	}

	// TODO: test
	function updateFilter(key: string, updatedFilter: Filter)
	{
		Object.assign(filterState.filters.filter(f => f.id == updatedFilter.id)[0], updatedFilter);
		switch (updatedFilter.type)
		{
			case DataType.Passwords:
				syncFiltersForValues([updatedFilter], stores.encryptedDataStore.passwords, "passwords");
				updateEmptyFilters(updatedFilter, "passwords", filterState.emptyPasswordFilters);
				checkAddRemoveDuplicateFilters(updatedFilter, "passwords", passwordFilters.value, filterState.duplicatePasswordFilters);
				break;
			case DataType.NameValuePairs:
				syncFiltersForValues([updatedFilter], stores.encryptedDataStore.nameValuePairs, "nameValuePairs");
				updateEmptyFilters(updatedFilter, "nameValuePairs", filterState.emptyValueFilters);
				checkAddRemoveDuplicateFilters(updatedFilter, "nameValuePairs", nameValuePairFilters.value, filterState.duplicateValueFilters);
				break;
		}

		writeState(key);
	}

	function deleteFilter(key: string, filter: Filter)
	{
		filterState.filters.splice(filterState.filters.indexOf(filter), 1);
		stores.encryptedDataStore.removeFilterFromValues(filter);

		if (filter.type == DataType.Passwords)
		{
			if (filterState.emptyPasswordFilters.includes(filter.id))
			{
				filterState.emptyPasswordFilters.splice(filterState.emptyPasswordFilters.indexOf(filter.id), 1);
			}

			removeDuplicateFilter(filter, filterState.duplicatePasswordFilters);
		}
		else if (filter.type == DataType.NameValuePairs)
		{
			if (filterState.emptyValueFilters.includes(filter.id))
			{
				filterState.emptyValueFilters.splice(filterState.emptyValueFilters.indexOf(filter.id), 1);
			}

			removeDuplicateFilter(filter, filterState.duplicateValueFilters);
		}

		filterState.filterHash = cryptUtility.encrypt(key, getHash(key));
		writeState(key);
	}

	// used when adding password / value
	function addFiltersToNewValue<T extends { [index: string]: string | number } & IFilterable & IGroupable & IIdentifiable>(
		filters: Filter[], value: T, valuesProperty: string)
	{
		filters.forEach(f =>
		{
			if (filterAppliesToValue(f.conditions, value))
			{
				if (!value.filters.includes(f.id))
				{
					value.filters.push(f.id);
				}

				if (!f[valuesProperty].includes(value.id))
				{
					f[valuesProperty].push(value.id);
				}
			}

			switch (f.type)
			{
				case DataType.Passwords:
					updateEmptyFilters(f, valuesProperty, filterState.emptyPasswordFilters);
					checkAddRemoveDuplicateFilters(f, "passwords", passwordFilters.value, filterState.duplicatePasswordFilters);
					break;
				case DataType.NameValuePairs:
					updateEmptyFilters(f, valuesProperty, filterState.emptyValueFilters);
					checkAddRemoveDuplicateFilters(f, "nameValuePairs", nameValuePairFilters.value, filterState.duplicateValueFilters);
					break;
			}
		})
	}

	// used when adding / updating filter or updating password / value
	function syncFiltersForValues<T extends { [index: string]: string | number } & IFilterable & IGroupable & IIdentifiable>(
		filters: Filter[], arr: T[], valuesProperty: string)
	{
		filters.forEach(f =>
		{
			arr.forEach(v =>
			{
				if (filterAppliesToValue(f.conditions, v))
				{
					if (!v.filters.includes(f.id))
					{
						v.filters.push(f.id);
					}

					if (!f[valuesProperty].includes(v.id))
					{
						f[valuesProperty].push(v.id);
					}
				}
				else
				{
					if (v.filters.includes(f.id))
					{
						v.filters.splice(v.filters.indexOf(f.id), 1);
					}

					if (f[valuesProperty].includes(v.id))
					{
						f[valuesProperty].splice(f[valuesProperty].indexOf(v.id), 1);
					}
				}
			});

			switch (f.type)
			{
				case DataType.Passwords:
					updateEmptyFilters(f, valuesProperty, filterState.emptyPasswordFilters);
					checkAddRemoveDuplicateFilters(f, "passwords", passwordFilters.value, filterState.duplicatePasswordFilters);
					break;
				case DataType.NameValuePairs:
					updateEmptyFilters(f, valuesProperty, filterState.emptyValueFilters);
					checkAddRemoveDuplicateFilters(f, "nameValuePairs", nameValuePairFilters.value, filterState.duplicateValueFilters);
					break;
			}
		});
	}

	function recalcGroupFilters<T extends { [index: string]: string | number } & IFilterable & IGroupable & IIdentifiable>(
		filters: Filter[], arr: T[], valuesProperty: string)
	{
		filters.forEach(f =>
		{
			if (f.conditions.filter(fc => fc.property === "groups").length == 0)
			{
				return;
			}

			arr.forEach(v =>
			{
				if (filterAppliesToValue(f.conditions, v))
				{
					if (!v.filters.includes(f.id))
					{
						v.filters.push(f.id);
					}

					if (!f[valuesProperty].includes(v.id))
					{
						f[valuesProperty].push(v.id);
					}
				}
				else
				{
					if (v.filters.includes(f.id))
					{
						v.filters.splice(v.filters.indexOf(f.id), 1);
					}

					if (f[valuesProperty].includes(v.id))
					{
						f[valuesProperty].splice(f[valuesProperty].indexOf(v.id), 1);
					}
				}
			});

			switch (f.type)
			{
				case DataType.Passwords:
					updateEmptyFilters(f, valuesProperty, filterState.emptyPasswordFilters);
					checkAddRemoveDuplicateFilters(f, "passwords", passwordFilters.value, filterState.duplicatePasswordFilters);
					break;
				case DataType.NameValuePairs:
					updateEmptyFilters(f, valuesProperty, filterState.emptyValueFilters);
					checkAddRemoveDuplicateFilters(f, "nameValuePairs", nameValuePairFilters.value, filterState.duplicateValueFilters);
					break;
			}
		});
	}

	// called when password / value is deleted
	function removeValueFromFilers<T extends { [index: string]: string | number } & IFilterable & IIdentifiable>(dataType: DataType, value: T)
	{
		if (dataType == DataType.Passwords)
		{
			passwordFilters.value.forEach(f =>
			{
				if (f.passwords.includes(value.id))
				{
					f.passwords.splice(f.passwords.indexOf(value.id), 1);
					checkAddRemoveDuplicateFilters(f, "passwords", passwordFilters.value, filterState.duplicatePasswordFilters);
					updateEmptyFilters(f, "passwords", filterState.emptyPasswordFilters);
				}
			});
		}
		else if (dataType == DataType.NameValuePairs)
		{
			nameValuePairFilters.value.forEach(f =>
			{
				if (f.nameValuePairs.includes(value.id))
				{
					f.nameValuePairs.splice(f.nameValuePairs.indexOf(value.id), 1);
					checkAddRemoveDuplicateFilters(f, "nameValuePairs", nameValuePairFilters.value, filterState.duplicateValueFilters);
					updateEmptyFilters(f, "nameValuePairs", filterState.emptyValueFilters);
				}
			});
		}
	}

	function toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.Passwords)
		{
			if (filterState.activeAtRiskPasswordFilterType != atRiskType)
			{
				filterState.activeAtRiskPasswordFilterType = atRiskType;
				return;
			}

			filterState.activeAtRiskPasswordFilterType = AtRiskType.None;
		}
		else if (dataType == DataType.NameValuePairs)
		{
			if (filterState.activeAtRiskValueFilterType != atRiskType)
			{
				filterState.activeAtRiskValueFilterType = atRiskType;
				return;
			}

			filterState.activeAtRiskValueFilterType = AtRiskType.None;
		}
	}

	return {
		get passwordFilters() { return passwordFilters.value; },
		get activePasswordFilters() { return activePasswordFilters.value; },
		get nameValuePairFilters() { return nameValuePairFilters.value; },
		get activeNameValuePairFilters() { return activeNameValuePairFilters.value; },
		get activeAtRiskPasswordFilterType() { return filterState.activeAtRiskPasswordFilterType; },
		get activeAtRiskValueFilterType() { return filterState.activeAtRiskValueFilterType; },
		get emptyPasswordFilters() { return filterState.emptyPasswordFilters; },
		get emptyValueFilters() { return filterState.emptyValueFilters; },
		get duplicatePasswordFilters() { return filterState.duplicatePasswordFilters; },
		get duplicatePasswordFiltersLength() { return duplicatePasswordFiltersLength.value; },
		get duplicateValueFilters() { return filterState.duplicateValueFilters; },
		get duplicateValueFiltersLength() { return duplicateValueFiltersLength.value; },
		canAuthenticateKeyBeforeEntry,
		canAuthenticateKeyAfterEntry,
		checkKeyBeforeEntry,
		checkKeyAfterEntry,
		readState,
		resetToDefault,
		addFilter,
		toggleFilter,
		updateFilter,
		addFiltersToNewValue,
		syncFiltersForValues,
		recalcGroupFilters,
		removeValueFromFilers,
		deleteFilter,
		toggleAtRiskType
	};
}
