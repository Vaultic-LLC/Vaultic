import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, StoreState } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import { api } from "../../API";
import { DataType, IGroupable, AtRiskType, Group, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { Field, FieldTreeUtility, IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IPasswordStoreState } from "./PasswordStore";
import { IValueStoreState } from "./ValueStore";
import { IFilterStoreState } from "./FilterStore";
import { defaultGroupStoreState } from "@vaultic/shared/Types/Stores";

export interface IGroupStoreState extends StoreState
{
    passwordGroupsByID: Field<Map<string, Field<Group>>>;
    valueGroupsByID: Field<Map<string, Field<Group>>>
    emptyPasswordGroups: Field<Map<string, Field<string>>>;
    emptyValueGroups: Field<Map<string, Field<string>>>;
    duplicatePasswordGroups: Field<Map<string, Field<Map<string, Field<string>>>>>;
    duplicateValueGroups: Field<Map<string, Field<Map<string, Field<string>>>>>;
}

export type GroupStoreState = KnownMappedFields<IGroupStoreState>;

export class GroupStore extends SecondaryDataTypeStore<GroupStoreState>
{
    protected internalPasswordGroups: ComputedRef<Field<Group>[]>;
    protected internalValueGroups: ComputedRef<Field<Group>[]>;

    get passwordGroups() { return this.internalPasswordGroups.value; }
    get valuesGroups() { return this.internalValueGroups.value; }

    constructor(vault: any)
    {
        super(vault, "groupStoreState");

        this.internalPasswordGroups = computed(() => this.state.passwordGroupsByID.value.map((k, v) => v));
        this.internalValueGroups = computed(() => this.state.valueGroupsByID.value.map((k, v) => v));
    }

    protected defaultState()
    {
        return defaultGroupStoreState;
    }

    async addGroup(masterKey: string, group: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        if (group.type.value == DataType.Passwords)
        {
            const pendingGroupStoreState = this.cloneState();
            const pendingPasswordStoreState = this.vault.passwordStore.cloneState();
            const pendingFilterStoreState = this.vault.filterStore.cloneState();

            if (!await this.addGroupToStores(group, pendingGroupStoreState, pendingFilterStoreState, pendingPasswordStoreState))
            {
                return false;
            }

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordStoreState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);
            transaction.updateVaultStore(this, pendingGroupStoreState);
        }
        else if (group.type.value == DataType.NameValuePairs)
        {

        }

        return await transaction.commit(masterKey);
    }

    async addGroupToStores(group: Group, pendingGroupStoreState: IGroupStoreState, pendingFilterStoreState: IFilterStoreState,
        pendingPasswordStoreState?: IPasswordStoreState, pendingValueStoreState?: IValueStoreState): Promise<boolean>
    {
        if (group.type.value == DataType.Passwords)
        {
            group.id.value = uniqueIDGenerator.generate();

            const groupField = Field.create(group);
            pendingGroupStoreState.passwordGroupsByID.addMapValue(group.id.value, groupField);

            if (group.passwords.value.size == 0)
            {
                pendingGroupStoreState.emptyPasswordGroups.addMapValue(group.id.value, Field.create(group.id.value));
                this.checkUpdateDuplicateSecondaryObjects(group, "passwords", pendingGroupStoreState.duplicatePasswordGroups, pendingGroupStoreState.passwordGroupsByID)
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "passwords", new RelatedDataTypeChanges(group.passwords.value),
                    pendingPasswordStoreState!.passwordsByID, pendingGroupStoreState.emptyPasswordGroups, pendingGroupStoreState.duplicatePasswordGroups,
                    pendingGroupStoreState.passwordGroupsByID);

                this.vault.filterStore.syncFiltersForPasswords(pendingPasswordStoreState!.passwordsByID.value, pendingGroupStoreState.passwordGroupsByID, false,
                    pendingFilterStoreState);
            }
        }
        else if (group.type.value == DataType.NameValuePairs)
        {
            group.id.value = uniqueIDGenerator.generate();

            const groupField = Field.create(group);
            pendingGroupStoreState.valueGroupsByID.addMapValue(group.id.value, groupField);

            if (group.values.value.size == 0)
            {
                pendingGroupStoreState.emptyValueGroups.addMapValue(group.id.value, Field.create(group.id.value));
                this.checkUpdateDuplicateSecondaryObjects(group, "values", pendingGroupStoreState.duplicateValueGroups, pendingGroupStoreState.valueGroupsByID)
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "values", new RelatedDataTypeChanges(group.values.value), pendingValueStoreState!.valuesByID,
                    pendingGroupStoreState.emptyValueGroups, pendingGroupStoreState.duplicateValueGroups, pendingGroupStoreState.valueGroupsByID);

                this.vault.filterStore.syncFiltersForValues(pendingValueStoreState!.valuesByID.value, pendingGroupStoreState.valueGroupsByID, false,
                    pendingFilterStoreState);
            }
        }

        return true;
    }

    async updateGroup(masterKey: string, updatedGroup: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentGroup = pendingState.passwordGroupsByID.value.get(updatedGroup.id.value) ?? pendingState.valueGroupsByID.value.get(updatedGroup.id.value);
        if (!currentGroup)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Update")
            return false;
        }

        const primaryObjectCollection = updatedGroup.type.value == DataType.Passwords ? "passwords" : "values";

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectChanges = this.getRelatedDataTypeChanges(currentGroup.value[primaryObjectCollection].value, updatedGroup[primaryObjectCollection].value);

        if (updatedGroup.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingPasswordState.passwordsByID, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                pendingState.passwordGroupsByID);

            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID, false, pendingFilterState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingValueState.valuesByID, pendingState.emptyValueGroups, pendingState.duplicateValueGroups,
                pendingState.valueGroupsByID);

            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID, false, pendingFilterState);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        currentGroup.value = updatedGroup;
        transaction.updateVaultStore(this, pendingState);

        return await transaction.commit(masterKey);
    }

    async deleteGroup(masterKey: string, group: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (!pendingState.passwordGroupsByID.value.has(group.id.value) && !pendingState.valueGroupsByID.value.has(group.id.value))
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Delete")
            return false;
        }

        if (group.type.value == DataType.Passwords)
        {
            pendingState.passwordGroupsByID.removeMapValue(group.id.value);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id.value, "groups");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID, false, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id.value, pendingState.emptyPasswordGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id.value, pendingState.duplicatePasswordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.type.value == DataType.NameValuePairs)
        {
            pendingState.valueGroupsByID.removeMapValue(group.id.value);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id.value, "groups");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID, false, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id.value, pendingState.emptyValueGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id.value, pendingState.duplicateValueGroups);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    syncGroupsForPasswords(passwordID: string, changedGroups: RelatedDataTypeChanges, pendingGroupState: IGroupStoreState)
    {
        this.syncGroupsForPrimaryObject(passwordID, "passwords", changedGroups, pendingGroupState.emptyPasswordGroups, pendingGroupState.duplicatePasswordGroups, pendingGroupState.passwordGroupsByID);
    }

    syncGroupsForValues(valueID: string, changedGroups: RelatedDataTypeChanges, pendingGroupState: IGroupStoreState)
    {
        this.syncGroupsForPrimaryObject(valueID, "values", changedGroups, pendingGroupState.emptyValueGroups, pendingGroupState.duplicateValueGroups, pendingGroupState.valueGroupsByID);
    }

    // called when updating a password / value
    private syncGroupsForPrimaryObject(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        changedGroups: RelatedDataTypeChanges,
        currentEmptyGroups: Field<Map<string, Field<string>>>,
        currentDuplicateSecondaryObjects: Field<Map<string, Field<Map<string, Field<string>>>>>,
        allSecondaryObjects: Field<Map<string, Field<Group>>>)
    {
        changedGroups.added.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.value.get(key);
            if (!group)
            {
                return;
            }

            if (!group.value[primaryDataObjectCollection].value.has(primaryObjectID))
            {
                group.value[primaryDataObjectCollection].addMapValue(primaryObjectID, Field.create(primaryObjectID));
            }

            this.checkUpdateEmptySecondaryObject(
                group.value.id.value, group.value[primaryDataObjectCollection].value, currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(group.value, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        changedGroups.removed.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.value.get(key);
            if (!group)
            {
                return;
            }

            if (group.value[primaryDataObjectCollection].value.has(primaryObjectID))
            {
                group.value[primaryDataObjectCollection].removeMapValue(primaryObjectID);
            }

            this.checkUpdateEmptySecondaryObject(
                group.value.id.value, group.value[primaryDataObjectCollection].value, currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(group.value, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        changedGroups.unchanged.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.value.get(key);
            if (!group)
            {
                return;
            }

            if (group.value[primaryDataObjectCollection].value.has(primaryObjectID))
            {
                group.value[primaryDataObjectCollection].value.get(primaryObjectID)!.updateAndBubble();
            }
        });
    }

    // Called when updating a Group
    private syncPrimaryDataObjectsForGroup<T extends IIdentifiable & IGroupable>(
        group: Group,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        primaryObjectChanges: RelatedDataTypeChanges,
        allPrimaryObjects: Field<Map<string, Field<T>>>,
        currentEmptyGroups: Field<Map<string, Field<string>>>,
        currentDuplicateGroups: Field<Map<string, Field<Map<string, Field<string>>>>>,
        allSecondaryObjects: Field<Map<string, Field<Group>>>)
    {
        primaryObjectChanges.added.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.addMapValue(group.id.value, Field.create(group.id.value));
            }
        });

        primaryObjectChanges.removed.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.removeMapValue(group.id.value);
            }
        });

        primaryObjectChanges.unchanged.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.value.get(group.id.value)!.updateAndBubble();
            }
        });

        this.checkUpdateEmptySecondaryObject(group.id.value, group[primaryDataObjectCollection].value, currentEmptyGroups);
        this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection, currentDuplicateGroups, allSecondaryObjects)
    }
}

