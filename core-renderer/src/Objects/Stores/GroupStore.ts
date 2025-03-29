import { ComputedRef, Ref, computed, ref } from "vue";
import { PrimarydataTypeStoreStateKeys, SecondaryDataTypeStore, SecondarydataTypeStoreStateKeys } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import { DataType, IGroupable, AtRiskType, Group, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { IIdentifiable, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IPasswordStoreState, PasswordStoreState, PasswordStoreStateKeys } from "./PasswordStore";
import { IValueStoreState, ValueStoreState } from "./ValueStore";
import { FilterStoreState, FilterStoreStateKeys, IFilterStoreState } from "./FilterStore";
import { DictionaryAsList, DoubleKeyedObject, PendingStoreState, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

export interface IGroupStoreState extends StoreState
{
    /** Password Groups By ID */
    p: { [key: string]: Group };
    /** PasswordFiltersByID */
    v: { [key: string]: Group };
    /** Empty Password Groups */
    w: DictionaryAsList;
    /** Empty Value Groups */
    l: DictionaryAsList;
    /** Duplicate Password Groups */
    o: DoubleKeyedObject;
    /** Duplicate Value Groups */
    u: DoubleKeyedObject;
}

const GroupStorePathRetriever: StorePathRetriever<SecondarydataTypeStoreStateKeys> =
{
    'passwordDataTypesByID': (...ids: string[]) => `p`,
    'passwordDataTypesByID.dataType': (...ids: string[]) => `p.${ids[0]}`,
    'passwordDataTypesByID.dataType.passwords': (...ids: string[]) => `p.${ids[0]}.p`,
    'valueDataTypesByID': (...ids: string[]) => 'v',
    'valueDataTypesByID.dataType': (...ids: string[]) => `v.${ids[0]}`,
    'valueDataTypesByID.dataType.values': (...ids: string[]) => `v.${ids[0]}.v`,
    'emptyPasswordDataTypes': (...ids: string[]) => `w`,
    'emptyValueDataTypes': (...ids: string[]) => `l`,
    'duplicatePasswordDataTypes': (...ids: string[]) => `o`,
    'duplicatePasswordDataTypes.dataTypes': (...ids: string[]) => `o.${ids[0]}`,
    'duplicateValueDataTypes': (...ids: string[]) => `u`,
    'duplicateValueDataTypes.dataTypes': (...ids: string[]) => `u.${ids[0]}`,
};

export type GroupStoreState = IGroupStoreState;

export class GroupStore extends SecondaryDataTypeStore<GroupStoreState, SecondarydataTypeStoreStateKeys>
{
    protected internalPasswordGroups: ComputedRef<Group[]>;
    protected internalValueGroups: ComputedRef<Group[]>;

    get passwordGroups() { return this.internalPasswordGroups.value; }
    get valuesGroups() { return this.internalValueGroups.value; }

    constructor(vault: any)
    {
        super(vault, StoreType.Group, GroupStorePathRetriever);

        this.internalPasswordGroups = computed(() => Object.values(this.state.p));
        this.internalValueGroups = computed(() => Object.values(this.state.v));
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

    async addGroup(
        masterKey: string,
        group: Group,
        pendingStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>,
        backup?: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        backup = backup ?? app.isOnline;

        if (group.t == DataType.Passwords)
        {
            const pendingPasswordStoreState = this.vault.passwordStore.getPendingState()!;
            const pendingFilterStoreState = this.vault.filterStore.getPendingState()!;

            if (!await this.addGroupToStores(group, pendingStoreState, pendingFilterStoreState, pendingPasswordStoreState))
            {
                return false;
            }

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordStoreState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);
            transaction.updateVaultStore(this, pendingStoreState);
        }
        else if (group.t == DataType.NameValuePairs)
        {
            const pendingValueStoreState = this.vault.valueStore.getPendingState()!;
            const pendingFilterStoreState = this.vault.filterStore.getPendingState()!;

            if (!await this.addGroupToStores(group, pendingStoreState, pendingFilterStoreState, undefined, pendingValueStoreState))
            {
                return false;
            }

            transaction.updateVaultStore(this.vault.valueStore, pendingValueStoreState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);
            transaction.updateVaultStore(this, pendingStoreState);
        }

        return await transaction.commit(masterKey);
    }

    async addGroupToStores(
        group: Group,
        pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>,
        pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>,
        pendingPasswordStoreState?: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>,
        pendingValueStoreState?: PendingStoreState<ValueStoreState, PrimarydataTypeStoreStateKeys>): Promise<boolean>
    {
        if (group.t == DataType.Passwords)
        {
            group.id = uniqueIDGenerator.generate();
            pendingGroupStoreState.addValue('passwordDataTypesByID', group.id, group);

            if (OH.size(group.p) == 0)
            {
                pendingGroupStoreState.addValue("emptyPasswordDataTypes", group.id, true);
                this.checkUpdateDuplicateSecondaryObjects(group, "p", pendingGroupStoreState.state.o, pendingGroupStoreState.state.p,
                    "duplicatePasswordDataTypes", "duplicatePasswordDataTypes.dataTypes", pendingGroupStoreState);
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "p", new RelatedDataTypeChanges(group.p), pendingPasswordStoreState!.state.p,
                    "dataTypesByID.dataType.groups", "passwordDataTypesByID.dataType.passwords", pendingPasswordStoreState!, pendingGroupStoreState.state.w,
                    pendingGroupStoreState.state.o, pendingGroupStoreState.state.p, 'emptyPasswordDataTypes', "duplicatePasswordDataTypes",
                    "duplicatePasswordDataTypes.dataTypes", pendingGroupStoreState, false);

                this.vault.filterStore.syncFiltersForPasswords(Object.values(pendingPasswordStoreState!.state.p), pendingPasswordStoreState!,
                    pendingGroupStoreState.state.p, pendingFilterStoreState);
            }
        }
        else if (group.t == DataType.NameValuePairs)
        {
            group.id = uniqueIDGenerator.generate();
            pendingGroupStoreState.addValue('valueDataTypesByID', group.id, group);

            if (OH.size(group.p) == 0)
            {
                pendingGroupStoreState.addValue("emptyValueDataTypes", group.id, true);
                this.checkUpdateDuplicateSecondaryObjects(group, "v", pendingGroupStoreState.state.u, pendingGroupStoreState.state.v,
                    "duplicateValueDataTypes", "duplicateValueDataTypes.dataTypes", pendingGroupStoreState);
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "v", new RelatedDataTypeChanges(group.v), pendingValueStoreState!.state.v,
                    "dataTypesByID.dataType.groups", "valueDataTypesByID.dataType.values", pendingPasswordStoreState!, pendingGroupStoreState.state.l,
                    pendingGroupStoreState.state.u, pendingGroupStoreState.state.v, 'emptyValueDataTypes', 'duplicateValueDataTypes',
                    'duplicateValueDataTypes.dataTypes', pendingGroupStoreState, false);

                this.vault.filterStore.syncFiltersForValues(Object.values(pendingValueStoreState!.state.v), pendingValueStoreState!,
                    pendingGroupStoreState.state.v, pendingFilterStoreState);
            }
        }

        return true;
    }

    async updateGroup(
        masterKey: string,
        updatedGroup: Group,
        updatedPrimaryObjects: DictionaryAsList,
        pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);

        let currentGroup = pendingGroupStoreState.state.p[updatedGroup.id] ?? pendingGroupStoreState.state.v[updatedGroup.id];
        if (!currentGroup)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Update")
            return false;
        }

        const primaryObjectCollection = updatedGroup.t == DataType.Passwords ? "p" : "v";

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectChanges = this.getRelatedDataTypeChanges(currentGroup[primaryObjectCollection], updatedPrimaryObjects);

        if (updatedGroup.t == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.getPendingState()!;

            this.syncPrimaryDataObjectsForGroup(updatedGroup, "p", primaryObjectChanges, pendingPasswordState.state.p,
                "dataTypesByID.dataType.groups", "passwordDataTypesByID.dataType.passwords", pendingPasswordState, pendingGroupStoreState.state.w,
                pendingGroupStoreState.state.o, pendingGroupStoreState.state.p, 'emptyPasswordDataTypes', "duplicatePasswordDataTypes",
                "duplicatePasswordDataTypes.dataTypes", pendingGroupStoreState, true);

            const pendingFilterState = this.vault.filterStore.getPendingState()!;
            this.vault.filterStore.syncFiltersForPasswords(Object.values(pendingPasswordState.state.p), pendingPasswordState,
                pendingGroupStoreState.state.p, pendingFilterState);

            pendingGroupStoreState.commitProxyObject("passwordDataTypesByID.dataType", updatedGroup, currentGroup.id);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.t == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.getPendingState()!;

            this.syncPrimaryDataObjectsForGroup(updatedGroup, "v", primaryObjectChanges, pendingValueState.state.v,
                "dataTypesByID.dataType.groups", "valueDataTypesByID.dataType.values", pendingValueState, pendingGroupStoreState.state.l,
                pendingGroupStoreState.state.u, pendingGroupStoreState.state.v, 'emptyValueDataTypes', 'duplicateValueDataTypes',
                'duplicateValueDataTypes.dataTypes', pendingGroupStoreState, true);

            const pendingFilterState = this.vault.filterStore.getPendingState()!;
            this.vault.filterStore.syncFiltersForValues(Object.values(pendingValueState.state.v), pendingValueState,
                pendingGroupStoreState.state.v, pendingFilterState);

            pendingGroupStoreState.commitProxyObject("valueDataTypesByID.dataType", updatedGroup, currentGroup.id);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        transaction.updateVaultStore(this, pendingGroupStoreState);
        return await transaction.commit(masterKey);
    }

    async deleteGroup(masterKey: string, group: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.getPendingState()!;

        if (!pendingState.state.p.has(group.id) && !pendingState.state.v.has(group.id))
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Delete")
            return false;
        }

        if (group.t == DataType.Passwords)
        {
            pendingState.deleteValue('passwordDataTypesByID', group.id);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id, "g", "dataTypesByID.dataType.groups");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.getPendingState()!;
            this.vault.filterStore.syncFiltersForPasswords(Object.values(pendingPasswordState.state.p), pendingPasswordState, pendingState.state.p, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, "emptyPasswordDataTypes", pendingState);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, "duplicatePasswordDataTypes", "duplicatePasswordDataTypes.dataTypes", pendingState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.t == DataType.NameValuePairs)
        {
            pendingState.deleteValue('valueDataTypesByID', group.id);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id, "g", "dataTypesByID.dataType.groups");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.getPendingState()!;
            this.vault.filterStore.syncFiltersForValues(Object.values(pendingValueState.state.v), pendingValueState, pendingState.state.v, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, "emptyValueDataTypes", pendingState);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, "duplicateValueDataTypes", "duplicateValueDataTypes.dataTypes", pendingState);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    syncGroupsForPasswords(
        passwordID: string,
        changedGroups: RelatedDataTypeChanges,
        pendingGroupState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>)
    {
        this.syncGroupsForPrimaryObject(passwordID, "p", changedGroups, pendingGroupState.state.w, pendingGroupState.state.o, pendingGroupState.state.p,
            "passwordDataTypesByID.dataType.passwords", "emptyPasswordDataTypes", "duplicatePasswordDataTypes", "duplicatePasswordDataTypes.dataTypes", pendingGroupState);
    }

    syncGroupsForValues(
        valueID: string,
        changedGroups: RelatedDataTypeChanges,
        pendingGroupState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>)
    {
        this.syncGroupsForPrimaryObject(valueID, "v", changedGroups, pendingGroupState.state.l, pendingGroupState.state.u, pendingGroupState.state.v,
            "valueDataTypesByID.dataType.values", "emptyValueDataTypes", "duplicateValueDataTypes", "duplicateValueDataTypes.dataTypes", pendingGroupState);
    }

    // called when updating a password / value
    private syncGroupsForPrimaryObject(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        changedGroups: RelatedDataTypeChanges,
        currentEmptyGroups: DictionaryAsList,
        currentDuplicateSecondaryObjects: DoubleKeyedObject,
        allSecondaryObjects: { [key: string]: Group },
        pathToSecondaryObjectsOnGroup: keyof SecondarydataTypeStoreStateKeys,
        pathToEmptySecondaryObjects: keyof SecondarydataTypeStoreStateKeys,
        pathToDuplicateDataTypes: keyof SecondarydataTypeStoreStateKeys,
        pathToDuplicateDataTypesDataTypes: keyof SecondarydataTypeStoreStateKeys,
        pendingGroupState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>)
    {
        OH.forEachKey(changedGroups.added, key =>
        {
            const group = allSecondaryObjects[key];
            if (!group)
            {
                return;
            }

            if (!group[primaryDataObjectCollection].has(primaryObjectID))
            {
                pendingGroupState.addValue(pathToSecondaryObjectsOnGroup, primaryObjectID, true, group.id);
            }

            this.checkUpdateEmptySecondaryObject(
                group.id, group[primaryDataObjectCollection], pathToEmptySecondaryObjects, currentEmptyGroups, pendingGroupState);

            this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects, pathToDuplicateDataTypes, pathToDuplicateDataTypesDataTypes, pendingGroupState)
        });

        OH.forEachKey(changedGroups.removed, key =>
        {
            const group = allSecondaryObjects[key];
            if (!group)
            {
                return;
            }

            if (group[primaryDataObjectCollection].has(primaryObjectID))
            {
                pendingGroupState.deleteValue(pathToSecondaryObjectsOnGroup, primaryObjectID, group.id);
            }

            this.checkUpdateEmptySecondaryObject(
                group.id, group[primaryDataObjectCollection], pathToEmptySecondaryObjects, currentEmptyGroups, pendingGroupState);

            this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects, pathToDuplicateDataTypes, pathToDuplicateDataTypesDataTypes, pendingGroupState);
        });
    }

    /**
     * Called when updating a Group
     * @param group Current Group
     * @param primaryDataObjectCollection  Primary Data Objects on this Group, either "p" or "v"
     * @param primaryObjectChanges The current group changes
     * @param allPrimaryObjects  All passwords or values
     * @param pathToSecondaryDataObjectOnPrimaryDataObject Path to groups on Password or Value
     * @param primaryDataObjectStoreState Current pending store state for passwords or values
     * @param currentEmptyGroups Current empty groups, either "emptyPasswordDataTypes" or "emptyValueDataTypes"
     * @param currentDuplicateGroups Current duplicate groups, either "duplicatePasswordDataTypes" or "duplicateValueDataTyeps"
     * @param allSecondaryObjects All password or value groups
     * @param pathToEmptySecondaryObjects Path to the current empty groups
     * @param duplicateDataTypesPath Path to the current duplicate data tyeps
     * @param duplicateDataTypesDataTypesPath Path to the current duplicate data types data types
     * @param pendingGroupState Current pending group store
     */
    private syncPrimaryDataObjectsForGroup<T extends IIdentifiable & IGroupable>(
        group: Group,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        primaryObjectChanges: RelatedDataTypeChanges,
        allPrimaryObjects: { [key: string]: T },
        pathToSecondaryDataObjectOnPrimaryDataObject: keyof PrimarydataTypeStoreStateKeys,
        pathToPrimaryDataObjectOnSecondaryDataObject: keyof SecondarydataTypeStoreStateKeys,
        primaryDataObjectStoreState: PendingStoreState<StoreState, PrimarydataTypeStoreStateKeys>,
        currentEmptyGroups: DictionaryAsList,
        currentDuplicateGroups: DoubleKeyedObject,
        allSecondaryObjects: { [key: string]: Group },
        pathToEmptySecondaryObjects: keyof SecondarydataTypeStoreStateKeys,
        duplicateDataTypesPath: keyof SecondarydataTypeStoreStateKeys,
        duplicateDataTypesDataTypesPath: keyof SecondarydataTypeStoreStateKeys,
        pendingGroupState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>,
        updatingGroup: boolean)
    {
        OH.forEachKey(primaryObjectChanges.added, k =>
        {
            const primaryObject: T | undefined = allPrimaryObjects[k];
            if (primaryObject)
            {
                if (updatingGroup)
                {
                    pendingGroupState.addValue(pathToPrimaryDataObjectOnSecondaryDataObject, k, true, group.id);
                }

                primaryDataObjectStoreState.addValue(pathToSecondaryDataObjectOnPrimaryDataObject, group.id, true, k);
            }
        });

        OH.forEachKey(primaryObjectChanges.removed, k =>
        {
            const primaryObject: T | undefined = allPrimaryObjects[k];
            if (primaryObject)
            {
                if (updatingGroup)
                {
                    pendingGroupState.deleteValue(pathToPrimaryDataObjectOnSecondaryDataObject, k, group.id);
                }

                primaryDataObjectStoreState.deleteValue(pathToSecondaryDataObjectOnPrimaryDataObject, group.id, k);
            }
        });

        this.checkUpdateEmptySecondaryObject(group.id, group[primaryDataObjectCollection], pathToEmptySecondaryObjects, currentEmptyGroups, pendingGroupState);
        this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection, currentDuplicateGroups, allSecondaryObjects, duplicateDataTypesPath,
            duplicateDataTypesDataTypesPath, pendingGroupState);
    }
}

