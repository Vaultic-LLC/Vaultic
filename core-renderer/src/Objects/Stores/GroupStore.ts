import { ComputedRef, Ref, computed, ref } from "vue";
import { SecondaryDataTypeStore, SecondarydataTypeStoreStateKeys } from "./Base";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { api } from "../../API";
import { DataType, IGroupable, AtRiskType, Group, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { IIdentifiable, PrimaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IPasswordStoreState } from "./PasswordStore";
import { IValueStoreState } from "./ValueStore";
import { IFilterStoreState } from "./FilterStore";
import { DictionaryAsList, DoubleKeyedObject, StoreState } from "@vaultic/shared/Types/Stores";

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

export type GroupStoreState = IGroupStoreState;

export class GroupStore extends SecondaryDataTypeStore<GroupStoreState, SecondarydataTypeStoreStateKeys>
{
    protected internalPasswordGroups: ComputedRef<Group[]>;
    protected internalValueGroups: ComputedRef<Group[]>;

    get passwordGroups() { return this.internalPasswordGroups.value; }
    get valuesGroups() { return this.internalValueGroups.value; }

    constructor(vault: any)
    {
        super(vault, "groupStoreState");

        this.internalPasswordGroups = computed(() => this.state.p.map((k, v) => v));
        this.internalValueGroups = computed(() => this.state.v.map((k, v) => v));
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

    async addGroup(masterKey: string, group: Group, backup?: boolean): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        backup = backup ?? app.isOnline;

        if (group.t == DataType.Passwords)
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
        else if (group.t == DataType.NameValuePairs)
        {
            // TODO
        }

        return await transaction.commit(masterKey, backup);
    }

    async addGroupToStores(group: Group, pendingGroupStoreState: IGroupStoreState, pendingFilterStoreState: IFilterStoreState,
        pendingPasswordStoreState?: IPasswordStoreState, pendingValueStoreState?: IValueStoreState): Promise<boolean>
    {
        if (group.t == DataType.Passwords)
        {
            group.id = uniqueIDGenerator.generate();

            const groupField = group;
            pendingGroupStoreState.p.set(group.id, groupField);

            if (group.p.size == 0)
            {
                pendingGroupStoreState.w.set(group.id, group.id);
                this.checkUpdateDuplicateSecondaryObjects(group, "p", pendingGroupStoreState.o, pendingGroupStoreState.p)
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "p", new RelatedDataTypeChanges(group.p),
                    pendingPasswordStoreState!.p, pendingGroupStoreState.w, pendingGroupStoreState.o,
                    pendingGroupStoreState.p);

                this.vault.filterStore.syncFiltersForPasswords(pendingPasswordStoreState!.p, pendingGroupStoreState.p, false,
                    pendingFilterStoreState);
            }
        }
        else if (group.t == DataType.NameValuePairs)
        {
            group.id = uniqueIDGenerator.generate();

            const groupField = group;
            pendingGroupStoreState.v.set(group.id, groupField);

            if (group.v.size == 0)
            {
                pendingGroupStoreState.l.set(group.id, group.id);
                this.checkUpdateDuplicateSecondaryObjects(group, "v", pendingGroupStoreState.u, pendingGroupStoreState.v)
            }
            else
            {
                this.syncPrimaryDataObjectsForGroup(group, "v", new RelatedDataTypeChanges(group.v), pendingValueStoreState!.v,
                    pendingGroupStoreState.l, pendingGroupStoreState.u, pendingGroupStoreState.v);

                this.vault.filterStore.syncFiltersForValues(pendingValueStoreState!.v, pendingGroupStoreState.v, false,
                    pendingFilterStoreState);
            }
        }

        return true;
    }

    async updateGroup(masterKey: string, updatedGroup: Group): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentGroup = pendingState.p.get(updatedGroup.id) ?? pendingState.v.get(updatedGroup.id);
        if (!currentGroup)
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Update")
            return false;
        }

        const primaryObjectCollection = updatedGroup.t == DataType.Passwords ? "p" : "v";

        // need to get added and removed groups before updating the old group with the new one
        const primaryObjectChanges = this.getRelatedDataTypeChanges(currentGroup[primaryObjectCollection], updatedGroup[primaryObjectCollection]);

        if (updatedGroup.t == DataType.Passwords)
        {
            const pendingPasswordState = this.vault.passwordStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingPasswordState.p, pendingState.w, pendingState.o,
                pendingState.p);

            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.p, pendingState.p, false, pendingFilterState);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (updatedGroup.t == DataType.NameValuePairs)
        {
            const pendingValueState = this.vault.valueStore.cloneState();

            this.syncPrimaryDataObjectsForGroup(updatedGroup, primaryObjectCollection, primaryObjectChanges,
                pendingValueState.v, pendingState.l, pendingState.u,
                pendingState.v);

            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForValues(pendingValueState.v, pendingState.v, false, pendingFilterState);

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

        if (!pendingState.p.has(group.id) && !pendingState.v.has(group.id))
        {
            await api.repositories.logs.log(undefined, `No Group`, "GroupStore.Delete")
            return false;
        }

        if (group.t == DataType.Passwords)
        {
            pendingState.p.delete(group.id);
            const pendingPasswordState = this.vault.passwordStore.removeSecondaryObjectFromValues(group.id, "g");

            // do this here since it can update passwords
            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForPasswords(pendingPasswordState.p, pendingState.p, false, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, pendingState.w);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, pendingState.o);

            transaction.updateVaultStore(this.vault.passwordStore, pendingPasswordState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }
        else if (group.t == DataType.NameValuePairs)
        {
            pendingState.v.delete(group.id);
            const pendingValueState = this.vault.valueStore.removeSecondaryObjectFromValues(group.id, "g");

            // do this here since it can update values
            const pendingFilterState = this.vault.filterStore.cloneState();
            this.vault.filterStore.syncFiltersForValues(pendingValueState.v, pendingState.v, false, pendingFilterState);

            this.removeSeconaryObjectFromEmptySecondaryObjects(group.id, pendingState.l);
            this.removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(group.id, pendingState.u);

            transaction.updateVaultStore(this.vault.valueStore, pendingValueState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);
        }

        transaction.updateVaultStore(this, pendingState);
        return await transaction.commit(masterKey);
    }

    syncGroupsForPasswords(passwordID: string, changedGroups: RelatedDataTypeChanges, pendingGroupState: IGroupStoreState)
    {
        this.syncGroupsForPrimaryObject(passwordID, "p", changedGroups, pendingGroupState.w, pendingGroupState.o, pendingGroupState.p);
    }

    syncGroupsForValues(valueID: string, changedGroups: RelatedDataTypeChanges, pendingGroupState: IGroupStoreState)
    {
        this.syncGroupsForPrimaryObject(valueID, "v", changedGroups, pendingGroupState.l, pendingGroupState.u, pendingGroupState.v);
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
                primaryObject.g.set(group.id, group.id);
            }
        });

        primaryObjectChanges.removed.forEach((_, k) =>
        {
            const primaryObject: T | undefined = allPrimaryObjects.get(k);
            if (primaryObject)
            {
                primaryObject.g.delete(group.id);
            }
        });

        primaryObjectChanges.unchanged.forEach((_, k) =>
        {
            const primaryObject: T | undefined = allPrimaryObjects.get(k);
            if (primaryObject)
            {
                //primaryObject.g.get(group.id)!.updateAndBubble();
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