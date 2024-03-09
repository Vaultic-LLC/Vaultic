import { Filter, DataType } from "../../Types/Table";
import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import { AuthenticationStore, stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { AtRiskType } from "../../Types/EncryptedData";
import fileHelper from "@renderer/Helpers/fileHelper";

export interface FilterStoreState
{
	filterHashSalt: string;
	filterHash: string;
	filters: Filter[];
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
	addFilter(key: string, filter: Filter): Promise<void>;
	toggleFilter(id: string): boolean | undefined;
	updateFilter(key: string, updatedFilter: Filter): Promise<void>;
	deleteFilter: (key: string, filter: Filter) => Promise<void>;
	toggleAtRiskType: (dataType: DataType, atRiskType: AtRiskType) => void;
}

let filterState: FilterStoreState;

export default function useFilterStore(): FilterStore
{
	filterState = reactive(defaultState());
	let loadedFile: boolean = false;
	// --- Generic Store methods ---
	function defaultState(): FilterStoreState
	{
		loadedFile = false;
		return {
			filterHashSalt: '',
			filterHash: '',
			filters: [],
			emptyPasswordFilters: [],
			emptyValueFilters: [],
			duplicatePasswordFilters: {},
			duplicateValueFilters: {}
		};
	}

	function toString()
	{
		return JSON.stringify(filterState);
	}

	function getState(): FilterStoreState
	{
		return filterState;
	}

	async function updateState(key: string, state: FilterStoreState): Promise<void>
	{
		Object.assign(filterState, state);
		await writeState(key);
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (loadedFile)
			{
				resolve(true);
				return;
			}

			fileHelper.read<FilterStoreState>(key, window.api.files.filter).then((state: FilterStoreState) =>
			{
				loadedFile = true;
				Object.assign(filterState, state);

				resolve(true);
			}).catch(() =>
			{
				resolve(false);
			});
		});
	}

	function writeState(key: string): Promise<void>
	{
		if (filterState.filters.length == 0)
		{
			return window.api.files.filter.empty();
		}

		return fileHelper.write<FilterStoreState>(key, filterState, window.api.files.filter);
	}

	function resetToDefault()
	{
		Object.assign(filterState, defaultState());
	}

	async function canAuthenticateKeyBeforeEntry()
	{
		return await window.api.files.filter.exists();
	}

	function canAuthenticateKeyAfterEntry()
	{
		return filterState.filters.length > 0;
	}

	async function checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!await readState(key))
		{
			return false;
		}

		let runningKeys: string = "";
		for (const filter of filterState.filters)
		{
			runningKeys += await window.api.utilities.crypt.decrypt(key, filter.key);
		}

		const runnighHash = await window.api.utilities.hash.hash(runningKeys, filterState.filterHashSalt);
		const currentHash = await window.api.utilities.crypt.decrypt(key, filterState.filterHash);

		return runnighHash === currentHash;
	}

	async function checkKeyAfterEntry(key: string): Promise<boolean>
	{
		const hash = await getHash(key);
		const currentHash = await window.api.utilities.crypt.decrypt(key, filterState.filterHash);
		return hash == currentHash;
	}

	async function getHash(key: string)
	{
		let runningKeys: string = "";
		for (const filter of filterState.filters)
		{
			runningKeys += await window.api.utilities.crypt.decrypt(key, filter.key);
		}

		return window.api.utilities.hash.hash(runningKeys, filterState.filterHashSalt)
	}

	// --- Public ---
	const passwordFilters: ComputedRef<Filter[]> = computed(() => filterState.filters.filter(f => f.type == DataType.Passwords));
	const activePasswordFilters: ComputedRef<Filter[]> = computed(() => passwordFilters.value.filter(f => f.isActive) ?? []);

	const nameValuePairFilters: ComputedRef<Filter[]> = computed(() => filterState.filters.filter(f => f.type == DataType.NameValuePairs));
	const activeNameValuePairFilters: ComputedRef<Filter[]> = computed(() => nameValuePairFilters.value.filter(f => f.isActive) ?? []);

	const duplicatePasswordFiltersLength: ComputedRef<number> = computed(() => Object.keys(filterState.duplicatePasswordFilters).length);
	const duplicateValueFiltersLength: ComputedRef<number> = computed(() => Object.keys(filterState.duplicateValueFilters).length);

	const activeAtRiskPasswordFilterType: Ref<AtRiskType> = ref(AtRiskType.None);
	const activeAtRiskValueFilterType: Ref<AtRiskType> = ref(AtRiskType.None);

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

	async function addFilter(key: string, filter: Filter): Promise<void>
	{
		const addFilterData = {
			Sync: false,
			Key: key,
			Filter: filter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.add(JSON.stringify(addFilterData));
		await stores.updateAllStates(key, data);
	}

	// TODO: test
	async function updateFilter(key: string, updatedFilter: Filter): Promise<void>
	{
		const addFilterData = {
			Sync: false,
			Key: key,
			Filter: updatedFilter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.update(JSON.stringify(addFilterData));
		await stores.updateAllStates(key, data);
	}

	async function deleteFilter(key: string, filter: Filter): Promise<void>
	{
		const addFilterData = {
			Sync: false,
			Key: key,
			Filter: filter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.delete(JSON.stringify(addFilterData));
		await stores.updateAllStates(key, data);
	}

	function toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.Passwords)
		{
			if (activeAtRiskPasswordFilterType.value != atRiskType)
			{
				activeAtRiskPasswordFilterType.value = atRiskType;
				return;
			}

			activeAtRiskPasswordFilterType.value = AtRiskType.None;
		}
		else if (dataType == DataType.NameValuePairs)
		{
			if (activeAtRiskValueFilterType.value != atRiskType)
			{
				activeAtRiskValueFilterType.value = atRiskType;
				return;
			}

			activeAtRiskValueFilterType.value = AtRiskType.None;
		}
	}

	return {
		get passwordFilters() { return passwordFilters.value; },
		get activePasswordFilters() { return activePasswordFilters.value; },
		get nameValuePairFilters() { return nameValuePairFilters.value; },
		get activeNameValuePairFilters() { return activeNameValuePairFilters.value; },
		get activeAtRiskPasswordFilterType() { return activeAtRiskPasswordFilterType.value; },
		get activeAtRiskValueFilterType() { return activeAtRiskValueFilterType.value; },
		get emptyPasswordFilters() { return filterState.emptyPasswordFilters; },
		get emptyValueFilters() { return filterState.emptyValueFilters; },
		get duplicatePasswordFilters() { return filterState.duplicatePasswordFilters; },
		get duplicatePasswordFiltersLength() { return duplicatePasswordFiltersLength.value; },
		get duplicateValueFilters() { return filterState.duplicateValueFilters; },
		get duplicateValueFiltersLength() { return duplicateValueFiltersLength.value; },
		getState,
		updateState,
		canAuthenticateKeyBeforeEntry,
		canAuthenticateKeyAfterEntry,
		toString,
		checkKeyBeforeEntry,
		checkKeyAfterEntry,
		readState,
		resetToDefault,
		addFilter,
		toggleFilter,
		updateFilter,
		deleteFilter,
		toggleAtRiskType
	};
}