export class ReactiveGroupStore extends GroupStore 
{
    private internalSortedPasswordsGroups: ComputedRef<Group[]>;
    private internalSortedValuesGroups: ComputedRef<Group[]>;

    private internalActiveAtRiskPasswordGroupType: Ref<AtRiskType>;
    private internalActiveAtRiskValueGroupType: Ref<AtRiskType>;

    get passwordGroupsByID() { return this.state.p; }
    get valueGroupsByID() { return this.state.v; }

    get activeAtRiskPasswordGroupType() { return this.internalActiveAtRiskPasswordGroupType.value; }
    get activeAtRiskValueGroupType() { return this.internalActiveAtRiskValueGroupType.value; }

    get emptyPasswordGroups() { return this.state.w; }
    get duplicatePasswordGroups() { return this.state.o; }

    get emptyValueGroups() { return this.state.l; }
    get duplicateValueGroups() { return this.state.u; }

    get sortedPasswordsGroups() { return this.internalSortedPasswordsGroups.value; }
    get sortedValuesGroups() { return this.internalSortedValuesGroups.value }

    constructor(vault: any)
    {
        super(vault);

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.n >= b.n ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.n >= b.n ? 1 : -1));

        this.internalActiveAtRiskPasswordGroupType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueGroupType = ref(AtRiskType.None);
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordGroupType;
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueGroupType;
    }
}