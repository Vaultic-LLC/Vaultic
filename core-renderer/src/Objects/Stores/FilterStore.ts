import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Group, Filter, DataType, IGroupable, FilterConditionType, IFilterable, AtRiskType } from "../../Types/DataTypes";
import { IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { ReactivePassword } from "./ReactivePassword";
import { ReactiveValue } from "./ReactiveValue";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { DictionaryAsList, DoubleKeyedObject, StoreState } from "@vaultic/shared/Types/Stores";

export interface IFilterStoreState extends StoreState
{
    /** Password Filters By ID */
    p: { [key: string]: Filter };
    /** Value Filters By ID */
    v: { [key: string]: Filter };
    /** Empty Password Filtesr */
    w: DictionaryAsList;
    /** Empty Value Filters */
    l: DictionaryAsList;
    /** Duplicate Password Filters */
    o: DoubleKeyedObject;
    /** Duplicate Value Filters */
    u: DoubleKeyedObject;
}

export type FilterStoreState = KnownMappedFields<IFilterStoreState>;

export class FilterStore extends SecondaryDataTypeStore<FilterStoreState>
{
    constructor(vault: any)
    {
        super(vault, "filterStoreState");
    }

    protected defaultState()
    {
        return {
            version: 0,
            p: {},
            v: new Map<string, Filter>(),
            w: new Map<string, string>(),
            l: new Map<string, string>(),
            o: new Map<string, Map<string, string>>(),
            u: new Map<string, Map<string, string>>(),
        };
    }

    async toggleFilter(id: string): Promise<undefined>
    {
        let filter: Filter | undefined = this.state.p.get(id) ?? this.state.v.get(id);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `Unable to find filter: ${id} to toggle`, "toggleFilter");
            return;
        }

        filter.a = !filter.a;
    }

    async addFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (filter.t == DataType.Passwords)
        {
            filter.id = uniqueIDGenerator.generate();

            const filterField = filter;
            pendingState.p.set(filter.id, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.id, filterField]]), this.vault.groupStore.getState().p,
                pendingState, pendingState.p);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else
        {
            filter.id = uniqueIDGenerator.generate();

            const filterField = filter;
            pendingState.v.set(filter.id, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingValueState = this.syncSpecificFiltersForValues(new Map([[filter.id, filterField]]), this.vault.groupStore.getState().v,
                pendingState, pendingState.v);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async updateFilter(masterKey: string, updatedFilter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let filter: Filter | undefined = pendingState.p.get(updatedFilter.id) ?? pendingState.v.get(updatedFilter.id);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Update")
            return false;
        }

        filter = updatedFilter;

        if (updatedFilter.t == DataType.Passwords)
        {
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.id, filter]]), this.vault.groupStore.getState().p,
                pendingState, pendingState.p);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (updatedFilter.t == DataType.NameValuePairs)
        {
            const pendingValueState = this.syncSpecificFiltersForValues(new Map([[filter.id, filter]]), this.vault.groupStore.getState().v,
                pendingState, pendingState.v);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async deleteFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentFilter: Filter | undefined = pendingState.p.get(filter.id) ?? pendingState.v.get(filter.id);
        if (!currentFilter)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Delete")
            return false;
        }

        if (filter.t == DataType.Passwords)
        {
            pendingState.p.delete(currentFilter.id);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(filter.id, "i");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, pendingState.w);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, pendingState.o);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (filter.t == DataType.NameValuePairs)
        {
            pendingState.v.delete(currentFilter.id);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(filter.id, "i");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, pendingState.l);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, pendingState.u);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForPasswords(filtersToSync: Map<string, Filter>, allGroups: Map<string, Group>, pendingState: FilterStoreState,
        passwordFilters: Map<string, Filter>)
    {
        const pendingPasswordState = this.vault.passwordStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingPasswordState.p, "p", pendingState.w,
            pendingState.o, passwordFilters, allGroups, true);

        return pendingPasswordState;
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForValues(filtersToSync: Map<string, Filter>, allGroups: Map<string, Group>, pendingState: FilterStoreState,
        valueFilters: Map<string, Filter>)
    {
        const pendingValueState = this.vault.valueStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingValueState.v, "v", pendingState.l,
            pendingState.u, valueFilters, allGroups, true);

        return pendingValueState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForPasswords(passwords: Map<string, ReactivePassword>, allGroups: Map<string, Group>, updatingPassword: boolean,
        pendingFilterStoreState: IFilterStoreState)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterStoreState.p, passwords, "p", pendingFilterStoreState.w,
            pendingFilterStoreState.o, pendingFilterStoreState.p, allGroups, updatingPassword);
    }

    // called externally when adding / updating values 
    syncFiltersForValues(values: Map<string, ReactiveValue>, allGroups: Map<string, Group>, updatingValue: boolean,
        pendingFilterStoreState: IFilterStoreState)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterStoreState.v, values, "v",
            pendingFilterStoreState.l, pendingFilterStoreState.u, pendingFilterStoreState.v, allGroups, updatingValue);
    }

    removePasswordFromFilters(passwordID: string, pendingFilterState: IFilterStoreState)
    {
        this.removePrimaryObjectFromValues(passwordID, "p", pendingFilterState.w, pendingFilterState.o, pendingFilterState.p);
    }

    removeValuesFromFilters(valueID: string)
    {
        const pendingState = this.cloneState();
        this.removePrimaryObjectFromValues(valueID, "v", pendingState.l,
            pendingState.u, pendingState.v);

        return pendingState;
    }

    private removePrimaryObjectFromValues(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        allEmptyFilters: Map<string, string>,
        allDuplicateFilters: Map<string, Map<string, string>>,
        allFilters: Map<string, Filter>)
    {
        allFilters.forEach((v, k, map) =>
        {
            v[primaryDataObjectCollection].delete(primaryObjectID);

            this.checkUpdateEmptySecondaryObject(v.id, v[primaryDataObjectCollection], allEmptyFilters);
            this.checkUpdateDuplicateSecondaryObjects(v, primaryDataObjectCollection, allDuplicateFilters, allFilters);
        });
    }

    private filterAppliesToDataObject<T extends IGroupable>(filter: Filter, dataObject: T, groups: Map<string, Group>): boolean
    {
        // if we don't have any conditions, then default to false so 
        // objects don't get included by default
        let allFilterConditionsApply: boolean = filter.c.size > 0;
        const groupsForObject: Group[] = groups.mapWhere((k, v) => dataObject.g.has(k), (k, v) => v);

        filter.c.forEach(fc =>
        {
            if (allFilterConditionsApply == false)
            {
                return;
            }

            if (fc.p === "g")
            {
                switch (fc.t)
                {
                    case FilterConditionType.StartsWith:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.n.toLowerCase().startsWith(fc.v.toLowerCase()));
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.n.toLowerCase().endsWith(fc.v.toLowerCase()));
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.n.toLowerCase().includes(fc.v.toLowerCase()));
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.n.toLowerCase() == fc.v.toLowerCase());
                        break;
                    default:
                        allFilterConditionsApply = false;
                }
            }
            else
            {
                switch (fc.t)
                {
                    case FilterConditionType.StartsWith:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject[fc.p]?.toString().toLowerCase().startsWith(fc.v.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject[fc.p]?.toString().toLowerCase().endsWith(fc.v.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject[fc.p].toString().toLowerCase().includes(fc.v.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.p].toString().toLowerCase() == fc.v.toLowerCase();
                        break;
                    default:
                        allFilterConditionsApply = false;
                }
            }
        });

        return allFilterConditionsApply;
    }

    private syncFiltersForPrimaryDataObject<T extends IFilterable & IIdentifiable & IGroupable>(
        filtersToSync: Map<string, Filter>,
        primaryDataObjects: { [key: string]: T },
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        currentEmptyFilters: Map<string, string>,
        currentDuplicateFilters: Map<string, Map<string, string>>,
        allFilters: Map<string, Filter>,
        allGroups: Map<string, Group>,
        updatingFilterOrPrimaryDataObject: boolean)
    {
        filtersToSync.forEach((f, k, map) =>
        {
            primaryDataObjects.forEach((v, k) =>
            {
                if (this.filterAppliesToDataObject(f, v, allGroups))
                {
                    if (!v.i.has(f.id))
                    {
                        v.i.set(f.id, f.id);
                    }
                    // only want to forceUpdate when updating a filter, password, or value since updating a group
                    // also calls this method, but in that case we don't want the filter to be considered updated
                    else if (updatingFilterOrPrimaryDataObject)
                    {
                        // for change tracking. make sure value is updated in case it is deleted on another device
                        //v.filters.get(f.id)!.updateAndBubble();
                    }

                    if (!f[primaryDataObjectCollection].has(v.id))
                    {
                        f[primaryDataObjectCollection].set(v.id, v.id);
                    }
                    else if (updatingFilterOrPrimaryDataObject)
                    {
                        // for change tracking. make sure value is updated in case it is deleted on another device
                        //f[primaryDataObjectCollection].get(v.id)!.updateAndBubble();
                    }
                }
                else
                {
                    if (v.i.has(f.id))
                    {
                        v.i.delete(f.id);
                    }

                    if (f[primaryDataObjectCollection].has(v.id))
                    {
                        f[primaryDataObjectCollection].delete(v.id);
                    }
                }
            });

            this.checkUpdateEmptySecondaryObject(f.id, f[primaryDataObjectCollection], currentEmptyFilters);
            this.checkUpdateDuplicateSecondaryObjects(f, primaryDataObjectCollection, currentDuplicateFilters, allFilters);
        });
    }
}

