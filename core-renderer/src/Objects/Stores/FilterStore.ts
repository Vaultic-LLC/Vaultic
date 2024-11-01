import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, StoreState } from "./Base";
import { generateUniqueIDForMap } from "../../Helpers/generatorHelper";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Group, Filter, DataType, IGroupable, FilterConditionType, IFilterable, AtRiskType, DuplicateDataTypes } from "../../Types/DataTypes";
import app from "./AppStore";
import { Field, IFieldObject, IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { ReactivePassword } from "./ReactivePassword";
import { ReactiveValue } from "./ReactiveValue";

interface IFilterStoreState extends StoreState
{
    passwordFiltersByID: Field<Map<string, Field<Filter>>>;
    valueFiltersByID: Field<Map<string, Field<Filter>>>;
    emptyPasswordFilters: Field<Map<string, Field<string>>>;
    emptyValueFilters: Field<Map<string, Field<string>>>;
    duplicatePasswordFilters: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>;
    duplicateValueFilters: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>;
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
            passwordFiltersByID: new Field(new Map<string, Field<Filter>>()),
            valueFiltersByID: new Field(new Map<string, Field<Filter>>()),
            emptyPasswordFilters: new Field(new Map<string, Field<string>>()),
            emptyValueFilters: new Field(new Map<string, Field<string>>()),
            duplicatePasswordFilters: new Field(new Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>()),
            duplicateValueFilters: new Field(new Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>()),
        }
    }

    async toggleFilter(id: string): Promise<undefined>
    {
        let filter: Field<Filter> | undefined = this.state.passwordFiltersByID.value.get(id) ?? this.state.valueFiltersByID.value.get(id);
        if (!filter)
        {
            await api.repositories.logs.log(undefined, `Unable to find filter: ${id} to toggle`, "toggleFilter");
            return;
        }

        filter.value.isActive.value = filter.value.isActive.value;
    }

    async addFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (filter.type.value == DataType.Passwords)
        {
            filter.id.value = await generateUniqueIDForMap(pendingState.passwordFiltersByID.value);

            const filterField = new Field(filter);
            pendingState.passwordFiltersByID.value.set(filter.id.value, filterField);

            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingPasswordState = this.syncSpecificFiltersForPasswords(new Map([[filter.id.value, filterField]]), this.vault.groupStore.getState().passwordGroupsByID,
                pendingState, pendingState.passwordFiltersByID);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else
        {
            filter.id.value = await generateUniqueIDForMap(pendingState.valueFiltersByID.value);

            const filterField = new Field(filter);
            pendingState.valueFiltersByID.value.set(filter.id.value, filterField);

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
            pendingState.passwordFiltersByID.value.delete(currentFilter.value.id.value);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(filter.id.value, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id.value, pendingState.emptyPasswordFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id.value, pendingState.duplicatePasswordFilters);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (filter.type.value == DataType.NameValuePairs)
        {
            pendingState.valueFiltersByID.value.delete(currentFilter.value.id.value);
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
            pendingState.duplicatePasswordFilters, passwordFilters, allGroups);

        return pendingPasswordState;
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForValues(filtersToSync: Map<string, Field<Filter>>, allGroups: Field<Map<string, Field<Group>>>, pendingState: FilterStoreState,
        valueFilters: Field<Map<string, Field<Filter>>>)
    {
        const pendingValueState = this.vault.valueStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingValueState.valuesByID.value, "values", pendingState.emptyValueFilters,
            pendingState.duplicateValueFilters, valueFilters, allGroups);

        return pendingValueState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForPasswords(passwords: Map<string, Field<ReactivePassword>>, allGroups: Field<Map<string, Field<Group>>>)
    {
        const pendingState = this.cloneState();

        this.syncFiltersForPrimaryDataObject(pendingState.passwordFiltersByID.value, passwords, "passwords", pendingState.emptyPasswordFilters,
            pendingState.duplicatePasswordFilters, pendingState.passwordFiltersByID, allGroups);

        return pendingState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForValues(values: Map<string, Field<ReactiveValue>>, allGroups: Field<Map<string, Field<Group>>>)
    {
        const pendingState = this.cloneState();

        this.syncFiltersForPrimaryDataObject(pendingState.valueFiltersByID.value, values, "values",
            pendingState.emptyValueFilters, pendingState.duplicateValueFilters, pendingState.valueFiltersByID, allGroups);

        return pendingState;
    }

    removePasswordFromFilters(passwordID: string)
    {
        const pendingState = this.cloneState();
        this.removePrimaryObjectFromValues(passwordID, "passwords", pendingState.emptyPasswordFilters, pendingState.duplicatePasswordFilters, pendingState.passwordFiltersByID);

        return pendingState;
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
        allDuplicateFilters: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>,
        allFilters: Field<Map<string, Field<Filter>>>)
    {
        allFilters.value.forEach((v, k, map) =>
        {
            v.value[primaryDataObjectCollection].value.delete(primaryObjectID);

            this.checkUpdateEmptySecondaryObject(v.value.id.value, v.value[primaryDataObjectCollection].value, allEmptyFilters);
            this.checkUpdateDuplicateSecondaryObjects(v.value, primaryDataObjectCollection, allDuplicateFilters, allFilters);
        });
    }

    private filterAppliesToDataObject<T extends IGroupable & IFieldObject>(filter: Field<Filter>, dataObject: Field<T>, groups: Field<Map<string, Field<Group>>>): boolean
    {
        // if we don't have any conditions, then default to false so 
        // objects don't get included by default
        let allFilterConditionsApply: boolean = filter.value.conditions.value.length > 0;
        const groupsForObject: Group[] = groups.value.mapWhere((k, v) => dataObject.value.groups.value.has(k), (k, v) => v.value);

        filter.value.conditions.value.forEach(fc =>
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
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase().startsWith(fc.value.toLowerCase()));
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase().endsWith(fc.value.toLowerCase()));
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase().includes(fc.value.toLowerCase()));
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && groupsForObject.some(g => g.name.value.toLowerCase() == fc.value.toLowerCase());
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
                        allFilterConditionsApply = allFilterConditionsApply && dataObject.value[fc.property].value.toString().toLowerCase().startsWith(fc.value.toLowerCase());
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject.value[fc.property].value.toString().toLowerCase().endsWith(fc.value.toLowerCase());
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject.value[fc.property].value.toString().toLowerCase().includes(fc.value.toLowerCase());
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject.value[fc.property].value.toString().toLowerCase() == fc.value.toLowerCase();
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
        currentDuplicateFilters: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>,
        allFilters: Field<Map<string, Field<Filter>>>,
        allGroups: Field<Map<string, Field<Group>>>)
    {
        filtersToSync.forEach((f, k, map) =>
        {
            primaryDataObjects.forEach((v, k) =>
            {
                if (this.filterAppliesToDataObject(f, v, allGroups))
                {
                    v.value.filters.value.set(f.value.id.value, new Field(f.value.id.value));
                    if (!f.value[primaryDataObjectCollection].value.has(v.value.id.value))
                    {
                        f.value[primaryDataObjectCollection].value.set(v.value.id.value, new Field(v.value.id.value));
                    }
                }
                else
                {
                    v.value.filters.value.delete(f.value.id.value);
                    if (f.value[primaryDataObjectCollection].value.has(v.value.id.value))
                    {
                        f.value[primaryDataObjectCollection].value.delete(v.value.id.value);
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

    private internalPinnedPasswordFilters: ComputedRef<Field<Filter>[]>;
    private internalUnpinnedPasswordFilters: ComputedRef<Field<Filter>[]>;

    private internalPinnedValueFilters: ComputedRef<Field<Filter>[]>;
    private internalUnpinnedValueFilters: ComputedRef<Field<Filter>[]>;

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

    get pinnedPasswordFilters() { return this.internalPinnedPasswordFilters.value; }
    get unpinnedPasswordFilters() { return this.internalUnpinnedPasswordFilters.value; }

    get pinnedValueFilters() { return this.internalPinnedValueFilters.value; }
    get unpinnedValueFitlers() { return this.internalUnpinnedValueFilters.value; }

    constructor(vault: VaultStoreParameter)
    {
        super(vault);

        this.internalPasswordFilters = computed(() => this.state.passwordFiltersByID.value.map((k, v) => v));
        this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.value.isActive) ?? []);

        this.internalNameValuePairFilters = computed(() => this.state.valueFiltersByID.value.map((k, v) => v));
        this.internalActiveNameValuePairFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => f.value.isActive) ?? []);

        this.internalActiveAtRiskPasswordFilterType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueFilterType = ref(AtRiskType.None);

        this.internalPinnedPasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => app.userPreferences.pinnedFilters.value.has(f.value.id.value)));
        this.internalUnpinnedPasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => !app.userPreferences.pinnedFilters.value.has(f.value.id.value)));

        this.internalPinnedValueFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => app.userPreferences.pinnedFilters.value.has(f.value.id.value)));
        this.internalUnpinnedValueFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => !app.userPreferences.pinnedFilters.value.has(f.value.id.value)));
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