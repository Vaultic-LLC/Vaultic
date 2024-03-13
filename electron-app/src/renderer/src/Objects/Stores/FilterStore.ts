import { Filter, DataType } from "../../Types/Table";
import { ComputedRef, Ref, computed, ref } from "vue";
import { stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { AtRiskType, DataFile } from "../../Types/EncryptedData";
import { AuthenticationStore, AuthenticationStoreState } from "./Base";

export interface FilterStoreState extends AuthenticationStoreState<Filter>
{
	emptyPasswordFilters: string[];
	emptyValueFilters: string[];
	duplicatePasswordFilters: Dictionary<string[]>;
	duplicateValueFilters: Dictionary<string[]>;
}

// export interface IFilterStore extends IAuthenticationStore
// {
// 	passwordFilters: Filter[];
// 	activePasswordFilters: Filter[];
// 	nameValuePairFilters: Filter[];
// 	activeNameValuePairFilters: Filter[];
// 	activeAtRiskPasswordFilterType: AtRiskType;
// 	activeAtRiskValueFilterType: AtRiskType;
// 	emptyPasswordFilters: string[];
// 	emptyValueFilters: string[];
// 	duplicatePasswordFilters: Dictionary<string[]>;
// 	duplicatePasswordFiltersLength: number;
// 	duplicateValueFilters: Dictionary<string[]>;
// 	duplicateValueFiltersLength: number;
// 	addFilter(key: string, filter: Filter): Promise<void>;
// 	toggleFilter(id: string): boolean | undefined;
// 	updateFilter(key: string, updatedFilter: Filter): Promise<void>;
// 	deleteFilter: (key: string, filter: Filter) => Promise<void>;
// }

// let filterState: FilterStoreState;
// let loadedFile: boolean = false;

// export default function useFilterStore(): FilterStore
// {
// 	filterState = reactive(defaultState());
// 	// --- Generic Store methods ---
// 	function defaultState(): FilterStoreState
// 	{
// 		loadedFile = false;
// 		return {
// 			filterHashSalt: '',
// 			filterHash: '',
// 			filters: [],
// 			emptyPasswordFilters: [],
// 			emptyValueFilters: [],
// 			duplicatePasswordFilters: {},
// 			duplicateValueFilters: {}
// 		};
// 	}

// 	function toString()
// 	{
// 		return JSON.stringify(filterState);
// 	}

// 	function getState(): FilterStoreState
// 	{
// 		return filterState;
// 	}

// 	async function updateState(key: string, state: FilterStoreState): Promise<void>
// 	{
// 		Object.assign(filterState, state);
// 		await writeState(key);
// 	}

// 	function readState(key: string): Promise<boolean>
// 	{
// 		return new Promise((resolve, _) =>
// 		{
// 			if (loadedFile)
// 			{
// 				resolve(true);
// 				return;
// 			}

// 			fileHelper.read<FilterStoreState>(key, window.api.files.filter).then((state: FilterStoreState) =>
// 			{
// 				loadedFile = true;
// 				Object.assign(filterState, state);

// 				resolve(true);
// 			}).catch(() =>
// 			{
// 				resolve(false);
// 			});
// 		});
// 	}

// 	function writeState(key: string): Promise<void>
// 	{
// 		if (filterState.filters.length == 0)
// 		{
// 			return window.api.files.filter.empty();
// 		}

// 		return fileHelper.write<FilterStoreState>(key, filterState, window.api.files.filter);
// 	}

// 	function resetToDefault()
// 	{
// 		Object.assign(filterState, defaultState());
// 	}

// 	async function canAuthenticateKeyBeforeEntry()
// 	{
// 		return await window.api.files.filter.exists();
// 	}

// 	function canAuthenticateKeyAfterEntry()
// 	{
// 		return filterState.filters.length > 0;
// 	}

// 	async function checkKeyBeforeEntry(key: string): Promise<boolean>
// 	{
// 		if (!await readState(key))
// 		{
// 			return false;
// 		}

// 		const hash = await getHash(key);
// 		if (!hash[0])
// 		{
// 			return false;
// 		}

// 		const result = await cryptHelper.decrypt(key, filterState.filterHash);

// 		if (!result.success)
// 		{
// 			return false;
// 		}

// 		return hash[1] === result.value;
// 	}

// 	async function checkKeyAfterEntry(key: string): Promise<boolean>
// 	{
// 		const hash = await getHash(key);
// 		if (!hash[0])
// 		{
// 			return false;
// 		}

// 		const result = await cryptHelper.decrypt(key, filterState.filterHash);

// 		if (!result.success)
// 		{
// 			return false;
// 		}

// 		return hash[1] === result.value;
// 	}

// 	async function getHash(key: string): Promise<[boolean, string]>
// 	{
// 		let runningKeys: string = "";
// 		for (const filter of filterState.filters)
// 		{
// 			const result = await cryptHelper.decrypt(key, filter.key);
// 			if (!result.success)
// 			{
// 				return [false, ""];
// 			}

// 			runningKeys += result.value ?? "";
// 		}

// 		const hash = await window.api.utilities.hash.hash(runningKeys, filterState.filterHashSalt);
// 		return [true, hash];
// 	}

// 	// --- Public ---
// 	const passwordFilters: ComputedRef<Filter[]> = computed(() => filterState.filters.filter(f => f.type == DataType.Passwords));
// 	const activePasswordFilters: ComputedRef<Filter[]> = computed(() => passwordFilters.value.filter(f => f.isActive) ?? []);

// 	const nameValuePairFilters: ComputedRef<Filter[]> = computed(() => filterState.filters.filter(f => f.type == DataType.NameValuePairs));
// 	const activeNameValuePairFilters: ComputedRef<Filter[]> = computed(() => nameValuePairFilters.value.filter(f => f.isActive) ?? []);

// 	const duplicatePasswordFiltersLength: ComputedRef<number> = computed(() => Object.keys(filterState.duplicatePasswordFilters).length);
// 	const duplicateValueFiltersLength: ComputedRef<number> = computed(() => Object.keys(filterState.duplicateValueFilters).length);

// 	const activeAtRiskPasswordFilterType: Ref<AtRiskType> = ref(AtRiskType.None);
// 	const activeAtRiskValueFilterType: Ref<AtRiskType> = ref(AtRiskType.None);

// 	function toggleFilter(id: string): boolean | undefined
// 	{
// 		const filterIndex: number = filterState.filters.findIndex(f => f.id == id);
// 		if (filterIndex >= 0)
// 		{
// 			filterState.filters[filterIndex].isActive = !filterState.filters[filterIndex].isActive;
// 			// TODO Write State to file
// 			return filterState.filters[filterIndex].isActive;
// 		}

// 		return undefined;
// 	}

// 	async function addFilter(key: string, filter: Filter): Promise<void>
// 	{
// 		const addFilterData = {
// 			Sync: false,
// 			Key: key,
// 			Filter: filter,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.filter.add(JSON.stringify(addFilterData));
// 		await stores.handleUpdateStoreResponse(key, data);
// 	}

// 	// TODO: test
// 	async function updateFilter(key: string, updatedFilter: Filter): Promise<void>
// 	{
// 		const addFilterData = {
// 			Sync: false,
// 			Key: key,
// 			Filter: updatedFilter,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.filter.update(JSON.stringify(addFilterData));
// 		await stores.handleUpdateStoreResponse(key, data);
// 	}

// 	async function deleteFilter(key: string, filter: Filter): Promise<void>
// 	{
// 		const addFilterData = {
// 			Sync: false,
// 			Key: key,
// 			Filter: filter,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.filter.delete(JSON.stringify(addFilterData));
// 		await stores.handleUpdateStoreResponse(key, data);
// 	}

// 	function toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
// 	{
// 		if (dataType == DataType.Passwords)
// 		{
// 			if (activeAtRiskPasswordFilterType.value != atRiskType)
// 			{
// 				activeAtRiskPasswordFilterType.value = atRiskType;
// 				return;
// 			}

// 			activeAtRiskPasswordFilterType.value = AtRiskType.None;
// 		}
// 		else if (dataType == DataType.NameValuePairs)
// 		{
// 			if (activeAtRiskValueFilterType.value != atRiskType)
// 			{
// 				activeAtRiskValueFilterType.value = atRiskType;
// 				return;
// 			}

// 			activeAtRiskValueFilterType.value = AtRiskType.None;
// 		}
// 	}

// 	return {
// 		get passwordFilters() { return passwordFilters.value; },
// 		get activePasswordFilters() { return activePasswordFilters.value; },
// 		get nameValuePairFilters() { return nameValuePairFilters.value; },
// 		get activeNameValuePairFilters() { return activeNameValuePairFilters.value; },
// 		get activeAtRiskPasswordFilterType() { return activeAtRiskPasswordFilterType.value; },
// 		get activeAtRiskValueFilterType() { return activeAtRiskValueFilterType.value; },
// 		get emptyPasswordFilters() { return filterState.emptyPasswordFilters; },
// 		get emptyValueFilters() { return filterState.emptyValueFilters; },
// 		get duplicatePasswordFilters() { return filterState.duplicatePasswordFilters; },
// 		get duplicatePasswordFiltersLength() { return duplicatePasswordFiltersLength.value; },
// 		get duplicateValueFilters() { return filterState.duplicateValueFilters; },
// 		get duplicateValueFiltersLength() { return duplicateValueFiltersLength.value; },
// 		getState,
// 		updateState,
// 		canAuthenticateKeyBeforeEntry,
// 		canAuthenticateKeyAfterEntry,
// 		toString,
// 		checkKeyBeforeEntry,
// 		checkKeyAfterEntry,
// 		readState,
// 		resetToDefault,
// 		addFilter,
// 		toggleFilter,
// 		updateFilter,
// 		deleteFilter,
// 		toggleAtRiskType
// 	};
// }
class FilterStore extends AuthenticationStore<Filter, FilterStoreState>
{
	private internalPasswordFilters: ComputedRef<Filter[]>;
	private internalActivePasswordFilters: ComputedRef<Filter[]>;

	private internalNameValuePairFilters: ComputedRef<Filter[]>;
	private internalActiveNameValuePairFilters: ComputedRef<Filter[]>;

	private internalDuplicatePasswordFiltersLength: ComputedRef<number>;
	private internalDuplicateValueFiltersLength: ComputedRef<number>;

	private internalActiveAtRiskPasswordFilterType: Ref<AtRiskType>;
	private internalActiveAtRiskValueFilterType: Ref<AtRiskType>;

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
	}

	protected defaultState()
	{
		return {
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
			// TODO Write State to file
			return this.state.values[filterIndex].isActive;
		}

		return undefined;
	}

	async addFilter(key: string, filter: Filter): Promise<void>
	{
		const addFilterData = {
			Sync: false,
			Key: key,
			Filter: filter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.add(JSON.stringify(addFilterData));
		await stores.handleUpdateStoreResponse(key, data);
	}

	async updateFilter(key: string, updatedFilter: Filter): Promise<void>
	{
		const addFilterData = {
			Sync: false,
			Key: key,
			Filter: updatedFilter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.update(JSON.stringify(addFilterData));
		await stores.handleUpdateStoreResponse(key, data);
	}

	async deleteFilter(key: string, filter: Filter): Promise<void>
	{
		const addFilterData = {
			Sync: false,
			Key: key,
			Filter: filter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.delete(JSON.stringify(addFilterData));
		await stores.handleUpdateStoreResponse(key, data);
	}
}

const filterStore = new FilterStore();
export default filterStore;

export type FilterStoreType = typeof filterStore;
