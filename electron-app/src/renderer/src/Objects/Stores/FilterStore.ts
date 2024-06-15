import { Filter, DataType, Group, FilterConditionType, PrimaryDataObjectCollection } from "../../Types/Table";
import { ComputedRef, Ref, computed, ref } from "vue";
import { stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { AtRiskType, DataFile, IFilterable, IGroupable, IIdentifiable, NameValuePair, Password } from "../../Types/EncryptedData";
import { SecondaryObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "@renderer/Helpers/generatorHelper";

export interface FilterStoreState extends DataTypeStoreState<Filter>
{
	emptyPasswordFilters: string[];
	emptyValueFilters: string[];
	duplicatePasswordFilters: Dictionary<string[]>;
	duplicateValueFilters: Dictionary<string[]>;
}

class FilterStore extends SecondaryObjectStore<Filter, FilterStoreState>
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

	async addFilter(masterKey: string, filter: Filter): Promise<boolean>
	{
		filter.id = await generateUniqueID(this.state.values);
		this.state.values.push(filter);

		if (filter.type == DataType.Passwords)
		{
			this.syncFiltersForPasswords([filter], stores.passwordStore.passwords);
			if (!(await stores.passwordStore.writeState(masterKey)))
			{
				// TODO: notify user of issue
				// this would be a good time to create Vaultic Errors like how I did for the trading framework
				return false;
			}
		}
		else
		{
			this.syncFiltersForValues([filter], stores.valueStore.nameValuePairs);
			if (!(await stores.valueStore.writeState(masterKey)))
			{
				// TODO: notify user of issue
				// this would be a good time to create Vaultic Errors like how I did for the trading framework
				return false;
			}
		}

		const succeeded = await this.writeState(masterKey);
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

	async updateFilter(masterKey: string, updatedFilter: Filter): Promise<boolean>
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
			if (!(await stores.passwordStore.writeState(masterKey)))
			{
				// TODO: notify user of issue
				// this would be a good time to create Vaultic Errors like how I did for the trading framework
				return false;
			}
		}
		else if (updatedFilter.type == DataType.NameValuePairs)
		{
			this.syncFiltersForValues([updatedFilter], stores.valueStore.nameValuePairs);
			if (!(await stores.valueStore.writeState(masterKey)))
			{
				// TODO: notify user of issue
				// this would be a good time to create Vaultic Errors like how I did for the trading framework
				return false;
			}
		}

		const succeeded = await this.writeState(masterKey);
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

	async deleteFilter(masterKey: string, filter: Filter): Promise<boolean>
	{
		this.state.values.splice(this.state.values.indexOf(filter), 1);

		if (filter.type == DataType.Passwords)
		{
			stores.passwordStore.removeSecondaryObjectFromValues(filter.id, "filters");
			if (!(await stores.passwordStore.writeState(masterKey)))
			{
				// TODO: notify user of issue
				// this would be a good time to create Vaultic Errors like how I did for the trading framework
				return false;
			}

			this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, this.emptyPasswordFilters);
			this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, this.duplicatePasswordFilters);
		}
		else if (filter.type == DataType.NameValuePairs)
		{
			stores.valueStore.removeSecondaryObjectFromValues(filter.id, "filters");
			if (!(await stores.valueStore.writeState(masterKey)))
			{
				return false;
			}

			this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, this.emptyValueFilters);
			this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, this.duplicateValueFilters);
		}

		const succeeded = await this.writeState(masterKey);
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
		this.syncFiltersForPrimaryDataObject(filtersToSync, passwords, "passwords",
			this.emptyPasswordFilters, this.duplicatePasswordFilters, this.passwordFilters, stores.groupStore.passwordGroups);
	}

	syncFiltersForValues(filtersToSync: Filter[], values: NameValuePair[])
	{
		this.syncFiltersForPrimaryDataObject(filtersToSync, values, "values",
			this.emptyValueFilters, this.duplicateValueFilters, this.nameValuePairFilters, stores.groupStore.valuesGroups);
	}

	recalcGroupFilters(dataType: DataType)
	{
		if (dataType == DataType.Passwords)
		{
			this.passwordFilters.forEach(f =>
			{
				if (f.conditions.filter(c => c.property == "group").length == 0)
				{
					return;
				}

				this.syncFiltersForPasswords([f], stores.passwordStore.passwords)
			});
		}
		else
		{
			this.nameValuePairFilters.forEach(f =>
			{
				if (f.conditions.filter(c => c.property == "group").length == 0)
				{
					return;
				}

				this.syncFiltersForValues([f], stores.valueStore.nameValuePairs)
			});
		}
	}

	removePasswordFromFilters(passwordID: string)
	{
		this.removePrimaryObjectFromValues(passwordID, "passwords", this.state.emptyPasswordFilters,
			this.state.duplicatePasswordFilters, this.passwordFilters);
	}

	removeValuesFromFilters(valueID: string)
	{
		this.removePrimaryObjectFromValues(valueID, "values", this.state.emptyValueFilters,
			this.state.duplicateValueFilters, this.nameValuePairFilters);
	}

	private removePrimaryObjectFromValues(
		primaryObjectID: string,
		primaryDataObjectCollection: PrimaryDataObjectCollection,
		allEmptyFilters: string[],
		allDuplicateFilters: Dictionary<string[]>,
		allFilters: Filter[])
	{
		this.state.values.forEach(v =>
		{
			const primaryObjectIndex = v[primaryDataObjectCollection].indexOf(primaryObjectID);
			if (primaryObjectIndex >= 0)
			{
				v[primaryDataObjectCollection].splice(primaryObjectIndex, 1);
			}

			this.checkUpdateEmptySecondaryObject(v.id, v[primaryDataObjectCollection], allEmptyFilters);
			this.checkUpdateDuplicateSecondaryObjects(v, primaryDataObjectCollection, allDuplicateFilters, allFilters);
		});
	}

	private filterAppliesToDataObject<T extends IGroupable>(filter: Filter, dataObject: T, groups: Group[]): boolean
	{
		let allFilterConditionsApply: boolean = true;
		const groupsForObject: Group[] = groups.filter(g => dataObject.groups.includes(g.id));

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

	private syncFiltersForPrimaryDataObject<T extends IFilterable & IIdentifiable & IGroupable>(
		filtersToSync: Filter[],
		primaryDataObjects: T[],
		primaryDataObjectCollection: PrimaryDataObjectCollection,
		currentEmptyFilters: string[],
		currentDuplicateFilters: Dictionary<string[]>,
		allFilters: Filter[],
		allGroups: Group[])
	{
		filtersToSync.forEach(f =>
		{
			primaryDataObjects.forEach(p =>
			{
				if (this.filterAppliesToDataObject(f, p, allGroups))
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

			this.checkUpdateEmptySecondaryObject(f.id, f[primaryDataObjectCollection], currentEmptyFilters);
			this.checkUpdateDuplicateSecondaryObjects(f, primaryDataObjectCollection, currentDuplicateFilters, allFilters);
		});
	}
}

const filterStore = new FilterStore();
export default filterStore;

export type FilterStoreType = typeof filterStore;
