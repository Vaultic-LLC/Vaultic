import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, StoreState } from "./Base";
import { generateUniqueIDForMap } from "../../Helpers/generatorHelper";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { api } from "../../API";
import { DataType, IGroupable, AtRiskType, Group, DuplicateDataTypes, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { Field, IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";

export interface IGroupStoreState extends StoreState
{
    passwordGroupsByID: Field<Map<string, Field<Group>>>;
    valueGroupsByID: Field<Map<string, Field<Group>>>
    emptyPasswordGroups: Field<Map<string, Field<string>>>;
    emptyValueGroups: Field<Map<string, Field<string>>>;
    duplicatePasswordGroups: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>;
    duplicateValueGroups: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>;
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
        return {
            version: new Field(0),
            passwordGroupsByID: new Field(new Map<string, Field<Group>>()),
            valueGroupsByID: new Field(new Map<string, Field<Group>>()),
            emptyPasswordGroups: new Field(new Map<string, Field<string>>()),
            emptyValueGroups: new Field(new Map<string, Field<string>>()),
            duplicatePasswordGroups: new Field(new Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>()),
            duplicateValueGroups: new Field(new Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>()),
        }
    }

    async addGroup(masterKey: string, group: Group, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (group.type.value == DataType.Passwords)
        {
            group.id.value = await generateUniqueIDForMap(pendingState.passwordGroupsByID.value);

            const groupField = new Field(group);
            pendingState.passwordGroupsByID.value.set(group.id.value, groupField);

            if (group.passwords.value.size == 0)
            {
                pendingState.emptyPasswordGroups.value.set(group.id.value, new Field(group.id.value));
                this.checkUpdateDuplicateSecondaryObjects(group, "passwords", pendingState.duplicatePasswordGroups, pendingState.passwordGroupsByID)
            }
            else
            {
                const pendingPasswordState = this.vault.passwordStore.cloneState();

                this.syncPrimaryDataObjectsForGroup(group, "passwords", new RelatedDataTypeChanges(group.passwords.value),
                    pendingPasswordState.passwordsByID, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                    pendingState.passwordGroupsByID);

                const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID, false);

                transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
                transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
            }
        }
        else if (group.type.value == DataType.NameValuePairs)
        {
            group.id.value = await generateUniqueIDForMap(pendingState.valueGroupsByID.value);

            const groupField = new Field(group);
            pendingState.valueGroupsByID.value.set(group.id.value, groupField);

            if (group.values.value.size == 0)
            {
                pendingState.emptyValueGroups.value.set(group.id.value, new Field(group.id.value));
                this.checkUpdateDuplicateSecondaryObjects(group, "values", pendingState.duplicateValueGroups, pendingState.valueGroupsByID)
            }
            else
            {
                const pendingValueState = this.vault.valueStore.cloneState();

                this.syncPrimaryDataObjectsForGroup(group, "values", new RelatedDataTypeChanges(group.values.value), pendingValueState.valuesByID,
                    pendingState.emptyValueGroups, pendingState.duplicateValueGroups, pendingState.valueGroupsByID);

                const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID, false);

                transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
                transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
            }
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey, backup);
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

            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID, false);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingValueState.valuesByID, pendingState.emptyValueGroups, pendingState.duplicateValueGroups,
                pendingState.valueGroupsByID);

            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID, false);

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
            pendingState.passwordGroupsByID.value.delete(group.id.value);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id.value, "groups");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID, false);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id.value, pendingState.emptyPasswordGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id.value, pendingState.duplicatePasswordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.type.value == DataType.NameValuePairs)
        {
            pendingState.valueGroupsByID.value.delete(group.id.value);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id.value, "groups");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID, false);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id.value, pendingState.emptyValueGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id.value, pendingState.duplicateValueGroups);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    syncGroupsForPasswords(passwordID: string, changedGroups: RelatedDataTypeChanges)
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(passwordID, "passwords", changedGroups, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups, pendingState.passwordGroupsByID);

        return pendingState;
    }

    syncGroupsForValues(
        valueID: string, changedGroups: RelatedDataTypeChanges)
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(valueID, "values", changedGroups, pendingState.emptyValueGroups, pendingState.duplicateValueGroups, pendingState.valueGroupsByID);

        return pendingState;
    }

    // called when updating a password / value
    private syncGroupsForPrimaryObject(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        changedGroups: RelatedDataTypeChanges,
        currentEmptyGroups: Field<Map<string, Field<string>>>,
        currentDuplicateSecondaryObjects: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>,
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
                group.value[primaryDataObjectCollection].value.set(primaryObjectID, new Field(primaryObjectID));
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
                group.value[primaryDataObjectCollection].value.delete(primaryObjectID);
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
                group.value[primaryDataObjectCollection].value.get(primaryObjectID)!.forceUpdate = true;
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
        currentDuplicateGroups: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>,
        allSecondaryObjects: Field<Map<string, Field<Group>>>)
    {
        primaryObjectChanges.added.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.value.set(group.id.value, new Field(group.id.value));
            }
        });

        primaryObjectChanges.removed.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.value.delete(group.id.value);
            }
        });

        primaryObjectChanges.unchanged.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.value.get(group.id.value)!.forceUpdate = true;
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