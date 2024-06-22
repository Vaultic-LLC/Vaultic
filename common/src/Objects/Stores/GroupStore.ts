import { ComputedRef, Ref, computed, ref } from "vue";
import { DataType, Group } from "../../Types/Table";
import { AtRiskType, DataFile } from "../../Types/EncryptedData";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { DataTypeStore, DataTypeStoreState } from "./Base";
import { api } from "../../API";

export interface GroupStoreState extends DataTypeStoreState<Group>
{
    groupsById: Dictionary<Group>;
    emptyPasswordGroups: string[];
    emptyValueGroups: string[];
    duplicatePasswordGroups: Dictionary<string[]>;
    duplicateValueGroups: Dictionary<string[]>;
}

class GroupStore extends DataTypeStore<Group, GroupStoreState>
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

    async addGroup(key: string, group: Group): Promise<boolean>
    {
        const addGroupData = {
            MasterKey: key,
            Group: group,
            ...stores.getStates()
        };

        const data: any = await api.server.group.add(JSON.stringify(addGroupData));
        return await stores.handleUpdateStoreResponse(key, data);
    }

    async updateGroup(key: string, updatedGroup: Group): Promise<boolean>
    {
        const updateGroupData = {
            MasterKey: key,
            Group: updatedGroup,
            ...stores.getStates()
        };

        const data: any = await api.server.group.update(JSON.stringify(updateGroupData));
        return await stores.handleUpdateStoreResponse(key, data);
    }

    async deleteGroup(key: string, group: Group): Promise<boolean>
    {
        const deleteGroupData = {
            MasterKey: key,
            Group: group,
            ...stores.getStates()
        };

        const data: any = await api.server.group.delete(JSON.stringify(deleteGroupData));
        return await stores.handleUpdateStoreResponse(key, data);
    }
}

const groupStore = new GroupStore();
export default groupStore;

export type GroupStoreType = typeof groupStore;
