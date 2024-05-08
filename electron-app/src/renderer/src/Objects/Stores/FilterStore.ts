import { Filter, DataType } from "../../Types/Table";
import { ComputedRef, Ref, computed, ref } from "vue";
import { stores } from ".";
import { Dictionary } from "../../Types/DataStructures";
import { AtRiskType, DataFile } from "../../Types/EncryptedData";
import { DataTypeStore, DataTypeStoreState } from "./Base";

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
		const addFilterData = {
			MasterKey: key,
			Filter: filter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.add(JSON.stringify(addFilterData));
		return await stores.handleUpdateStoreResponse(key, data);
	}

	async updateFilter(key: string, updatedFilter: Filter): Promise<boolean>
	{
		const addFilterData = {
			MasterKey: key,
			Filter: updatedFilter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.update(JSON.stringify(addFilterData));
		return await stores.handleUpdateStoreResponse(key, data);
	}

	async deleteFilter(key: string, filter: Filter): Promise<boolean>
	{
		const addFilterData = {
			MasterKey: key,
			Filter: filter,
			...stores.getStates()
		};

		const data: any = await window.api.server.filter.delete(JSON.stringify(addFilterData));
		return await stores.handleUpdateStoreResponse(key, data);
	}
}

const filterStore = new FilterStore();
export default filterStore;

export type FilterStoreType = typeof filterStore;
