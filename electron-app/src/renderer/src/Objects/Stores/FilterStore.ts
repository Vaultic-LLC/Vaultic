import { Filter, DataType, Group, FilterConditionType, PrimaryDataObjectCollection } from "../../Types/Table";
import { ComputedRef, Ref, computed, ref } from "vue";
import { stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { AtRiskType, DataFile, IFilterable, IGroupable, IIdentifiable, NameValuePair, Password } from "../../Types/EncryptedData";
import { DataTypeStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "@renderer/Helpers/generatorHelper";

export interface FilterStoreState extends DataTypeStoreState<Filter>
{
	emptyPasswordFilters: string[];
	emptyValueFilters: string[];
	duplicatePasswordFilters: Dictionary<string[]>;
	duplicateValueFilters: Dictionary<string[]>;
}

class FilterStore extends DataTypeStore<Filter, FilterStoreState>
{
	private internalPasswordFilters: ComputedRef<Filter[]>;
	private internalActivePasswordFilters: ComputedRef<Filter[]>;

	private internalNameValuePairFilters: ComputedRef<Filter[]>;
	private internalActiveNameValuePairFilters: ComputedRef<Filter[]>;

	private internalDuplicatePasswordFiltersLength: ComputedRef<number>;
	private internalDuplicateValueFiltersLength: ComputedRef<number>;

	private internalActiveAtRiskPasswordFilterType: Ref<AtRiskType>;
	private internalActiveAtRiskValueFilterType: Ref<AtRiskType>;

	private internalPinnedPasswordFilters: ComputedRef<Filter[]>;
	private internalUnpinnedPasswordFilters: ComputedRef<Filter[]>;

	private internalPinnedValueFilters: ComputedRef<Filter[]>;
	private internalUnpinnedValueFilters: ComputedRef<Filter[]>;

	get passwordFilters() { return this.internalPasswordFilters.value; }
	get activePasswordFilters() { return this.internalActivePasswordFilters.value; }
	get nameValuePairFilters() { return this.internalNameValuePairFilters.value; }
	get activeNameValuePairFilters() { return this.internalActiveNameValuePairFilters.value; }
	get activeAtRiskPasswordFilterType() { return this.internalActiveAtRiskPasswordFilterType.value; }
	get activeAtRiskValueFilterType() { return this.internalActiveAtRiskValueFilterType.value; }
	get emptyPasswordFilters() { return this.state.emptyPasswordFilters; }
	get emptyValueFilters() { return this.state.emptyValueFilters; }
	get duplicatePasswordFilters() { return this.state.duplicatePasswordFilters; }
	get duplicatePasswordFiltersLength() { return this.internalDuplicatePasswordFiltersLength.value; }
	get duplicateValueFilters() { return this.state.duplicateValueFilters; }
	get duplicateValueFiltersLength() { return this.internalDuplicateValueFiltersLength.value; }
	get pinnedPasswordFilters() { return this.internalPinnedPasswordFilters.value; }
	get unpinnedPasswordFilters() { return this.internalUnpinnedPasswordFilters.value; }
	get pinnedValueFilters() { return this.internalPinnedValueFilters.value; }
	get unpinnedValueFitlers() { return this.internalUnpinnedValueFilters.value; }

	constructor()
	{
		super();

		this.internalPasswordFilters = computed(() => this.state.values.filter(f => f.type == DataType.Passwords));
		this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.isActive) ?? []);

		this.internalNameValuePairFilters = computed(() => this.state.values.filter(f => f.type == DataType.NameValuePairs));
		this.internalActiveNameValuePairFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => f.isActive) ?? []);

		this.internalDuplicatePasswordFiltersLength = computed(() => Object.keys(this.state.duplicatePasswordFilters).length);
		this.internalDuplicateValueFiltersLength = computed(() => Object.keys(this.state.duplicateValueFilters).length);

		this.internalActiveAtRiskPasswordFilterType = ref(AtRiskType.None);
		this.internalActiveAtRiskValueFilterType = ref(AtRiskType.None);

		this.internalPinnedPasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => stores.userPreferenceStore.pinnedFilters.hasOwnProperty(f.id)));
		this.internalUnpinnedPasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => !stores.userPreferenceStore.pinnedFilters.hasOwnProperty(f.id)));

		this.internalPinnedValueFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => stores.userPreferenceStore.pinnedFilters.hasOwnProperty(f.id)));
		this.internalUnpinnedValueFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => !stores.userPreferenceStore.pinnedFilters.hasOwnProperty(f.id)));
	}

	protected defaultState()
	{
		return {
			version: 0,
			hash: '',
			hashSalt: '',
			values: [],
			emptyPasswordFilters: [],
			emptyValueFilters: [],
			duplicatePasswordFilters: {},
			duplicateValueFilters: {},
		}
	}

	protected getFile(): DataFile
	{
		return window.api.files.filter;
	}

	protected getPasswordAtRiskType(): Ref<AtRiskType>
	{
		return this.internalActiveAtRiskPasswordFilterType;
	}

	protected getValueAtRiskType(): Ref<AtRiskType>
	{
		return this.internalActiveAtRiskValueFilterType;
	}

	toggleFilter(id: string): boolean | undefined
	{
		const filterIndex: number = this.state.values.findIndex(f => f.id == id);
		if (filterIndex >= 0)
		{
			this.state.values[filterIndex].isActive = !this.state.values[filterIndex].isActive;
			return this.state.values[filterIndex].isActive;
		}

		return undefined;
	}

	async addFilter(key: string, filter: Filter): Promise<boolean>
	{
		filter.id = await generateUniqueID(this.state.values);
		this.state.values.push(filter);

		if (filter.type == DataType.Passwords)
		{
			this.syncFiltersForPasswords([filter], stores.passwordStore.passwords);
		}
		else
		{
			this.syncFiltersForValues([filter], stores.valueStore.nameValuePairs);
		}

		const succeeded = await this.writeState(key);
		if (!succeeded)
		{
			// TODO: Make sure user gets notified correctly
			return false;
		}

		// TODO: Sync filter state with server
		// should return a special error if we fail to sync.
		// let the user know the filter was saved locally, but not backed up

		return true;
		// const addFilterData = {
		// 	MasterKey: key,
		// 	Filter: filter,
		// 	...stores.getStates()
		// };

		// const data: any = await window.api.server.filter.add(JSON.stringify(addFilterData));
		// return await stores.handleUpdateStoreResponse(key, data);
	}

	async updateFilter(key: string, updatedFilter: Filter): Promise<boolean>
	{
		let filter: Filter[] = this.state.values.filter(f => f.id == updatedFilter.id);
		if (filter.length != 1)
		{
			// something weird went wrong.
			// Should just add filter (if the length is 0)?
			return false;
		}

		Object.assign(this.state.values.filter(f => f.id == updatedFilter.id)[0], updatedFilter);
		if (updatedFilter.type == DataType.Passwords)
		{
			this.syncFiltersForPasswords([updatedFilter], stores.passwordStore.passwords);
		}
		else if (updatedFilter.type == DataType.NameValuePairs)
		{
			this.syncFiltersForValues([updatedFilter], stores.valueStore.nameValuePairs);
		}

		const succeeded = await this.writeState(key);
		if (!succeeded)
		{
			// TODO: Make sure user gets notified correctly
			return false;
		}

		// TODO: Sync filter state with server
		// should return a special error if we fail to sync.
		// let the user know the filter was saved locally, but not backed up

		return true;
		// const addFilterData = {
		// 	MasterKey: key,
		// 	Filter: updatedFilter,
		// 	...stores.getStates()
		// };

		// const data: any = await window.api.server.filter.update(JSON.stringify(addFilterData));
		// return await stores.handleUpdateStoreResponse(key, data);
	}

	async deleteFilter(key: string, filter: Filter): Promise<boolean>
	{
		this.state.values.splice(this.state.values.indexOf(filter), 1);

		if (filter.type == DataType.Passwords)
		{
			// TODO: need to remove filter from all passwords that have it
			this.removeFilterFromEmptyFilters(filter.id, this.emptyPasswordFilters);
			this.removeFilterFromDuplicateFilters(filter.id, this.duplicatePasswordFilters);
		}
		else if (filter.type == DataType.NameValuePairs)
		{
			// TODO: need to remove filter form all values that have it
			this.removeFilterFromEmptyFilters(filter.id, this.emptyValueFilters);
			this.removeFilterFromDuplicateFilters(filter.id, this.duplicateValueFilters);
		}


		const succeeded = await this.writeState(key);
		if (!succeeded)
		{
			// TODO: Make sure user gets notified correctly
			return false;
		}

		// TODO: Sync filter state with server
		// should return a special error if we fail to sync.
		// let the user know the filter was saved locally, but not backed up

		return true;
		// const addFilterData = {
		// 	MasterKey: key,
		// 	Filter: filter,
		// 	...stores.getStates()
		// };

		// const data: any = await window.api.server.filter.delete(JSON.stringify(addFilterData));
		// return await stores.handleUpdateStoreResponse(key, data);
	}

	syncFiltersForPasswords(filtersToSync: Filter[], passwords: Password[])
	{
		this.syncFiltersForPrimaryDataObject(filtersToSync, passwords, "passwords", this.emptyPasswordFilters, this.duplicatePasswordFilters, this.passwordFilters);
	}

	syncFiltersForValues(filtersToSync: Filter[], values: NameValuePair[])
	{
		this.syncFiltersForPrimaryDataObject(filtersToSync, values, "values", this.emptyValueFilters, this.duplicateValueFilters, this.nameValuePairFilters);
	}

	private filterAppliesToDataObject<T extends IGroupable>(filter: Filter, dataObject: T): boolean
	{
		let allFilterConditionsApply: boolean = true;
		const groupsForObject: Group[] = stores.groupStore.groups.filter(g => dataObject.groups.includes(g.id));

		filter.conditions.forEach(fc =>
		{
			if (allFilterConditionsApply == false)
			{
				return;
			}

			if (fc.property === "groups")
			{
				switch (fc.filterType)
				{
					case FilterConditionType.StartsWith:
						allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.toLowerCase().startsWith(fc.value.toLowerCase()));
						break;
					case FilterConditionType.EndsWith:
						allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.toLowerCase().endsWith(fc.value.toLowerCase()));
						break;
					case FilterConditionType.Contains:
						allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.toLowerCase().includes(fc.value.toLowerCase()));
						break;
					case FilterConditionType.EqualTo:
						allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.toLowerCase() == fc.value.toLowerCase());
						break;
					default:
						allFilterConditionsApply = false;
				}
			}
			else
			{
				switch (fc.filterType)
				{
					case FilterConditionType.StartsWith:
						allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].toString().toLowerCase().startsWith(fc.value.toLowerCase());
						break;
					case FilterConditionType.EndsWith:
						allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].toString().toLowerCase().endsWith(fc.value.toLowerCase());
						break;
					case FilterConditionType.Contains:
						allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].toString().toLowerCase().includes(fc.value.toLowerCase());
						break;
					case FilterConditionType.EqualTo:
						allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].toString().toLowerCase() == fc.value.toLowerCase();
						break;
					default:
						allFilterConditionsApply = false;
				}
			}
		});

		return allFilterConditionsApply;
	}

	// checks / handles emptiness for a single filter
	// filterID: the id of the filter
	// primaryObjectIDsForFilter: the primary objects the filter has. Either filter.passwords or filter.values
	// currentEmptyFilters: the list of current empty filters. Either this.emptyPasswordFilters or this.emptyValueFilters
	private checkUpdateEmptyFilters(filterID: string, primaryObjectIDsForFilter: string[], currentEmptyFilters: string[])
	{
		// check to see if this filter has any passwords or values
		if (primaryObjectIDsForFilter.length == 0)
		{
			// if it doesn't, then add it to the list of empty filters
			if (!currentEmptyFilters.includes(filterID))
			{
				currentEmptyFilters.push(filterID);
			}
		}
		else
		{
			// since we do have passwords or values, remove the filter from the empty list if its in there
			this.removeFilterFromEmptyFilters(filterID, currentEmptyFilters);
		}
	}

	private removeFilterFromEmptyFilters(filterID: string, currentEmptyFilters: string[])
	{
		const filterIndex = currentEmptyFilters.indexOf(filterID);
		if (filterIndex >= 0)
		{
			currentEmptyFilters.splice(filterIndex, 1);
		}
	}

	private getDuplicateFilters(filter: Filter, primaryDataObjectCollection: PrimaryDataObjectCollection, allFilters: Filter[]): string[]
	{
		if (filter[primaryDataObjectCollection].length == 0)
		{
			return allFilters.filter(f => f[primaryDataObjectCollection].length == 0).map(f => f.id);
		}

		let potentiallyDuplicateFilters: Filter[] = allFilters.filter(f => f[primaryDataObjectCollection].length == filter[primaryDataObjectCollection].length);
		for (let i = 0; i < filter[primaryDataObjectCollection].length; i++)
		{
			if (potentiallyDuplicateFilters.length == 0)
			{
				return [];
			}

			potentiallyDuplicateFilters = potentiallyDuplicateFilters.filter(f => f[primaryDataObjectCollection].includes(filter[primaryDataObjectCollection][i]));
		}

		return potentiallyDuplicateFilters.map(f => f.id);
	}

	// checks / handles duplicates for a single filter
	// filter: the filter to check / handle for
	// potentiallyNewDuplicateFilters: re calced duplicate filters from getDuplicatePasswordFilters() or getDuplicateValueFilters()
	// currentDuplicateFilters: last saved duplicate filters. either this.duplicatePasswordFilers or this.duplicateValueFilters
	private checkUpdateDuplicateFilters(filter: Filter, potentiallyNewDuplicateFilters: string[], currentDuplicateFilters: Dictionary<string[]>)
	{
		// setup so that we don't get any exceptions
		if (!currentDuplicateFilters[filter.id])
		{
			currentDuplicateFilters[filter.id] = [];
		}

		// there are no duplicate filters anywhere, so nothing to do
		if (potentiallyNewDuplicateFilters.length == 0 && currentDuplicateFilters[filter.id].length == 0)
		{
			delete currentDuplicateFilters[filter.id];
			return;
		}

		const addedDuplicateFilters: string[] = potentiallyNewDuplicateFilters.filter(f => !currentDuplicateFilters[filter.id].includes(f));
		const removedDuplicateFilters: string[] = currentDuplicateFilters[filter.id].filter(f => !potentiallyNewDuplicateFilters.includes(f));

		addedDuplicateFilters.forEach(f =>
		{
			// add added filter to current filter's duplicate list
			if (!currentDuplicateFilters[filter.id].includes(f))
			{
				currentDuplicateFilters[filter.id].push(f);
			}

			// need to create a list for the added filter if it doesn't exist. Duplicate filters go both ways
			if (!currentDuplicateFilters[f])
			{
				currentDuplicateFilters[f] = [];
			}

			// add cuurent filter to added filters duplicate list
			if (!currentDuplicateFilters[f].includes(filter.id))
			{
				currentDuplicateFilters[f].push(filter.id);
			}
		});

		removedDuplicateFilters.forEach(f =>
		{
			// remove removed filter from current filter's duplicate list
			const index1 = currentDuplicateFilters[filter.id].indexOf(f);
			if (index1 >= 0)
			{
				currentDuplicateFilters[filter.id].splice(index1, 1);
			}

			if (!currentDuplicateFilters[f])
			{
				return;
			}

			// remove current filter from removedFilter's list
			const index2 = currentDuplicateFilters[f].indexOf(filter.id);
			if (index2 >= 0)
			{
				currentDuplicateFilters[f].splice(index2, 1);
				if (currentDuplicateFilters[f].length == 0)
				{
					delete currentDuplicateFilters[f];
				}
			}
		});

		if (currentDuplicateFilters[filter.id].length == 0)
		{
			delete currentDuplicateFilters[filter.id];
		}
	}

	private removeFilterFromDuplicateFilters(filterID: string, currentDuplicateFilters: Dictionary<string[]>)
	{
		if (!currentDuplicateFilters[filterID])
		{
			return;
		}

		currentDuplicateFilters[filterID].forEach(f =>
		{
			if (!currentDuplicateFilters[f])
			{
				return;
			}

			const currentFilterIndexInDuplicateFilterFilters = currentDuplicateFilters[f].indexOf(filterID);
			if (currentFilterIndexInDuplicateFilterFilters >= 0)
			{
				currentDuplicateFilters[f].splice(currentFilterIndexInDuplicateFilterFilters, 1);
			}

			if (currentDuplicateFilters[f].length == 0)
			{
				delete currentDuplicateFilters[f];
			}
		});

		delete currentDuplicateFilters[filterID];
	}

	private syncFiltersForPrimaryDataObject<T extends IFilterable & IIdentifiable & IGroupable>(
		filtersToSync: Filter[],
		primaryDataObjects: T[],
		primaryDataObjectCollection: PrimaryDataObjectCollection,
		currentEmptyFilters: string[],
		currentDuplicateFilters: Dictionary<string[]>,
		allFilters: Filter[])
	{
		filtersToSync.forEach(f =>
		{
			primaryDataObjects.forEach(p =>
			{
				if (this.filterAppliesToDataObject(f, p))
				{
					if (!p.filters.includes(f.id))
					{
						p.filters.push(f.id);
					}

					if (!f[primaryDataObjectCollection].includes(p.id))
					{
						f[primaryDataObjectCollection].push(p.id);
					}
				}
				else
				{
					const filterIndex: number = p.filters.indexOf(f.id);
					if (filterIndex >= 0)
					{
						p.filters.splice(filterIndex, 1);
					}

					const objectIndex: number = f[primaryDataObjectCollection].indexOf(p.id);
					if (objectIndex >= 0)
					{
						f[primaryDataObjectCollection].splice(objectIndex, 1);
					}
				}
			});

			this.checkUpdateEmptyFilters(f.id, f[primaryDataObjectCollection], currentEmptyFilters);
			this.checkUpdateDuplicateFilters(f, this.getDuplicateFilters(f, primaryDataObjectCollection, allFilters), currentDuplicateFilters);
		});
	}
}

const filterStore = new FilterStore();
export default filterStore;

export type FilterStoreType = typeof filterStore;
