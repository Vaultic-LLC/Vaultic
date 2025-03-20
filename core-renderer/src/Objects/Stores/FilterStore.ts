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
import { StoreState } from "@vaultic/shared/Types/Stores";

export interface IFilterStoreState extends StoreState
{
    passwordFiltersByID: Map<string, Filter>;
    valueFiltersByID: Map<string, Filter>;
    emptyPasswordFilters: Map<string, string>;
    emptyValueFilters: Map<string, string>;
    duplicatePasswordFilters: Map<string, Map<string, string>>;
    duplicateValueFilters: Map<string, Map<string, string>>;
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
            passwordFiltersByID: new Map<string, Filter>(),
            valueFiltersByID: new Map<string, Filter>(),
            emptyPasswordFilters: new Map<string, string>(),
            emptyValueFilters: new Map<string, string>(),
            duplicatePasswordFilters: new Map<string, Map<string, string>>(),
            duplicateValueFilters: new Map<string, Map<string, string>>(),
        };
    }

    async toggleFilter(id: string): Promise<undefined>
    {
        let filter: Filter | undefined = this.state.passwordFiltersByID.get(id) ?? this.state.valueFiltersByID.get(id);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `Unable to find filter: ${id} to toggle`, "toggleFilter");
            return;
        }

        filter.isActive = !filter.isActive;
    }

    async addFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (filter.type == DataType.Passwords)
        {
            filter.id = uniqueIDGenerator.generate();

            const filterField = filter;
            pendingState.passwordFiltersByID.set(filter.id, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.id, filterField]]), this.vault.groupStore.getState().passwordGroupsByID,
                pendingState, pendingState.passwordFiltersByID);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else
        {
            filter.id = uniqueIDGenerator.generate();

            const filterField = filter;
            pendingState.valueFiltersByID.set(filter.id, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingValueState = this.syncSpecificFiltersForValues(new Map([[filter.id, filterField]]), this.vault.groupStore.getState().valueGroupsByID,
                pendingState, pendingState.valueFiltersByID);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async updateFilter(masterKey: string, updatedFilter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let filter: Filter | undefined = pendingState.passwordFiltersByID.get(updatedFilter.id) ?? pendingState.valueFiltersByID.get(updatedFilter.id);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Update")
            return false;
        }

        filter = updatedFilter;

        if (updatedFilter.type == DataType.Passwords)
        {
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.id, filter]]), this.vault.groupStore.getState().passwordGroupsByID,
                pendingState, pendingState.passwordFiltersByID);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (updatedFilter.type == DataType.NameValuePairs)
        {
            const pendingValueState = this.syncSpecificFiltersForValues(new Map([[filter.id, filter]]), this.vault.groupStore.getState().valueGroupsByID,
                pendingState, pendingState.valueFiltersByID);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async deleteFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentFilter: Filter | undefined = pendingState.passwordFiltersByID.get(filter.id) ?? pendingState.valueFiltersByID.get(filter.id);
        if (!currentFilter)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Delete")
            return false;
        }

        if (filter.type == DataType.Passwords)
        {
            pendingState.passwordFiltersByID.delete(currentFilter.id);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(filter.id, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, pendingState.emptyPasswordFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, pendingState.duplicatePasswordFilters);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (filter.type == DataType.NameValuePairs)
        {
            pendingState.valueFiltersByID.delete(currentFilter.id);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(filter.id, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id, pendingState.emptyValueFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id, pendingState.duplicateValueFilters);

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

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingPasswordState.passwordsByID, "passwords", pendingState.emptyPasswordFilters,
            pendingState.duplicatePasswordFilters, passwordFilters, allGroups, true);

        return pendingPasswordState;
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForValues(filtersToSync: Map<string, Filter>, allGroups: Map<string, Group>, pendingState: FilterStoreState,
        valueFilters: Map<string, Filter>)
    {
        const pendingValueState = this.vault.valueStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingValueState.valuesByID, "values", pendingState.emptyValueFilters,
            pendingState.duplicateValueFilters, valueFilters, allGroups, true);

        return pendingValueState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForPasswords(passwords: Map<string, ReactivePassword>, allGroups: Map<string, Group>, updatingPassword: boolean,
        pendingFilterStoreState: IFilterStoreState)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterStoreState.passwordFiltersByID, passwords, "passwords", pendingFilterStoreState.emptyPasswordFilters,
            pendingFilterStoreState.duplicatePasswordFilters, pendingFilterStoreState.passwordFiltersByID, allGroups, updatingPassword);
    }

    // called externally when adding / updating values 
    syncFiltersForValues(values: Map<string, ReactiveValue>, allGroups: Map<string, Group>, updatingValue: boolean,
        pendingFilterStoreState: IFilterStoreState)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterStoreState.valueFiltersByID, values, "values",
            pendingFilterStoreState.emptyValueFilters, pendingFilterStoreState.duplicateValueFilters, pendingFilterStoreState.valueFiltersByID, allGroups, updatingValue);
    }

    removePasswordFromFilters(passwordID: string, pendingFilterState: IFilterStoreState)
    {
        this.removePrimaryObjectFromValues(passwordID, "passwords", pendingFilterState.emptyPasswordFilters, pendingFilterState.duplicatePasswordFilters, pendingFilterState.passwordFiltersByID);
    }

    removeValuesFromFilters(valueID: string)
    {
        const pendingState = this.cloneState();
        this.removePrimaryObjectFromValues(valueID, "values", pendingState.emptyValueFilters,
            pendingState.duplicateValueFilters, pendingState.valueFiltersByID);

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
        let allFilterConditionsApply: boolean = filter.conditions.size > 0;
        const groupsForObject: Group[] = groups.mapWhere((k, v) => dataObject.groups.has(k), (k, v) => v);

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
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject[fc.property]?.toString().toLowerCase().startsWith(fc.value.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject[fc.property]?.toString().toLowerCase().endsWith(fc.value.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject[fc.property].toString().toLowerCase().includes(fc.value.toLowerCase()) ?? false);
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
        filtersToSync: Map<string, Filter>,
        primaryDataObjects: Map<string, T>,
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
                    if (!v.filters.has(f.id))
                    {
                        v.filters.set(f.id, f.id);
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
                    if (v.filters.has(f.id))
                    {
                        v.filters.delete(f.id);
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
    get passwordFiltersByID() { return this.state.passwordFiltersByID; }
    get activePasswordFilters() { return this.internalActivePasswordFilters.value; }

    get nameValuePairFilters() { return this.internalNameValuePairFilters.value; }
    get nameValuePairFiltersByID() { return this.state.valueFiltersByID; }
    get activeNameValuePairFilters() { return this.internalActiveNameValuePairFilters.value; }

    get activeAtRiskPasswordFilterType() { return this.internalActiveAtRiskPasswordFilterType.value; }
    get activeAtRiskValueFilterType() { return this.internalActiveAtRiskValueFilterType.value; }

    get emptyPasswordFilters() { return this.state.emptyPasswordFilters; }
    get emptyValueFilters() { return this.state.emptyValueFilters; }

    get duplicatePasswordFilters() { return this.state.duplicatePasswordFilters; }
    get duplicateValueFilters() { return this.state.duplicateValueFilters; }

    constructor(vault: VaultStoreParameter)
    {
        super(vault);

        this.internalPasswordFilters = computed(() => this.state.passwordFiltersByID.map((k, v) => v));
        this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.isActive) ?? []);

        this.internalNameValuePairFilters = computed(() => this.state.valueFiltersByID.map((k, v) => v));
        this.internalActiveNameValuePairFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => f.isActive) ?? []);

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