export class ReactiveGroupStore extends GroupStore 
{
    private internalSortedPasswordsGroups: ComputedRef<Field<Group>[]>;
    private internalSortedValuesGroups: ComputedRef<Field<Group>[]>;

    private internalActiveAtRiskPasswordGroupType: Ref<AtRiskType>;
    private internalActiveAtRiskValueGroupType: Ref<AtRiskType>;

    get passwordGroupsByID() { return this.state.passwordGroupsByID; }
    get valueGroupsByID() { return this.state.valueGroupsByID; }

    get activeAtRiskPasswordGroupType() { return this.internalActiveAtRiskPasswordGroupType.value; }
    get activeAtRiskValueGroupType() { return this.internalActiveAtRiskValueGroupType.value; }

    get emptyPasswordGroups() { return this.state.emptyPasswordGroups; }
    get duplicatePasswordGroups() { return this.state.duplicatePasswordGroups; }

    get emptyValueGroups() { return this.state.emptyValueGroups; }
    get duplicateValueGroups() { return this.state.duplicateValueGroups; }

    get sortedPasswordsGroups() { return this.internalSortedPasswordsGroups.value; }
    get sortedValuesGroups() { return this.internalSortedValuesGroups.value }

    constructor(vault: any)
    {
        super(vault);

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.value.name.value >= b.value.name.value ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.value.name.value >= b.value.name.value ? 1 : -1));

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