export class ReactiveFilterStore extends FilterStore 
{
    private internalPasswordFilters: ComputedRef<Filter[]>;
    private internalActivePasswordFilters: ComputedRef<Filter[]>;

    private internalNameValuePairFilters: ComputedRef<Filter[]>;
    private internalActiveNameValuePairFilters: ComputedRef<Filter[]>;

    private internalActiveAtRiskPasswordFilterType: Ref<AtRiskType>;
    private internalActiveAtRiskValueFilterType: Ref<AtRiskType>;

    get passwordFilters() { return this.internalPasswordFilters.value; }
    get passwordFiltersByID() { return this.state.p; }
    get activePasswordFilters() { return this.internalActivePasswordFilters.value; }

    get nameValuePairFilters() { return this.internalNameValuePairFilters.value; }
    get nameValuePairFiltersByID() { return this.state.v; }
    get activeNameValuePairFilters() { return this.internalActiveNameValuePairFilters.value; }

    get activeAtRiskPasswordFilterType() { return this.internalActiveAtRiskPasswordFilterType.value; }
    get activeAtRiskValueFilterType() { return this.internalActiveAtRiskValueFilterType.value; }

    get emptyPasswordFilters() { return this.state.w; }
    get emptyValueFilters() { return this.state.l; }

    get duplicatePasswordFilters() { return this.state.o; }
    get duplicateValueFilters() { return this.state.u; }

    constructor(vault: VaultStoreParameter)
    {
        super(vault);

        this.internalPasswordFilters = computed(() => this.state.p.map((k, v) => v));
        this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.a) ?? []);

        this.internalNameValuePairFilters = computed(() => this.state.v.map((k, v) => v));
        this.internalActiveNameValuePairFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => f.a) ?? []);

        this.internalActiveAtRiskPasswordFilterType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueFilterType = ref(AtRiskType.None);
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordFilterType;
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueFilterType;
    }
}