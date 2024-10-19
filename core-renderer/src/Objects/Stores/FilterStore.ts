import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { Group, Filter, DataType, Password, NameValuePair, IGroupable, FilterConditionType, IFilterable, IIdentifiable, AtRiskType } from "../../Types/DataTypes";
import { PrimaryDataObjectCollection } from "../../Types/Fields";

export interface FilterStoreState extends DataTypeStoreState<Filter>
{
    emptyPasswordFilters: string[];
    emptyValueFilters: string[];
    duplicatePasswordFilters: Dictionary<string[]>;
    duplicateValueFilters: Dictionary<string[]>;
}

export class FilterStore extends SecondaryDataTypeStore<Filter, FilterStoreState>
{
    constructor(vault: any)
    {
        super(vault, "filterStoreState");
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

    toggleFilter(id: string): boolean | undefined
    {
        const filterIndex: number = this.state.values.findIndex(f => f.id.value == id);
        if (filterIndex >= 0)
        {
            this.state.values[filterIndex].isActive.value = !this.state.values[filterIndex].isActive.value;
            return this.state.values[filterIndex].isActive.value;
        }

        return undefined;
    }

    async addFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        filter.id.value = await generateUniqueID(pendingState.values);
        pendingState.values.push(filter);

        if (filter.type.value == DataType.Passwords)
        {
            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingPasswordState = this.syncSpecificFiltersForPasswords([filter], this.vault.groupStore.passwordGroups, pendingState);
            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else
        {
            // don't need to create a pending group store since the groups aren't actually being changed
            const pendingValueState = this.syncSpecificFiltersForValues([filter], this.vault.groupStore.valuesGroups, pendingState);
            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async updateFilter(masterKey: string, updatedFilter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let filter: Filter[] = pendingState.values.filter(f => f.id.value == updatedFilter.id.value);
        if (filter.length != 1)
        {
            await api.repositories.logs.log(undefined, `Invalid Filter Length: ${filter.length}`, "FilterStore.Update")
            return false;
        }

        Object.assign(filter[0], updatedFilter);
        if (updatedFilter.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.syncSpecificFiltersForPasswords([updatedFilter], this.vault.groupStore.passwordGroups, pendingState);
            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (updatedFilter.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.syncSpecificFiltersForValues([updatedFilter], this.vault.groupStore.valuesGroups, pendingState);
            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async deleteFilter(masterKey: string, filter: Filter): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const filterIndex = pendingState.values.findIndex(f => f.id.value == filter.id.value);
        if (filterIndex < 0)
        {
            await api.repositories.logs.log(undefined, `No Filter`, "FilterStore.Delete")
            return false;
        }

        pendingState.values.splice(filterIndex, 1);

        if (filter.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(filter.id.value, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id.value, pendingState.emptyPasswordFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id.value, pendingState.duplicatePasswordFilters);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
        }
        else if (filter.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(filter.id.value, "filters");

            this.removeSeconaryObjectFromEmptySecondaryObjects(filter.id.value, pendingState.emptyValueFilters);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(filter.id.value, pendingState.duplicateValueFilters);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForPasswords(filtersToSync: Filter[], allGroups: Group[], pendingState: FilterStoreState)
    {
        const pendingPasswordState = this.vault.passwordStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingPasswordState.values, "passwords", pendingState.emptyPasswordFilters,
            pendingState.duplicatePasswordFilters, pendingState.values.filter(f => f.type.value == DataType.Passwords), allGroups);

        return pendingPasswordState;
    }

    // called internally when adding / updating a filter to sync passwords
    private syncSpecificFiltersForValues(filtersToSync: Filter[], allGroups: Group[], pendingState: FilterStoreState)
    {
        const pendingValueState = this.vault.valueStore.cloneState();

        this.syncFiltersForPrimaryDataObject(filtersToSync, pendingValueState.values, "values", pendingState.emptyValueFilters,
            pendingState.duplicateValueFilters, pendingState.values.filter(f => f.type.value == DataType.NameValuePairs), allGroups);

        return pendingValueState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForPasswords(passwords: Password[], allGroups: Group[])
    {
        const pendingState = this.cloneState();
        const passwordFilters = pendingState.values.filter(f => f.type.value == DataType.Passwords);

        this.syncFiltersForPrimaryDataObject(passwordFilters, passwords, "passwords", pendingState.emptyPasswordFilters,
            pendingState.duplicatePasswordFilters, passwordFilters, allGroups);

        return pendingState;
    }

    // called externally when adding / updating passwords 
    syncFiltersForValues(values: NameValuePair[], allGroups: Group[])
    {
        const pendingState = this.cloneState();
        const valueFilters = pendingState.values.filter(f => f.type.value == DataType.NameValuePairs);

        this.syncFiltersForPrimaryDataObject(valueFilters, values, "values",
            pendingState.emptyValueFilters, pendingState.duplicateValueFilters, valueFilters, allGroups);

        return pendingState;
    }

    removePasswordFromFilters(passwordID: string)
    {
        const pendingState = this.cloneState();
        this.removePrimaryObjectFromValues(passwordID, "passwords", pendingState.emptyPasswordFilters,
            pendingState.duplicatePasswordFilters, pendingState.values.filter(f => f.type.value == DataType.Passwords));

        return pendingState;
    }

    removeValuesFromFilters(valueID: string)
    {
        const pendingState = this.cloneState();
        this.removePrimaryObjectFromValues(valueID, "values", pendingState.emptyValueFilters,
            pendingState.duplicateValueFilters, pendingState.values.filter(f => f.type.value == DataType.NameValuePairs));

        return pendingState;
    }

    private removePrimaryObjectFromValues(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        allEmptyFilters: string[],
        allDuplicateFilters: Dictionary<string[]>,
        allFilters: Filter[])
    {
        allFilters.forEach(v =>
        {
            const primaryObjectIndex = v[primaryDataObjectCollection].value.indexOf(primaryObjectID);
            if (primaryObjectIndex >= 0)
            {
                v[primaryDataObjectCollection].value.splice(primaryObjectIndex, 1);
            }

            this.checkUpdateEmptySecondaryObject(v.id.value, v[primaryDataObjectCollection].value, allEmptyFilters);
            this.checkUpdateDuplicateSecondaryObjects(v, primaryDataObjectCollection, allDuplicateFilters, allFilters);
        });
    }

    private filterAppliesToDataObject<T extends IGroupable>(filter: Filter, dataObject: T, groups: Group[]): boolean
    {
        // if we don't have any conditions, then default to false so 
        // objects don't get included by default
        let allFilterConditionsApply: boolean = filter.conditions.value.length > 0;
        const groupsForObject: Group[] = groups.filter(g => dataObject.groups.value.includes(g.id.value));

        filter.conditions.value.forEach(fc =>
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
                        allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].value.toString().toLowerCase().startsWith(fc.value.toLowerCase());
                        break;
                    case FilterConditionType.EndsWith:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].value.toString().toLowerCase().endsWith(fc.value.toLowerCase());
                        break;
                    case FilterConditionType.Contains:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].value.toString().toLowerCase().includes(fc.value.toLowerCase());
                        break;
                    case FilterConditionType.EqualTo:
                        allFilterConditionsApply = allFilterConditionsApply && dataObject[fc.property].value.toString().toLowerCase() == fc.value.toLowerCase();
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
                    if (!p.filters.value.includes(f.id.value))
                    {
                        p.filters.value.push(f.id.value);
                    }

                    if (!f[primaryDataObjectCollection].value.includes(p.id.value))
                    {
                        f[primaryDataObjectCollection].value.push(p.id.value);
                    }
                }
                else
                {
                    const filterIndex: number = p.filters.value.indexOf(f.id.value);
                    if (filterIndex >= 0)
                    {
                        p.filters.value.splice(filterIndex, 1);
                    }

                    const objectIndex: number = f[primaryDataObjectCollection].value.indexOf(p.id.value);
                    if (objectIndex >= 0)
                    {
                        f[primaryDataObjectCollection].value.splice(objectIndex, 1);
                    }
                }
            });

            this.checkUpdateEmptySecondaryObject(f.id.value, f[primaryDataObjectCollection].value, currentEmptyFilters);
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

    constructor(vault: VaultStoreParameter)
    {
        super(vault);

        this.internalPasswordFilters = computed(() => this.state.values.filter(f => f.type.value == DataType.Passwords));
        this.internalActivePasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => f.isActive.value) ?? []);

        this.internalNameValuePairFilters = computed(() => this.state.values.filter(f => f.type.value == DataType.NameValuePairs));
        this.internalActiveNameValuePairFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => f.isActive.value) ?? []);

        this.internalDuplicatePasswordFiltersLength = computed(() => Object.keys(this.state.duplicatePasswordFilters).length);
        this.internalDuplicateValueFiltersLength = computed(() => Object.keys(this.state.duplicateValueFilters).length);

        this.internalActiveAtRiskPasswordFilterType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueFilterType = ref(AtRiskType.None);

        this.internalPinnedPasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => this.vault.vaultPreferencesStore.pinnedFilters.hasOwnProperty(f.id.value)));
        this.internalUnpinnedPasswordFilters = computed(() => this.internalPasswordFilters.value.filter(f => !this.vault.vaultPreferencesStore.pinnedFilters.hasOwnProperty(f.id.value)));

        this.internalPinnedValueFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => this.vault.vaultPreferencesStore.pinnedFilters.hasOwnProperty(f.id.value)));
        this.internalUnpinnedValueFilters = computed(() => this.internalNameValuePairFilters.value.filter(f => !this.vault.vaultPreferencesStore.pinnedFilters.hasOwnProperty(f.id.value)));
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