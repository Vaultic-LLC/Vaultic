import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { DataType, IIdentifiable, IGroupable, AtRiskType, Group } from "../../Types/DataTypes";
import { PrimaryDataObjectCollection } from "../../Types/Fields";

export interface GroupStoreState extends DataTypeStoreState<Group>
{
    emptyPasswordGroups: string[];
    emptyValueGroups: string[];
    duplicatePasswordGroups: Dictionary<string[]>;
    duplicateValueGroups: Dictionary<string[]>;
}

export class GroupStore extends SecondaryDataTypeStore<Group, GroupStoreState>
{
    protected internalPasswordGroups: ComputedRef<Group[]>;
    protected internalValueGroups: ComputedRef<Group[]>;

    get passwordGroups() { return this.internalPasswordGroups.value; }
    get valuesGroups() { return this.internalValueGroups.value; }

    constructor(vault: any)
    {
        super(vault, "groupStoreState");

        this.internalPasswordGroups = computed(() => this.dataTypes.filter(g => g.type.value == DataType.Passwords));
        this.internalValueGroups = computed(() => this.dataTypes.filter(g => g.type.value == DataType.NameValuePairs));
    }

    protected defaultState()
    {
        return {
            dataTypesByID: {},
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
        const groups = Object.values(pendingState.dataTypesByID);

        group.id.value = await generateUniqueID(groups);

        // add to list since we built it before grouup was in dataTypesByID
        groups.push(group);
        pendingState.dataTypesByID[group.id.value] = group;

        if (group.type.value == DataType.Passwords)
        {
            if (group.passwords.value.length == 0)
            {
                pendingState.emptyPasswordGroups.push(group.id.value);
            }
            else
            {
                const pendingPasswordState = this.vault.passwordStore.cloneState();
                const passwordGroups = groups.filter(g => g.type.value == DataType.Passwords);
                const passwords = Object.values(pendingPasswordState.dataTypesByID);

                this.syncPrimaryDataObjectsForGroup(group, "passwords", group.passwords.value, [],
                    passwords, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                    passwordGroups);

                const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(passwords, passwordGroups);

                transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
                transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
            }
        }
        else if (group.type.value == DataType.NameValuePairs)
        {
            if (group.values.value.length == 0)
            {
                pendingState.emptyValueGroups.push(group.id.value);
            }
            else
            {
                const pendingValueState = this.vault.valueStore.cloneState();
                const valueGroups = groups.filter(g => g.type.value == DataType.NameValuePairs);
                const values = Object.values(pendingValueState.dataTypesByID);

                this.syncPrimaryDataObjectsForGroup(group, "values", group.values.value, [], values,
                    pendingState.emptyValueGroups, pendingState.duplicateValueGroups, valueGroups);

                const pendingFilterState = this.vault.filterStore.syncFiltersForValues(values, valueGroups);

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
        const groups = Object.values(pendingState.dataTypesByID);

        const currentGroup = pendingState.dataTypesByID[updatedGroup.id.value];
        if (!currentGroup)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Update")
            return false;
        }

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectCollection = updatedGroup.type.value == DataType.Passwords ? "passwords" : "values";
        const addedPrimaryObjects = updatedGroup[primaryObjectCollection].value.filter(p => !currentGroup[primaryObjectCollection].value.includes(p));
        const removedPrimaryObjects = currentGroup[primaryObjectCollection].value.filter(p => !updatedGroup[primaryObjectCollection].value.includes(p));

        if (updatedGroup.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.cloneState();
            const passwordGroups = groups.filter(g => g.type.value == DataType.Passwords);
            const passwords = Object.values(pendingPasswordState.dataTypesByID);

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                passwords, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                passwordGroups);

            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(passwords, passwordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();
            const valueGroups = groups.filter(g => g.type.value == DataType.NameValuePairs);
            const values = Object.values(pendingValueState.dataTypesByID);

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                values, pendingState.emptyValueGroups, pendingState.duplicateValueGroups,
                valueGroups);

            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(values, valueGroups);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        Object.assign(pendingState.dataTypesByID[updatedGroup.id.value], updatedGroup);
        transaction.updateVaultStore(this, pendingState);

        return await transaction.commit(masterKey);
    }

    async deleteGroup(masterKey: string, group: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (!pendingState.dataTypesByID[group.id.value])
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Delete")
            return false;
        }

        const groups = Object.values(pendingState.dataTypesByID);
        delete pendingState.dataTypesByID[group.id.value];

        if (group.type.value == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id.value, "groups");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(Object.values(pendingPasswordState.dataTypesByID),
                groups.filter(g => g.type.value == DataType.Passwords));

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id.value, pendingState.emptyPasswordGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id.value, pendingState.duplicatePasswordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.type.value == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id.value, "groups");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(Object.values(pendingValueState.dataTypesByID),
                groups.filter(g => g.type.value == DataType.NameValuePairs));

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
        addedGroups: string[],
        removedGroups: string[])
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(passwordID, "passwords", addedGroups, removedGroups,
            pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups, Object.values(pendingState.dataTypesByID).filter(g => g.type.value == DataType.Passwords));

