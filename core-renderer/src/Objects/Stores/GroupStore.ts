import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { api } from "../../API";
import { DataType, IGroupable, AtRiskType, Group, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { IIdentifiable, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IPasswordStoreState } from "./PasswordStore";
import { IValueStoreState } from "./ValueStore";
import { IFilterStoreState } from "./FilterStore";
import { StoreState } from "@vaultic/shared/Types/Stores";

export interface IGroupStoreState extends StoreState
{
    passwordGroupsByID: Map<string, Group>;
    valueGroupsByID: Map<string, Group>;
    emptyPasswordGroups: Map<string, string>;
    emptyValueGroups: Map<string, string>;
    duplicatePasswordGroups: Map<string, Map<string, string>>;
    duplicateValueGroups: Map<string, Map<string, string>>;
}

export type GroupStoreState = IGroupStoreState;

export class GroupStore extends SecondaryDataTypeStore<GroupStoreState>
{
    protected internalPasswordGroups: ComputedRef<Group[]>;
    protected internalValueGroups: ComputedRef<Group[]>;

    get passwordGroups() { return this.internalPasswordGroups.value; }
    get valuesGroups() { return this.internalValueGroups.value; }

    constructor(vault: any)
    {
        super(vault, "groupStoreState");

        this.internalPasswordGroups = computed(() => this.state.passwordGroupsByID.map((k, v) => v));
        this.internalValueGroups = computed(() => this.state.valueGroupsByID.map((k, v) => v));
    }

    protected defaultState()
    {
        return {
            version: 0,
            passwordGroupsByID: new Map<string, Group>(),
            valueGroupsByID: new Map<string, Group>(),
            emptyPasswordGroups: new Map<string, string>(),
            emptyValueGroups: new Map<string, string>(),
            duplicatePasswordGroups: new Map<string, Map<string, string>>(),
            duplicateValueGroups: new Map<string, Map<string, string>>(),
        };
    }

    async addGroup(masterKey: string, group: Group, backup?: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        backup = backup ?? app.isOnline;

        if (group.type == DataType.Passwords)
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
        else if (group.type == DataType.NameValuePairs)
        {
            // TODO
        }

        return await transaction.commit(masterKey, backup);
    }

    async addGroupToStores(group: Group, pendingGroupStoreState: IGroupStoreState, pendingFilterStoreState: IFilterStoreState,
        pendingPasswordStoreState?: IPasswordStoreState, pendingValueStoreState?: IValueStoreState): Promise<boolean>
    {
        if (group.type == DataType.Passwords)
        {
            group.id = uniqueIDGenerator.generate();

            const groupField = group;
            pendingGroupStoreState.passwordGroupsByID.set(group.id, groupField);

            if (group.passwords.size == 0)
            {
                pendingGroupStoreState.emptyPasswordGroups.set(group.id, group.id);
                this.checkUpdateDuplicateSecondaryObjects(group, "passwords", pendingGroupStoreState.duplicatePasswordGroups, pendingGroupStoreState.passwordGroupsByID)
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "passwords", new RelatedDataTypeChanges(group.passwords),
                    pendingPasswordStoreState!.passwordsByID, pendingGroupStoreState.emptyPasswordGroups, pendingGroupStoreState.duplicatePasswordGroups,
                    pendingGroupStoreState.passwordGroupsByID);

                this.vault.filterStore.syncFiltersForPasswords(pendingPasswordStoreState!.passwordsByID, pendingGroupStoreState.passwordGroupsByID, false,
                    pendingFilterStoreState);
            }
        }
        else if (group.type == DataType.NameValuePairs)
        {
            group.id = uniqueIDGenerator.generate();

            const groupField = group;
            pendingGroupStoreState.valueGroupsByID.set(group.id, groupField);

            if (group.values.size == 0)
            {
                pendingGroupStoreState.emptyValueGroups.set(group.id, group.id);
                this.checkUpdateDuplicateSecondaryObjects(group, "values", pendingGroupStoreState.duplicateValueGroups, pendingGroupStoreState.valueGroupsByID)
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "values", new RelatedDataTypeChanges(group.values), pendingValueStoreState!.valuesByID,
                    pendingGroupStoreState.emptyValueGroups, pendingGroupStoreState.duplicateValueGroups, pendingGroupStoreState.valueGroupsByID);

                this.vault.filterStore.syncFiltersForValues(pendingValueStoreState!.valuesByID, pendingGroupStoreState.valueGroupsByID, false,
                    pendingFilterStoreState);
            }
        }

        return true;
    }

    async updateGroup(masterKey: string, updatedGroup: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentGroup = pendingState.passwordGroupsByID.get(updatedGroup.id) ?? pendingState.valueGroupsByID.get(updatedGroup.id);
        if (!currentGroup)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Update")
            return false;
        }

        const primaryObjectCollection = updatedGroup.type == DataType.Passwords ? "passwords" : "values";

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectChanges = this.getRelatedDataTypeChanges(currentGroup[primaryObjectCollection], updatedGroup[primaryObjectCollection]);

        if (updatedGroup.type == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingPasswordState.passwordsByID, pendingState.emptyPasswordGroups, pendingState.duplicatePasswordGroups,
                pendingState.passwordGroupsByID);

            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID, pendingState.passwordGroupsByID, false, pendingFilterState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.type == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingValueState.valuesByID, pendingState.emptyValueGroups, pendingState.duplicateValueGroups,
                pendingState.valueGroupsByID);

            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID, pendingState.valueGroupsByID, false, pendingFilterState);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        currentGroup = updatedGroup;
        transaction.updateVaultStore(this, pendingState);

        return await transaction.commit(masterKey);
    }

    async deleteGroup(masterKey: string, group: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        if (!pendingState.passwordGroupsByID.has(group.id) && !pendingState.valueGroupsByID.has(group.id))
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Delete")
            return false;
        }

        if (group.type == DataType.Passwords)
        {
            pendingState.passwordGroupsByID.delete(group.id);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id, "groups");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.passwordsByID, pendingState.passwordGroupsByID, false, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, pendingState.emptyPasswordGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, pendingState.duplicatePasswordGroups);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.type == DataType.NameValuePairs)
        {
            pendingState.valueGroupsByID.delete(group.id);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id, "groups");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForValues(pendingValueState.valuesByID, pendingState.valueGroupsByID, false, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, pendingState.emptyValueGroups);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, pendingState.duplicateValueGroups);

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
        currentEmptyGroups: Map<string, string>,
        currentDuplicateSecondaryObjects: Map<string, Map<string, string>>,
        allSecondaryObjects: Map<string, Group>)
    {
        changedGroups.added.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.get(key);
            if (!group)
            {
                return;
            }

            if (!group[primaryDataObjectCollection].has(primaryObjectID))
            {
                group[primaryDataObjectCollection].set(primaryObjectID, primaryObjectID);
            }

            this.checkUpdateEmptySecondaryObject(
                group.id, group[primaryDataObjectCollection], currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        changedGroups.removed.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.get(key);
            if (!group)
            {
                return;
            }

            if (group[primaryDataObjectCollection].has(primaryObjectID))
            {
                group[primaryDataObjectCollection].delete(primaryObjectID);
            }

            this.checkUpdateEmptySecondaryObject(
                group.id, group[primaryDataObjectCollection], currentEmptyGroups);

            this.checkUpdateDuplicateSecondaryObjects(group, primaryDataObjectCollection,
                currentDuplicateSecondaryObjects, allSecondaryObjects)
        });

        changedGroups.unchanged.forEach((value, key, map) =>
        {
            const group = allSecondaryObjects.get(key);
            if (!group)
            {
                return;
            }

            if (group[primaryDataObjectCollection].has(primaryObjectID))
            {
                //group[primaryDataObjectCollection].get(primaryObjectID)!.updateAndBubble();
            }
        });
    }

    // Called when updating a Group
    private syncPrimaryDataObjectsForGroup<T extends IIdentifiable & IGroupable>(
        group: Group,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        primaryObjectChanges: RelatedDataTypeChanges,
        allPrimaryObjects: Map<string, T>,
        currentEmptyGroups: Map<string, string>,
        currentDuplicateGroups: Map<string, Map<string, string>>,
        allSecondaryObjects: Map<string, Group>)
    {
        primaryObjectChanges.added.forEach((_, k) =>
        {
            const primaryObject: T | undefined = allPrimaryObjects.get(k);
            if (primaryObject)
            {
                primaryObject.groups.set(group.id, group.id);
            }
        });

        primaryObjectChanges.removed.forEach((_, k) =>
        {
            const primaryObject: T | undefined = allPrimaryObjects.get(k);
            if (primaryObject)
            {
                primaryObject.groups.delete(group.id);
            }
        });

        primaryObjectChanges.unchanged.forEach((_, k) =>
        {
            const primaryObject: T | undefined = allPrimaryObjects.get(k);
            if (primaryObject)
            {
                //primaryObject.groups.get(group.id)!.updateAndBubble();
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

        this.internalSortedPasswordsGroups = computed(() => this.internalPasswordGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));
        this.internalSortedValuesGroups = computed(() => this.internalValueGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));

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