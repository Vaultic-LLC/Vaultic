import { ComputedRef, Ref, computed, ref } from "vue";
import { DataType, Group, PrimaryDataObjectCollection } from "../../Types/Table";
import { AtRiskType, IGroupable, IIdentifiable } from "../../Types/EncryptedData";
import { Dictionary } from "../../Types/DataStructures";
import { SecondaryObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import app from "./AppStore";
import { api } from "../../API";

export interface GroupStoreState extends DataTypeStoreState<Group>
{
    // TODO: this shold be hoisted up to a DataTypeStoreState and by Dictionary<number> where 
    // number is the index in values[].
    groupsById: Dictionary<Group>;
    emptyPasswordGroups: string[];
    emptyValueGroups: string[];
    duplicatePasswordGroups: Dictionary<string[]>;
    duplicateValueGroups: Dictionary<string[]>;
}

export class GroupStore extends SecondaryObjectStore<Group, GroupStoreState>
{
    protected internalPasswordGroups: ComputedRef<Group[]>;
    protected internalValueGroups: ComputedRef<Group[]>;

    get passwordGroups() { return this.internalPasswordGroups.value; }
    get valuesGroups() { return this.internalValueGroups.value; }

    constructor(vault: any)
    {
        super(vault, "groupStoreState");

        this.internalPasswordGroups = computed(() => this.state.values.filter(g => g.type == DataType.Passwords));
        this.internalValueGroups = computed(() => this.state.values.filter(g => g.type == DataType.NameValuePairs));
    }

    protected defaultState()
    {
        return {
            hash: '',
            hashSalt: '',
            values: [],
            groupsById: {},
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

        group.id = await generateUniqueID(pendingState.values);
        pendingState.groupsById[group.id] = group;
        pendingState.values.push(group);

        if (group.type == DataType.Passwords)
        {
            if (group.passwords.length == 0)
            {
                pendingState.emptyPasswordGroups.push(group.id);
            }
            else
            {
                const pendingPasswordState = this.vault.passwordStore.cloneState();
                const passwordGroups = pendingState.values.filter(g => g.type == DataType.Passwords);

                this.syncPrimaryDataObjectsForGroup(group, "passwords", group.passwords, [],
                    pendingPasswordState.values, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                    passwordGroups);

                const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.values, passwordGroups);

                transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
                transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
            }
        }
        else if (group.type == DataType.NameValuePairs)
        {
            if (group.values.length == 0)
            {
                pendingState.emptyValueGroups.push(group.id);
            }
            else
            {
                const pendingValueState = this.vault.valueStore.cloneState();
                const valueGroups = pendingState.values.filter(g => g.type == DataType.NameValuePairs);

                this.syncPrimaryDataObjectsForGroup(group, "values", group.values, [], pendingValueState.values,
                    pendingState.emptyValueGroups, pendingState.duplicateValueGroups, valueGroups);

                const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.values, valueGroups);

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

        const currentGroup = pendingState.groupsById[updatedGroup.id];
        if (!currentGroup)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Update")
            return false;
        }

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectCollection = updatedGroup.type == DataType.Passwords ? "passwords" : "values";
        const addedPrimaryObjects = updatedGroup[primaryObjectCollection].filter(p => !currentGroup[primaryObjectCollection].includes(p));
        const removedPrimaryObjects = currentGroup[primaryObjectCollection].filter(p => !updatedGroup[primaryObjectCollection].includes(p));

        if (updatedGroup.type == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.cloneState();
            const passwordGroups = pendingState.values.filter(g => g.type == DataType.Passwords);

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                pendingPasswordState.values, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                passwordGroups);

            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.values, passwordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.type == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();
            const valueGroups = pendingState.values.filter(g => g.type == DataType.NameValuePairs);

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                pendingValueState.values, pendingState.emptyValueGroups, pendingState.duplicateValueGroups,
                valueGroups);

            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.values, valueGroups);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        Object.assign(pendingState.groupsById[updatedGroup.id], updatedGroup);
        Object.assign(pendingState.values.filter(g => g.id == updatedGroup.id)[0], updatedGroup);

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    async deleteGroup(masterKey: string, group: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        delete pendingState.groupsById[group.id];
        const groupIndex = pendingState.values.findIndex(g => g.id == group.id);

        if (groupIndex < 0)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Delete")
            return false;
        }

        pendingState.values.splice(groupIndex, 1);

        if (group.type == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id, "groups");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.values,
                pendingState.values.filter(g => g.type == DataType.Passwords));

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, pendingState.emptyPasswordGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, pendingState.duplicatePasswordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.type == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id, "groups");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.syncFiltersForValues(pendingValueState.values,
                pendingState.values.filter(g => g.type == DataType.NameValuePairs));

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, pendingState.emptyValueGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, pendingState.duplicateValueGroups);

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
            pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups, pendingState.values.filter(g => g.type == DataType.Passwords));

        return pendingState;
    }

    syncGroupsForValues(
        valueID: string,
        addedGroups: string[],
        removedGroups: string[])
    {
        const pendingState = this.cloneState();
        this.syncGroupsForPrimaryObject(valueID, "values", addedGroups, removedGroups,
            pendingState.emptyValueGroups, pendingState.duplicateValueGroups, pendingState.values.filter(g => g.type == DataType.NameValuePairs));

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
            const groups = allSecondaryObjects.filter(grp => grp.id == g);
            if (groups.length != 1)
            {
                return;
            }

            if (!groups[0][primaryDataObjectCollection].includes(primaryObjectID))
            {
                groups[0][primaryDataObjectCollection].push(primaryObjectID);
            }

            this.checkUpdateEmptySecondaryObject(
                groups[0].id, groups[0][primaryDataObjectCollection], currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(groups[0], primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        removedGroups.forEach(g =>
        {
            const groups = allSecondaryObjects.filter(grp => grp.id == g);
            if (groups.length != 1)
            {
                return;
            }

            const primaryObjectIndex = groups[0][primaryDataObjectCollection].indexOf(primaryObjectID);
            if (primaryObjectIndex >= 0)
            {
                groups[0][primaryDataObjectCollection].splice(primaryObjectIndex, 1);
            }

            this.checkUpdateEmptySecondaryObject(
                groups[0].id, groups[0][primaryDataObjectCollection], currentEmptyGroups);

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
            const primaryObject = allPrimaryObjects.filter(po => po.id == o);
            if (primaryObject.length == 1)
            {
                primaryObject[0].groups.push(group.id);
            }
        });

        removedPrimaryObjects.forEach(o =>
        {
            const primaryObject = allPrimaryObjects.filter(po => po.id == o);
            if (primaryObject.length == 1)
            {
                const groupIndex = primaryObject[0].groups.indexOf(group.id);
                if (groupIndex >= 0)
                {
                    primaryObject[0].groups.splice(groupIndex, 1);
                }
            }
        });

        this.checkUpdateEmptySecondaryObject(group.id, group[primaryDataObjectCollection], currentEmptyGroups);
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

    get groups() { return this.state.values; }
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

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));

        this.internalDuplicatePasswordGroupsLength = computed(() => Object.keys(this.state.duplicatePasswordGroups).length);
        this.internalDuplicateValuesGroupsLength = computed(() => Object.keys(this.state.duplicateValueGroups).length);

        this.internalActiveAtRiskPasswordGroupType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueGroupType = ref(AtRiskType.None);

        this.internalPinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => this.vault.vaultPreferencesStore.pinnedGroups.hasOwnProperty(f.id)));
        this.internalUnpinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => !this.vault.vaultPreferencesStore.pinnedGroups.hasOwnProperty(f.id)));

        this.internalPinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => this.vault.vaultPreferencesStore.pinnedGroups.hasOwnProperty(f.id)));
        this.internalUnpinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => !this.vault.vaultPreferencesStore.pinnedGroups.hasOwnProperty(f.id)));
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