        return pendingState;
    }

    syncGroupsForValues(
        valueID: string,
        addedGroups: string[],
        removedGroups: string[])
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(valueID, "values", addedGroups, removedGroups,
            pendingState.emptyValueGroups, pendingState.duplicateValueGroups, Object.values(pendingState.dataTypesByID).filter(g => g.type.value == DataType.NameValuePairs));

        return pendingState;
    }

    // called when updating a password / value
    private syncGroupsForPrimaryObject(
        primaryObjectID: string,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        addedGroups: string[],
        removedGroups: string[],
        currentEmptyGroups: string[],
        currentDuplicateSecondaryObjects: Dictionary<string[]>,
        allSecondaryObjects: Group[])
    {
        addedGroups.forEach(g =>
        {
            const groups = allSecondaryObjects.filter(grp => grp.id.value == g);
            if (groups.length != 1)
            {
                return;
            }

            if (!groups[0][primaryDataObjectCollection].value.includes(primaryObjectID))
            {
                groups[0][primaryDataObjectCollection].value.push(primaryObjectID);
            }

            this.checkUpdateEmptySecondaryObject(
                groups[0].id.value, groups[0][primaryDataObjectCollection].value, currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(groups[0], primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        removedGroups.forEach(g =>
        {
            const groups = allSecondaryObjects.filter(grp => grp.id.value == g);
            if (groups.length != 1)
            {
                return;
            }

            const primaryObjectIndex = groups[0][primaryDataObjectCollection].value.indexOf(primaryObjectID);
            if (primaryObjectIndex >= 0)
            {
                groups[0][primaryDataObjectCollection].value.splice(primaryObjectIndex, 1);
            }

            this.checkUpdateEmptySecondaryObject(
                groups[0].id.value, groups[0][primaryDataObjectCollection].value, currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(groups[0], primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });
    }

    // Called when updating a Group
    private syncPrimaryDataObjectsForGroup<T extends IIdentifiable & IGroupable>(
        group: Group,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        addedPrimaryObjects: string[],
        removedPrimaryObjects: string[],
        allPrimaryObjects: T[],
        currentEmptyGroups: string[],
        currentDuplicateGroups: Dictionary<string[]>,
        allSecondaryObjects: Group[])
    {
        addedPrimaryObjects.forEach(o =>
        {
            const primaryObject = allPrimaryObjects.filter(po => po.id.value == o);
            if (primaryObject.length == 1)
            {
                primaryObject[0].groups.value.push(group.id.value);
            }
        });

        removedPrimaryObjects.forEach(o =>
        {
            const primaryObject = allPrimaryObjects.filter(po => po.id.value == o);
            if (primaryObject.length == 1)
            {
                const groupIndex = primaryObject[0].groups.value.indexOf(group.id.value);
                if (groupIndex >= 0)
                {
                    primaryObject[0].groups.value.splice(groupIndex, 1);
                }
            }
        });

        this.checkUpdateEmptySecondaryObject(group.id.value, group[primaryDataObjectCollection].value, currentEmptyGroups);
        this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection, currentDuplicateGroups, allSecondaryObjects)
    }
}

export class ReactiveGroupStore extends GroupStore 
{
    private internalSortedPasswordsGroups: ComputedRef<Group[]>;
    private internalSortedValuesGroups: ComputedRef<Group[]>;

    private internalDuplicatePasswordGroupsLength: ComputedRef<number>;
    private internalDuplicateValuesGroupsLength: ComputedRef<number>;

    private internalActiveAtRiskPasswordGroupType: Ref<AtRiskType>;
    private internalActiveAtRiskValueGroupType: Ref<AtRiskType>;

    private internalPinnedPasswordGroups: ComputedRef<Group[]>;
    private internalUnpinnedPasswordGroups: ComputedRef<Group[]>;

    private internalPinnedValueGroups: ComputedRef<Group[]>;
    private internalUnpinnedValueGroups: ComputedRef<Group[]>;

    get groups() { return this.dataTypes; }
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

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.name.value >= b.name.value ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.name.value >= b.name.value ? 1 : -1));

        this.internalDuplicatePasswordGroupsLength = computed(() => Object.keys(this.state.duplicatePasswordGroups).length);
        this.internalDuplicateValuesGroupsLength = computed(() => Object.keys(this.state.duplicateValueGroups).length);

        this.internalActiveAtRiskPasswordGroupType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueGroupType = ref(AtRiskType.None);

        this.internalPinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => app.userPreferences.pinnedGroups.hasOwnProperty(f.id.value)));
        this.internalUnpinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => !app.userPreferences.pinnedGroups.hasOwnProperty(f.id.value)));

        this.internalPinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => app.userPreferences.pinnedGroups.hasOwnProperty(f.id.value)));
        this.internalUnpinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => !app.userPreferences.pinnedGroups.hasOwnProperty(f.id.value)));
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