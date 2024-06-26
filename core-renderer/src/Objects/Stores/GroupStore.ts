import { ComputedRef, Ref, computed, ref } from "vue";
import { DataType, Group, PrimaryDataObjectCollection } from "../../Types/Table";
import { AtRiskType, DataFile, IGroupable, IIdentifiable } from "../../Types/EncryptedData";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { SecondaryObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import { api } from "../../API"

export interface GroupStoreState extends DataTypeStoreState<Group>
{
    groupsById: Dictionary<Group>;
    emptyPasswordGroups: string[];
    emptyValueGroups: string[];
    duplicatePasswordGroups: Dictionary<string[]>;
    duplicateValueGroups: Dictionary<string[]>;
}

class GroupStore extends SecondaryObjectStore<Group, GroupStoreState>
{
    private internalPasswordGroups: ComputedRef<Group[]>;
    private internalValueGroups: ComputedRef<Group[]>;

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
    get passwordGroups() { return this.internalPasswordGroups.value; }
    get activeAtRiskPasswordGroupType() { return this.internalActiveAtRiskPasswordGroupType.value; }
    get activeAtRiskValueGroupType() { return this.internalActiveAtRiskValueGroupType.value; }
    get emptyPasswordGroups() { return this.state.emptyPasswordGroups; }
    get duplicatePasswordGroups() { return this.state.duplicatePasswordGroups; }
    get duplicatePasswordGroupLength() { return this.internalDuplicatePasswordGroupsLength.value; }
    get valuesGroups() { return this.internalValueGroups.value; }
    get emptyValueGroups() { return this.state.emptyValueGroups; }
    get duplicateValueGroups() { return this.state.duplicateValueGroups; }
    get duplicateValueGroupLength() { return this.internalDuplicateValuesGroupsLength.value; }
    get sortedPasswordsGroups() { return this.internalSortedPasswordsGroups.value; }
    get sortedValuesGroups() { return this.internalSortedValuesGroups.value }
    get pinnedPasswordGroups() { return this.internalPinnedPasswordGroups.value; }
    get unpinnedPasswordGroups() { return this.internalUnpinnedPasswordGroups.value; }
    get pinnedValueGroups() { return this.internalPinnedValueGroups.value; }
    get unpinnedValueGroups() { return this.internalUnpinnedValueGroups.value; }

    constructor()
    {
        super();

        this.internalPasswordGroups = computed(() => this.state.values.filter(g => g.type == DataType.Passwords));
        this.internalValueGroups = computed(() => this.state.values.filter(g => g.type == DataType.NameValuePairs));

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));

        this.internalDuplicatePasswordGroupsLength = computed(() => Object.keys(this.state.duplicatePasswordGroups).length);
        this.internalDuplicateValuesGroupsLength = computed(() => Object.keys(this.state.duplicateValueGroups).length);

        this.internalActiveAtRiskPasswordGroupType = ref(AtRiskType.None);
        this.internalActiveAtRiskValueGroupType = ref(AtRiskType.None);

        this.internalPinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => stores.userPreferenceStore.pinnedGroups.hasOwnProperty(f.id)));
        this.internalUnpinnedPasswordGroups = computed(() => this.internalPasswordGroups.value.filter(f => !stores.userPreferenceStore.pinnedGroups.hasOwnProperty(f.id)));

        this.internalPinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => stores.userPreferenceStore.pinnedGroups.hasOwnProperty(f.id)));
        this.internalUnpinnedValueGroups = computed(() => this.internalValueGroups.value.filter(f => !stores.userPreferenceStore.pinnedGroups.hasOwnProperty(f.id)));
    }

    protected defaultState()
    {
        return {
            version: 0,
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

    protected getFile(): DataFile
    {
        return api.files.group;
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordGroupType;
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskValueGroupType;
    }

    async addGroup(masterKey: string, group: Group): Promise<boolean>
    {
        group.id = await generateUniqueID(this.state.values);
        this.state.groupsById[group.id] = group;
        this.state.values.push(group);

        if (group.type == DataType.Passwords)
        {
            if (group.passwords.length == 0)
            {
                this.emptyPasswordGroups.push(group.id);
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "passwords", group.passwords, [],
                    stores.passwordStore.passwords, this.emptyPasswordGroups, this.duplicatePasswordGroups, this.passwordGroups);

                if (!(await stores.passwordStore.writeState(masterKey)))
                {
                    // TODO: handle
                    return false;
                }
            }
        }
        else if (group.type == DataType.NameValuePairs)
        {
            if (group.values.length == 0)
            {
                this.emptyValueGroups.push(group.id);
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "values", group.values, [],
                    stores.valueStore.nameValuePairs, this.emptyValueGroups, this.duplicateValueGroups, this.valuesGroups);

                if (!(await stores.valueStore.writeState(masterKey)))
                {
                    // TODO: handle
                    return false;
                }
            }
        }

        const succeeded = await this.writeState(masterKey);
        if (!succeeded)
        {
            // TODO: Make sure user gets notified correctly
            return false;
        }

        // TODO: Sync filter state with server
        // should return a special error if we fail to sync.
        // let the user know the filter was saved locally, but not backed up

        return true;
    }

    async updateGroup(masterKey: string, updatedGroup: Group): Promise<boolean>
    {
        const currentGroup = this.state.groupsById[updatedGroup.id];
        if (!currentGroup)
        {
            // TODO: do something
            return false;
        }

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectCollection = updatedGroup.type == DataType.Passwords ? "passwords" : "values";
        const addedPrimaryObjects = updatedGroup[primaryObjectCollection].filter(p => !currentGroup[primaryObjectCollection].includes(p));
        const removedPrimaryObjects = currentGroup[primaryObjectCollection].filter(p => !updatedGroup[primaryObjectCollection].includes(p));

        if (updatedGroup.type == DataType.Passwords)
        {
            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                stores.passwordStore.passwords, this.emptyPasswordGroups, this.duplicatePasswordGroups, this.passwordGroups);

            if (!(await stores.passwordStore.writeState(masterKey)))
            {
                // TODO:
                // maybe tell them to close and re open the application?
                // they will just lose whatever changes they tried doing
                return false;
            }
        }
        else if (updatedGroup.type == DataType.NameValuePairs)
        {
            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, addedPrimaryObjects, removedPrimaryObjects,
                stores.valueStore.nameValuePairs, this.emptyValueGroups, this.duplicateValueGroups, this.valuesGroups);

            if (!(await stores.valueStore.writeState(masterKey)))
            {
                // TODO:
                // maybe tell them to close and re open the application?
                // they will just lose whatever changes they tried doing
                return false;
            }
        }

        // TODO: Doesn't work
        Object.assign(this.state.groupsById[updatedGroup.id], updatedGroup);
        Object.assign(this.state.values.filter(g => g.id == updatedGroup.id)[0], updatedGroup);

        stores.filterStore.recalcGroupFilters(updatedGroup.type);
        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO: it would be nice to have some sort of transaction system in case one of these failes while the others succeed...
            // would be hard to do but worth it
            return false;
        }

        const succeeded = await this.writeState(masterKey);
        if (!succeeded)
        {
            // TODO: it would be nice to have some sort of transaction system in case one of these failes while the others succeed...
            // would be hard to do but worth it
            // maybe just doing all writting at the same time would suffice?
            return false;
        }

        return true;
    }

    async deleteGroup(masterKey: string, group: Group): Promise<boolean>
    {
        delete this.state.groupsById[group.id];
        this.state.values.splice(this.state.values.indexOf(group), 1);

        // TODO: need to also remove groups from passwords / values and then re calc filters
        if (group.type == DataType.Passwords)
        {
            stores.passwordStore.removeSecondaryObjectFromValues(group.id, "groups");

            // do this here since it can update passwords
            stores.filterStore.recalcGroupFilters(group.type);

            if (!(await stores.passwordStore.writeState(masterKey)))
            {
                // TODO: handle
                return false;
            }

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, this.emptyPasswordGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, this.duplicatePasswordGroups);
        }
        else if (group.type == DataType.NameValuePairs)
        {
            stores.valueStore.removeSecondaryObjectFromValues(group.id, "groups");

            // do this here since it can update values
            stores.filterStore.recalcGroupFilters(group.type);

            if (!(await stores.valueStore.writeState(masterKey)))
            {
                // TODO: handle
                return false;
            }

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, this.emptyValueGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, this.duplicateValueGroups);
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO: the usu
            return false;
        }

        const succeeded = await this.writeState(masterKey);
        if (!succeeded)
        {
            // TODO: it would be nice to have some sort of transaction system in case one of these failes while the others succeed...
            // would be hard to do but worth it
            // maybe just doing all writting at the same time would suffice?
            return false;
        }

        return true;
    }

    syncGroupsForPasswords(
        passwordID: string,
        addedGroups: string[],
        removedGroups: string[])
    {
        this.syncGroupsForPrimaryObject(passwordID, "passwords", addedGroups, removedGroups,
            this.state.emptyPasswordGroups, this.state.duplicatePasswordGroups, this.passwordGroups);
    }

    syncGroupsForValues(
        valueID: string,
        addedGroups: string[],
        removedGroups: string[])
    {
        this.syncGroupsForPrimaryObject(valueID, "values", addedGroups, removedGroups,
            this.state.emptyValueGroups, this.state.duplicateValueGroups, this.valuesGroups);
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

const groupStore = new GroupStore();
export default groupStore;

export type GroupStoreType = typeof groupStore;
