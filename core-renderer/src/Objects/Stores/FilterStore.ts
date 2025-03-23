import { ComputedRef, Ref, computed, ref } from "vue";
import { PrimarydataTypeStoreStateKeys, SecondaryDataTypeStore, SecondarydataTypeStoreStateKeys } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Group, Filter, DataType, IGroupable, FilterConditionType, IFilterable, AtRiskType, FilterCondition, IPrimaryDataObject } from "../../Types/DataTypes";
import { IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection, PrimaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { ReactivePassword } from "./ReactivePassword";
import { ReactiveValue } from "./ReactiveValue";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { DictionaryAsList, DoubleKeyedObject, PendingStoreState, StorePathRetriever, StoreState } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";
import { PasswordStoreState, PasswordStoreStateKeys } from "./PasswordStore";
import { ValueStoreState } from "./ValueStore";

export interface IFilterStoreState extends StoreState
{
    /** Password Filters By ID */
    p: { [key: string]: Filter };
    /** Value Filters By ID */
    v: { [key: string]: Filter };
    /** Empty Password Filters */
    w: DictionaryAsList;
    /** Empty Value Filters */
    l: DictionaryAsList;
    /** Duplicate Password Filters */
    o: DoubleKeyedObject;
    /** Duplicate Value Filters */
    u: DoubleKeyedObject;
}

export interface FilterStoreStateKeys extends SecondarydataTypeStoreStateKeys
{
    'passwordDataTypes.conditions': '';
    'passwordDataTypes.conditions.condition': '',
    'valueDataTypes.conditions': '';
    'valueDataTypes.conditions.condition': ''
}

const FilterStorePathRetriever: StorePathRetriever<FilterStoreStateKeys> =
{
    'passwordDataTypesByID': (...ids: string[]) => `p`,
    'passwordDataTypesByID.dataType': (...ids: string[]) => `p.${ids[0]}`,
    'passwordDataTypesByID.dataType.passwords': (...ids: string[]) => `p.${ids[0]}.p`,
    'passwordDataTypes.conditions': (...ids: string[]) => `p.${ids[0]}.c`,
    'passwordDataTypes.conditions.condition': (...ids: string[]) => `p.${ids[0]}.c.${ids[1]}`,
    'valueDataTypesByID': (...ids: string[]) => 'v',
    'valueDataTypesByID.dataType': (...ids: string[]) => `v.${ids[0]}`,
    'valueDataTypesByID.dataType.values': (...ids: string[]) => `v.${ids[0]}.v`,
    'valueDataTypes.conditions': (...ids: string[]) => `v.${ids[0]}.c`,
    'valueDataTypes.conditions.condition': (...ids: string[]) => `v.${ids[0]}.c.${ids[1]}`,
    'emptyPasswordDataTypes': (...ids: string[]) => `w`,
    'emptyValueDataTypes': (...ids: string[]) => `l`,
    'duplicatePasswordDataTypes': (...ids: string[]) => `o`,
    'duplicatePasswordDataTypes.dataTypes': (...ids: string[]) => `o.${ids[0]}`,
    'duplicateValueDataTypes': (...ids: string[]) => `u`,
    'duplicateValueDataTypes.dataTypes': (...ids: string[]) => `u.${ids[0]}`,
};

export type FilterStoreState = KnownMappedFields<IFilterStoreState>;

export class FilterStore extends SecondaryDataTypeStore<FilterStoreState, FilterStoreStateKeys>
{
    constructor(vault: any)
    {
        super(vault, "filterStoreState", FilterStorePathRetriever);
    }

    protected defaultState()
    {
        return {
            version: 0,
            p: {},
            v: {},
            w: {},
            l: {},
            o: {},
            u: {},
        };
    }

    async toggleFilter(id: string): Promise<undefined>
    {
        let filter: Filter | undefined = this.state.p[id] ?? this.state.v[id];
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `Unable to find filter: ${id} to toggle`, "toggleFilter");
            return;
        }

        filter.a = !filter.a;
    }

    async addFilter(
        masterKey: string,
        filter: Filter,
        pendingFilterState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        filter.id = uniqueIDGenerator.generate();

        const filterToSync: { [key: string]: Filter } = {};
        filterToSync[filter.id] = filter;

        if (filter.t == DataType.Passwords)
        {
            pendingFilterState.addValue('passwordDataTypesByID', filter.id, filter);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(filterToSync, this.vault.groupStore.getState().p,
                pendingFilterState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else
        {
            pendingFilterState.addValue('valueDataTypesByID', filter.id, filter);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingValueState = this.syncSpecificFiltersForValues(filterToSync, this.vault.groupStore.getState().v,
                pendingFilterState);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingFilterState);
        return await transaction.commit(masterKey);
    }

    async updateFilter(
        masterKey: string,
        updatedFilter: Filter,
        addedConditions: FilterCondition[],
        removedConditions: string[],
        pendingFilterState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);

        const filterToSync: { [key: string]: Filter } = {};
        filterToSync[updatedFilter.id] = updatedFilter;

        if (updatedFilter.t == DataType.Passwords)
        {
            let filter: Filter | undefined = pendingFilterState.state.p[updatedFilter.id];
            if (!filter)
            {
                await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Update")
                return false;
            }

            this.updateFilterConditions(updatedFilter, "passwordDataTypes.conditions", "passwordDataTypes.conditions.condition",
                addedConditions, removedConditions, pendingFilterState);

            pendingFilterState.commitProxyObject('passwordDataTypesByID.dataType', updatedFilter, updatedFilter.id);

            const pendingPasswordState = this.syncSpecificFiltersForPasswords(filterToSync, this.vault.groupStore.getState().p,
                pendingFilterState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (updatedFilter.t == DataType.NameValuePairs)
        {
            let filter: Filter | undefined = pendingFilterState.state.v[updatedFilter.id];
            if (!filter)
            {
                await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Update")
                return false;
            }

            this.updateFilterConditions(updatedFilter, "valueDataTypes.conditions", "valueDataTypes.conditions.condition",
                addedConditions, removedConditions, pendingFilterState);

            pendingFilterState.commitProxyObject('valueDataTypesByID.dataType', updatedFilter, updatedFilter.id);

            const pendingValueState = this.syncSpecificFiltersForValues(filterToSync, this.vault.groupStore.getState().v,
                pendingFilterState);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingFilterState);
        return await transaction.commit(masterKey);
    }

    async deleteFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.getPendingState()!;

        if (filter.t == DataType.Passwords)
        {
            const currentFilter: Filter | undefined = pendingState.state.p[filter.id];
            if (!currentFilter)
            {
                await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Delete")
                return false;
            }

            pendingState.deleteValue('passwordDataTypesByID', currentFilter.id);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(filter.id, "i");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, "emptyPasswordDataTypes", pendingState);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, "duplicatePasswordDataTypes", "duplicatePasswordDataTypes.dataTypes",
                pendingState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (filter.t == DataType.NameValuePairs)
        {
            const currentFilter: Filter | undefined = pendingState.state.p[filter.id];
            if (!currentFilter)
            {
                await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Delete")
                return false;
            }

            pendingState.deleteValue('valueDataTypesByID', currentFilter.id);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(filter.id, "i");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, "emptyValueDataTypes", pendingState);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, "duplicateValueDataTypes", "duplicateValueDataTypes.dataTypes",
                pendingState);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    private updateFilterConditions(
        filter: Filter,
        allConditionsPath: keyof FilterStoreStateKeys,
        conditionPath: keyof FilterStoreStateKeys,
        addedConditions: FilterCondition[],
        deletedConditions: string[],
        pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        // commit all tracking for upated filter conditions. There were
        // made into proxies in the FilterView so we should just be able to commit them
        OH.forEach(filter.c, (k, v) => 
        {
            const deletedIndex = deletedConditions.indexOf(k);
            if (deletedIndex >= 0)
            {
                // We deleted the filter, don't need to worry about updates
                return;
            }

            pendingFilterStoreState.commitProxyObject(conditionPath, v, filter.id, k)
        });

        for (let i = 0; i < addedConditions.length; i++)
        {
            pendingFilterStoreState.addValue(allConditionsPath, addedConditions[i].id, addedConditions[i], filter.id);
        }

        for (let i = 0; i < deletedConditions.length; i++)
        {
            pendingFilterStoreState.deleteValue(allConditionsPath, deletedConditions[i], filter.id);
        }
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForPasswords(
        filtersToSync: { [key: string]: Filter },
        allGroups: { [key: string]: Group },
        pendingFilterState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        const pendingPasswordState = this.vault.passwordStore.getPendingState()!;

        this.syncFiltersForPrimaryDataObject(filtersToSync, Object.values(pendingPasswordState.state.p), "p", "passwordDataTypesByID.dataType.passwords", "dataTypesByID.dataType.filters",
            pendingPasswordState, pendingFilterState.state.w, pendingFilterState.state.o, pendingFilterState.state.p, allGroups, "emptyPasswordDataTypes", "duplicatePasswordDataTypes",
            "duplicatePasswordDataTypes.dataTypes", pendingFilterState);

        return pendingPasswordState;
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForValues(
        filtersToSync: { [key: string]: Filter },
        allGroups: { [key: string]: Group },
        pendingFilterState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        const pendingValueState = this.vault.valueStore.getPendingState()!;

        this.syncFiltersForPrimaryDataObject(filtersToSync, Object.values(pendingValueState.state.v), "v", "valueDataTypesByID.dataType.values", "dataTypesByID.dataType.filters",
            pendingValueState, pendingFilterState.state.l, pendingFilterState.state.u, pendingFilterState.state.v, allGroups, "emptyValueDataTypes", "duplicateValueDataTypes",
            "duplicateValueDataTypes.dataTypes", pendingFilterState);

        return pendingValueState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForPasswords(
        passwordsToSync: ReactivePassword[],
        pendingPasswordState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>,
        allGroups: { [key: string]: Group },
        pendingFilterState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterState.state.p, passwordsToSync, "p", "passwordDataTypesByID.dataType.passwords", "dataTypesByID.dataType.filters",
            pendingPasswordState, pendingFilterState.state.w, pendingFilterState.state.o, pendingFilterState.state.p, allGroups, "emptyPasswordDataTypes", "duplicatePasswordDataTypes",
            "duplicatePasswordDataTypes.dataTypes", pendingFilterState);
    }

    // called externally when adding / updating values 
    syncFiltersForValues(
        valuesToSync: ReactiveValue[],
        pendingValueState: PendingStoreState<ValueStoreState, PrimarydataTypeStoreStateKeys>,
        allGroups: { [key: string]: Group },
        pendingFilterState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterState.state.v, valuesToSync, "v", "valueDataTypesByID.dataType.values", "dataTypesByID.dataType.filters",
            pendingValueState, pendingFilterState.state.l, pendingFilterState.state.u, pendingFilterState.state.v, allGroups, "emptyValueDataTypes", "duplicateValueDataTypes",
            "duplicateValueDataTypes.dataTypes", pendingFilterState);
    }

    removePasswordFromFilters(passwordID: string, pendingFilterStore: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        this.removePrimaryObjectFromValues(passwordID, "p", "passwordDataTypesByID.dataType.passwords", pendingFilterStore.state.p,
            pendingFilterStore.state.w, pendingFilterStore.state.o, "duplicatePasswordDataTypes", "duplicatePasswordDataTypes.dataTypes", pendingFilterStore);
    }

    removeValuesFromFilters(valueID: string, pendingFilterStore: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        this.removePrimaryObjectFromValues(valueID, "v", "valueDataTypesByID.dataType.values", pendingFilterStore.state.v,
            pendingFilterStore.state.l, pendingFilterStore.state.u, "duplicateValueDataTypes", "duplicateValueDataTypes.dataTypes", pendingFilterStore);
    }

    /** Removes a Password or Value from all current Filters. 
     * 
     * @param primaryObjectID The ID of the Password of Value
     * @param primaryDataObjectCollection "p" | "v"
     * @param pathToPrimaryDataObjects Path to Passwords or Values on each filter
     * @param allFilters All current Filters
     * @param pendingFilterStore Current pending filter store
     */
    private removePrimaryObjectFromValues(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        pathToPrimaryDataObjects: keyof FilterStoreStateKeys,
        allFilters: { [key: string]: Filter },
        allEmptyFilters: DictionaryAsList,
        allDuplicateFilters: DoubleKeyedObject,
        duplicateDataTypesPath: keyof FilterStoreStateKeys,
        duplicateDataTypesDataTypesPath: keyof FilterStoreStateKeys,
        pendingFilterStore: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        OH.forEachValue(allFilters, (v) =>
        {
            if (v[primaryDataObjectCollection].has(primaryObjectID))
            {
                pendingFilterStore.deleteValue(pathToPrimaryDataObjects, primaryObjectID, v.id);
            }

            this.checkUpdateEmptySecondaryObject(v.id, v[primaryDataObjectCollection], "emptyPasswordDataTypes", allEmptyFilters, pendingFilterStore);
            this.checkUpdateDuplicateSecondaryObjects(v, primaryDataObjectCollection, allDuplicateFilters, allFilters, duplicateDataTypesPath, duplicateDataTypesDataTypesPath, pendingFilterStore);
        });
    }

    private filterAppliesToDataObject<T extends IGroupable>(filter: Filter, dataObject: T, groups: { [key: string]: Group }): boolean
    {
        // if we don't have any conditions, then default to false so 
        // objects don't get included by default
        let allFilterConditionsApply: boolean = OH.size(filter.c) > 0;
        const groupsForObject: Group[] = OH.mapWhere(groups, (k, v) => dataObject.g.has(k), (k, v) => v);

        OH.forEachValue(filter.c, fc =>
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

    /**
     * Sync all Filters provided for all Primary Objects provided
     * @param filtersToSync The filters to sync 
     * @param primaryDataObjects The passwords or values to sync
     * @param primaryDataObjectCollection The collection on Filters to sync, either "p" or "v"
     * @param pathToPrimaryDataObjectOnSecondaryObject Path to Passwords or Values on Filters from the Filter store
     * @param pathToSecondaryObjectsOnPrimaryObject  Path to Filters from Passwords or Values from the Primary Data Type store
     * @param primaryDataObjectPendingStoreState The pending store state for the primary data objects
     * @param currentEmptyFilters All the current empty filters for the primary object type, either emptyPasswordDataTypes or emptyValueDataTypes
     * @param currentDuplicateFilters All the current duplicate filters for the primary object type, either duplicatePasswordDataTypes or duplicateValueDataTypes
     * @param allFilters All password or value filters, either passwordDataTypes or valueDataTypes
     * @param allGroups All groups, either passwordDataTypes or valueDataTypes
     * @param emptySecondaryDataObjectPath Path to the empty filters, either "emptyPasswordDataTypes" or "emptyValueDataTypes"
     * @param duplicateDataTypesPath Path to the duplicate filters, either "duplicatePasswordDataTypes" or "duplicateValueDataTypes"
     * @param duplicateDataTypesDataTypePath Path to the current duplicates data types data tyeps, either "duplicatePasswordDataTypes.dataTypes" or "duplicateValueDataTypes.dataTypes"
     * @param pendingFilterStoreState Current pending filter store state
     */
    private syncFiltersForPrimaryDataObject<T extends IFilterable & IIdentifiable & IGroupable>(
        filtersToSync: { [key: string]: Filter },
        primaryDataObjects: T[],
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        pathToPrimaryDataObjectOnSecondaryObject: keyof FilterStoreStateKeys,
        pathToSecondaryObjectsOnPrimaryObject: keyof PrimarydataTypeStoreStateKeys,
        primaryDataObjectPendingStoreState: PendingStoreState<StoreState, PrimarydataTypeStoreStateKeys>,
        currentEmptyFilters: DictionaryAsList,
        currentDuplicateFilters: DoubleKeyedObject,
        allFilters: { [key: string]: Filter },
        allGroups: { [key: string]: Group },
        emptySecondaryDataObjectPath: keyof FilterStoreStateKeys,
        duplicateDataTypesPath: keyof FilterStoreStateKeys,
        duplicateDataTypesDataTypePath: keyof FilterStoreStateKeys,
        pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>)
    {
        OH.forEachValue(filtersToSync, f =>
        {
            primaryDataObjects.forEach((v) =>
            {
                if (this.filterAppliesToDataObject(f, v, allGroups))
                {
                    if (!v.i.has(f.id))
                    {
                        primaryDataObjectPendingStoreState.addValue(pathToSecondaryObjectsOnPrimaryObject, f.id, true, v.id);
                    }

                    if (!f[primaryDataObjectCollection].has(v.id))
                    {
                        pendingFilterStoreState.addValue(pathToPrimaryDataObjectOnSecondaryObject, v.id, true, f.id);
                    }
                }
                else
                {
                    if (v.i.has(f.id))
                    {
                        primaryDataObjectPendingStoreState.deleteValue(pathToSecondaryObjectsOnPrimaryObject, f.id, v.id);
                    }

                    if (f[primaryDataObjectCollection].has(v.id))
                    {
                        pendingFilterStoreState.deleteValue(pathToPrimaryDataObjectOnSecondaryObject, v.id, f.id);
                    }
                }
            });

            this.checkUpdateEmptySecondaryObject(f.id, f[primaryDataObjectCollection], emptySecondaryDataObjectPath, currentEmptyFilters, pendingFilterStoreState);
            this.checkUpdateDuplicateSecondaryObjects(f, primaryDataObjectCollection, currentDuplicateFilters, allFilters, duplicateDataTypesPath, duplicateDataTypesDataTypePath, pendingFilterStoreState);
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

        this.internalPasswordFilters = computed(() => Object.values(this.state.p));
        this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.a) ?? []);

        this.internalNameValuePairFilters = computed(() => Object.values(this.state.v));
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