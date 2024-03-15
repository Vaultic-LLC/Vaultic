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
