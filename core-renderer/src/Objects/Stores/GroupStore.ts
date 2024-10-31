import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, StoreState } from "./Base";
import { generateUniqueIDForMap } from "../../Helpers/generatorHelper";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { DataType, IGroupable, AtRiskType, Group } from "../../Types/DataTypes";
import { Field, IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";

export interface IGroupStoreState extends StoreState
{
    passwordGroupsByID: Field<Map<string, Field<Group>>>;
    valueGroupsByID: Field<Map<string, Field<Group>>>
    emptyPasswordGroups: string[];
    emptyValueGroups: string[];
    duplicatePasswordGroups: Dictionary<string[]>;
    duplicateValueGroups: Dictionary<string[]>;
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
            passwordGroupsByID: new Field(new Map<string, Field<Group>>()),
            valueGroupsByID: new Field(new Map<string, Field<Group>>()),
            emptyPasswordGroups: [],
            emptyValueGroups: [],
            duplicatePasswordGroups: {},
            duplicateValueGroups: {},
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
                pendingState.emptyPasswordGroups.push(group.id.value);
            }
            else
            {
                const pendingPasswordState = this.vault.passwordStore.cloneState();

                this.syncPrimaryDataObjectsForGroup(group, "passwords", group.passwords.value, new Map(),
                    pendingPasswordState.passwordsByID, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                    pendingState.passwordGroupsByID);

                const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID);

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
                pendingState.emptyValueGroups.push(group.id.value);
            }
            else
            {
                const pendingValueState = this.vault.valueStore.cloneState();

                this.syncPrimaryDataObjectsForGroup(group, "values", group.values.value, new Map(), pendingValueState.valuesByID,
                    pendingState.emptyValueGroups, pendingState.duplicateValueGroups, pendingState.valueGroupsByID);

                const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID);

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

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectCollection = updatedGroup.type.value == DataType.Passwords ? "passwords" : "values";

        const addedPrimaryObjects = updatedGroup[primaryObjectCollection].value.difference(currentGroup.value[primaryObjectCollection].value);
        const removedPrimaryObjects = currentGroup.value[primaryObjectCollection].value.difference(updatedGroup[primaryObjectCollection].value);

        if (updatedGroup.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                pendingPasswordState.passwordsByID, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                pendingState.passwordGroupsByID);

            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                pendingValueState.valuesByID, pendingState.emptyValueGroups, pendingState.duplicateValueGroups,
                pendingState.valueGroupsByID);

            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID);

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
            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID.value, pendingState.passwordGroupsByID);

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
            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID.value, pendingState.valueGroupsByID);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id.value, pendingState.emptyValueGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id.value, pendingState.duplicateValueGroups);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    syncGroupsForPasswords(
        passwordID: string,
        addedGroups: Map<string, Field<string>>,
        removedGroups: Map<string, Field<string>>)
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(passwordID, "passwords", addedGroups, removedGroups, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups, pendingState.passwordGroupsByID);

        return pendingState;
    }

    syncGroupsForValues(
        valueID: string,
        addedGroups: Map<string, Field<string>>,
        removedGroups: Map<string, Field<string>>)
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(valueID, "values", addedGroups, removedGroups, pendingState.emptyValueGroups, pendingState.duplicateValueGroups, pendingState.valueGroupsByID);

        return pendingState;
    }

    // called when updating a password / value
    private syncGroupsForPrimaryObject(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        addedGroups: Map<string, Field<string>>,
        removedGroups: Map<string, Field<string>>,
        currentEmptyGroups: string[],
        currentDuplicateSecondaryObjects: Dictionary<string[]>,
        allSecondaryObjects: Field<Map<string, Field<Group>>>) // TODO: change to map
    {
        addedGroups.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.value.get(key);
            if (!group)
            {
                return;
            }

            group.value[primaryDataObjectCollection].value.set(primaryObjectID, new Field(primaryObjectID));

            this.checkUpdateEmptySecondaryObject(
                group.value.id.value, group.value[primaryDataObjectCollection].value, currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(group.value, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        removedGroups.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.value.get(key);
            if (!group)
            {
                return;
            }

            group.value[primaryDataObjectCollection].value.delete(primaryObjectID);

            this.checkUpdateEmptySecondaryObject(
                group.value.id.value, group.value[primaryDataObjectCollection].value, currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(group.value, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });
    }

    // Called when updating a Group
    private syncPrimaryDataObjectsForGroup<T extends IIdentifiable & IGroupable>(
        group: Group,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        addedPrimaryObjects: Map<string, Field<string>>,
        removedPrimaryObjects: Map<string, Field<string>>,
        allPrimaryObjects: Field<Map<string, Field<T>>>,
        currentEmptyGroups: string[],
        currentDuplicateGroups: Dictionary<string[]>,
        allSecondaryObjects: Field<Map<string, Field<Group>>>)
    {
        addedPrimaryObjects.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.value.set(group.id.value, new Field(group.id.value));
            }
        });

        removedPrimaryObjects.forEach((_, k) =>
        {
            const primaryObject: Field<T> | undefined = allPrimaryObjects.value.get(k);
            if (primaryObject)
            {
                primaryObject.value.groups.value.delete(group.id.value);
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

    private internalDuplicatePasswordGroupsLength: ComputedRef<number>;
    private internalDuplicateValuesGroupsLength: ComputedRef<number>;

    private internalActiveAtRiskPasswordGroupType: Ref<AtRiskType>;
    private internalActiveAtRiskValueGroupType: Ref<AtRiskType>;

    private internalPinnedPasswordGroups: ComputedRef<Field<Group>[]>;
    private internalUnpinnedPasswordGroups: ComputedRef<Field<Group>[]>;

    private internalPinnedValueGroups: ComputedRef<Field<Group>[]>;
    private internalUnpinnedValueGroups: ComputedRef<Field<Group>[]>;

    get activeAtRiskPasswordGroupType() { return this.internalActiveAtRiskPasswordGroupType.value; }
    get activeAtRiskValueGroupType() { return this.internalActiveAtRiskValueGroupType.value; }
    get emptyPasswordGroups() { return this.state.emptyPasswordGroups; }
    get duplicatePasswordGroups() { return this.state.duplicatePasswordGroups; }
    get duplicatePasswordGroupLength() { return this.internalDuplicatePasswordGroupsLength.value; }
    get emptyValueGroups() { return this.state.emptyValueGroups; }
    get duplicateValueGroups() { return this.state.duplicateValueGroups; }
    get duplicateValueGroupLength() { return this.internalDuplicateValuesGroupsLength.value; }
    get sortedPasswordsGroups() { return this.internalSortedPasswordsGroups.value; }
    get sortedValuesGroups() { return this.internalSortedValuesGroups.value }
    get pinnedPasswordGroups() { return this.internalPinnedPasswordGroups.value; }
    get unpinnedPasswordGroups() { return this.internalUnpinnedPasswordGroups.value; }
    get pinnedValueGroups() { return this.internalPinnedValueGroups.value; }
    get unpinnedValueGroups() { return this.internalUnpinnedValueGroups.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.value.name.value >= b.value.name.value ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.value.name.value >= b.value.name.value ? 1 : -1));

        this.internalDuplicatePasswordGroupsLength = computed(() => Object.keys(this.state.duplicatePasswordGroups).length);
        this.internalDuplicateValuesGroupsLength = computed(() => Object.keys(this.state.duplicateValueGroups).length);

        this.internalActiveAtRiskPasswordGroupType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueGroupType = ref(AtRiskType.None);

        this.internalPinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => app.userPreferences.pinnedGroups.value.has(f.value.id.value)));
        this.internalUnpinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => !app.userPreferences.pinnedGroups.value.has(f.value.id.value)));

        this.internalPinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => app.userPreferences.pinnedGroups.value.has(f.value.id.value)));
        this.internalUnpinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => !app.userPreferences.pinnedGroups.value.has(f.value.id.value)));
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