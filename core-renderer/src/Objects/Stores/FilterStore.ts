import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, StoreState } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Group, Filter, DataType, IGroupable, FilterConditionType, IFilterable, AtRiskType } from "../../Types/DataTypes";
import { Field, IFieldObject, IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { ReactivePassword } from "./ReactivePassword";
import { ReactiveValue } from "./ReactiveValue";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { defaultFilterStoreState } from "@vaultic/shared/Types/Stores";

export interface IFilterStoreState extends StoreState
{
    passwordFiltersByID: Field<Map<string, Field<Filter>>>;
    valueFiltersByID: Field<Map<string, Field<Filter>>>;
    emptyPasswordFilters: Field<Map<string, Field<string>>>;
    emptyValueFilters: Field<Map<string, Field<string>>>;
    duplicatePasswordFilters: Field<Map<string, Field<Map<string, Field<string>>>>>;
    duplicateValueFilters: Field<Map<string, Field<Map<string, Field<string>>>>>;
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
        return defaultFilterStoreState;
    }

    async toggleFilter(id: string): Promise<undefined>
    {
        let filter: Field<Filter> | undefined = this.state.passwordFiltersByID.value.get(id) ?? this.state.valueFiltersByID.value.get(id);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `Unable to find filter: ${id} to toggle`, "toggleFilter");
            return;
        }

        filter.value.isActive.value = !filter.value.isActive.value;
    }

    async addFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (filter.type.value == DataType.Passwords)
        {
            filter.id.value = uniqueIDGenerator.generate();

            const filterField = Field.create(filter);
            pendingState.passwordFiltersByID.addMapValue(filter.id.value, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.id.value, filterField]]), this.vault.groupStore.getState().passwordGroupsByID,
                pendingState, pendingState.passwordFiltersByID);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else
        {
            filter.id.value = uniqueIDGenerator.generate();

            const filterField = Field.create(filter);
            pendingState.valueFiltersByID.addMapValue(filter.id.value, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingValueState = this.syncSpecificFiltersForValues(new Map([[filter.id.value, filterField]]), this.vault.groupStore.getState().valueGroupsByID,
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

        let filter: Field<Filter> | undefined = pendingState.passwordFiltersByID.value.get(updatedFilter.id.value) ?? pendingState.valueFiltersByID.value.get(updatedFilter.id.value);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Update")
            return false;
        }

        filter.value = updatedFilter;

        if (updatedFilter.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.value.id.value, filter]]), this.vault.groupStore.getState().passwordGroupsByID,
                pendingState, pendingState.passwordFiltersByID);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (updatedFilter.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.syncSpecificFiltersForValues(new Map([[filter.value.id.value, filter]]), this.vault.groupStore.getState().valueGroupsByID,
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

        const currentFilter: Field<Filter> | undefined = pendingState.passwordFiltersByID.value.get(filter.id.value) ?? pendingState.valueFiltersByID.value.get(filter.id.value);
        if (!currentFilter)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Delete")
            return false;
        }

        if (filter.type.value == DataType.Passwords)
        {
            pendingState.passwordFiltersByID.removeMapValue(currentFilter.value.id.value);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(filter.id.value, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id.value, pendingState.emptyPasswordFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id.value, pendingState.duplicatePasswordFilters);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (filter.type.value == DataType.NameValuePairs)
        {
            pendingState.valueFiltersByID.removeMapValue(currentFilter.value.id.value);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(filter.id.value, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id.value, pendingState.emptyValueFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id.value, pendingState.duplicateValueFilters);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForPasswords(filtersToSync: Map<string, Field<Filter>>, allGroups: Field<Map<string, Field<Group>>>, pendingState: FilterStoreState,
        passwordFilters: Field<Map<string, Field<Filter>>>)
    {
        const pendingPasswordState = this.vault.passwordStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingPasswordState.passwordsByID.value, "passwords", pendingState.emptyPasswordFilters,
            pendingState.duplicatePasswordFilters, passwordFilters, allGroups, true);

        return pendingPasswordState;
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForValues(filtersToSync: Map<string, Field<Filter>>, allGroups: Field<Map<string, Field<Group>>>, pendingState: FilterStoreState,
        valueFilters: Field<Map<string, Field<Filter>>>)
    {
        const pendingValueState = this.vault.valueStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingValueState.valuesByID.value, "values", pendingState.emptyValueFilters,
            pendingState.duplicateValueFilters, valueFilters, allGroups, true);

        return pendingValueState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForPasswords(passwords: Map<string, Field<ReactivePassword>>, allGroups: Field<Map<string, Field<Group>>>, updatingPassword: boolean,
        pendingFilterStoreState: IFilterStoreState)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterStoreState.passwordFiltersByID.value, passwords, "passwords", pendingFilterStoreState.emptyPasswordFilters,
            pendingFilterStoreState.duplicatePasswordFilters, pendingFilterStoreState.passwordFiltersByID, allGroups, updatingPassword);
    }

    // called externally when adding / updating values 
    syncFiltersForValues(values: Map<string, Field<ReactiveValue>>, allGroups: Field<Map<string, Field<Group>>>, updatingValue: boolean,
        pendingFilterStoreState: IFilterStoreState)
    {
        this.syncFiltersForPrimaryDataObject(pendingFilterStoreState.valueFiltersByID.value, values, "values",
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
        allEmptyFilters: Field<Map<string, Field<string>>>,
        allDuplicateFilters: Field<Map<string, Field<Map<string, Field<string>>>>>,
        allFilters: Field<Map<string, Field<Filter>>>)
    {
        allFilters.value.forEach((v, k, map) =>
        {
            v.value[primaryDataObjectCollection].removeMapValue(primaryObjectID);

            this.checkUpdateEmptySecondaryObject(v.value.id.value, v.value[primaryDataObjectCollection].value, allEmptyFilters);
            this.checkUpdateDuplicateSecondaryObjects(v.value, primaryDataObjectCollection, allDuplicateFilters, allFilters);
        });
    }

    private filterAppliesToDataObject<T extends IGroupable & IFieldObject>(filter: Field<Filter>, dataObject: Field<T>, groups: Field<Map<string, Field<Group>>>): boolean
    {
        // if we don't have any conditions, then default to false so 
        // objects don't get included by default
        let allFilterConditionsApply: boolean = filter.value.conditions.value.size > 0;
        const groupsForObject: Group[] = groups.value.mapWhere((k, v) => dataObject.value.groups.value.has(k), (k, v) => v.value);

        filter.value.conditions.value.forEach(fc =>
        {
            if (allFilterConditionsApply == false)
            {
                return;
            }

            if (fc.value.property.value === "groups")
            {
                switch (fc.value.filterType.value)
                {
                    case FilterConditionType.StartsWith:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase().startsWith(fc.value.value.value.toLowerCase()));
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase().endsWith(fc.value.value.value.toLowerCase()));
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase().includes(fc.value.value.value.toLowerCase()));
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase() == fc.value.value.value.toLowerCase());
                        break;
                    default:
                        allFilterConditionsApply = false;
                }
            }
            else
            {
                switch (fc.value.filterType.value)
                {
                    case FilterConditionType.StartsWith:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject.value[fc.value.property.value]?.value?.toString().toLowerCase().startsWith(fc.value.value.value.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject.value[fc.value.property.value]?.value?.toString().toLowerCase().endsWith(fc.value.value.value.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && (dataObject.value[fc.value.property.value]?.value?.toString().toLowerCase().includes(fc.value.value.value.toLowerCase()) ?? false);
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject.value[fc.value.property.value]?.value?.toString().toLowerCase() == fc.value.value.value.toLowerCase();
                        break;
                    default:
                        allFilterConditionsApply = false;
                }
            }
        });

        return allFilterConditionsApply;
    }

    private syncFiltersForPrimaryDataObject<T extends IFilterable & IIdentifiable & IGroupable & IFieldObject>(
        filtersToSync: Map<string, Field<Filter>>,
        primaryDataObjects: Map<string, Field<T>>,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        currentEmptyFilters: Field<Map<string, Field<string>>>,
        currentDuplicateFilters: Field<Map<string, Field<Map<string, Field<string>>>>>,
        allFilters: Field<Map<string, Field<Filter>>>,
        allGroups: Field<Map<string, Field<Group>>>,
        updatingFilterOrPrimaryDataObject: boolean)
    {
        filtersToSync.forEach((f, k, map) =>
        {
            primaryDataObjects.forEach((v, k) =>
            {
                if (this.filterAppliesToDataObject(f, v, allGroups))
                {
                    if (!v.value.filters.value.has(f.value.id.value))
                    {
                        v.value.filters.addMapValue(f.value.id.value, Field.create(f.value.id.value));
                    }
                    // only want to forceUpdate when updating a filter, password, or value since updating a group
                    // also calls this method, but in that case we don't want the filter to be considered updated
                    else if (updatingFilterOrPrimaryDataObject)
                    {
                        // for change tracking. make sure value is updated in case it is deleted on another device
                        v.value.filters.value.get(f.value.id.value)!.updateAndBubble();
                    }

                    if (!f.value[primaryDataObjectCollection].value.has(v.value.id.value))
                    {
                        f.value[primaryDataObjectCollection].addMapValue(v.value.id.value, Field.create(v.value.id.value));
                    }
                    else if (updatingFilterOrPrimaryDataObject)
                    {
                        // for change tracking. make sure value is updated in case it is deleted on another device
                        f.value[primaryDataObjectCollection].value.get(v.value.id.value)!.updateAndBubble();
                    }
                }
                else
                {
                    if (v.value.filters.value.has(f.value.id.value))
                    {
                        v.value.filters.removeMapValue(f.value.id.value);
                    }

                    if (f.value[primaryDataObjectCollection].value.has(v.value.id.value))
                    {
                        f.value[primaryDataObjectCollection].removeMapValue(v.value.id.value);
                    }
                }
            });

            this.checkUpdateEmptySecondaryObject(f.value.id.value, f.value[primaryDataObjectCollection].value, currentEmptyFilters);
            this.checkUpdateDuplicateSecondaryObjects(f.value, primaryDataObjectCollection, currentDuplicateFilters, allFilters);
        });
    }
}

export class ReactiveFilterStore extends FilterStore 
{
    private internalPasswordFilters: ComputedRef<Field<Filter>[]>;
    private internalActivePasswordFilters: ComputedRef<Field<Filter>[]>;

    private internalNameValuePairFilters: ComputedRef<Field<Filter>[]>;
    private internalActiveNameValuePairFilters: ComputedRef<Field<Filter>[]>;

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

        this.internalPasswordFilters = computed(() => this.state.passwordFiltersByID.value.map((k, v) => v));
        this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.value.isActive.value) ?? []);

        this.internalNameValuePairFilters = computed(() => this.state.valueFiltersByID.value.map((k, v) => v));
        this.internalActiveNameValuePairFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => f.value.isActive.value) ?? []);

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