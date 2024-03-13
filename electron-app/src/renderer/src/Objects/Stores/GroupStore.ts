import { ComputedRef, Ref, computed, ref } from "vue";
import { DataType, Group } from "../../Types/Table";
import { AtRiskType, DataFile } from "../../Types/EncryptedData";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { AuthenticationStore, AuthenticationStoreState } from "./Base";

export interface GroupStoreState extends AuthenticationStoreState<Group>
{
	groupsById: Dictionary<Group>;
	emptyPasswordGroups: string[];
	emptyValueGroups: string[];
	duplicatePasswordGroups: Dictionary<string[]>;
	duplicateValueGroups: Dictionary<string[]>;
}

// export interface IGroupStore extends IAuthenticationStore
// {
// 	groups: Group[];
// 	passwordGroups: Group[];
// 	activeAtRiskPasswordGroupType: AtRiskType;
// 	activeAtRiskValueGroupType: AtRiskType;
// 	emptyPasswordGroups: string[];
// 	duplicatePasswordGroups: Dictionary<string[]>;
// 	duplicatePasswordGroupLength: number;
// 	valuesGroups: Group[];
// 	emptyValueGroups: string[];
// 	duplicateValueGroups: Dictionary<string[]>;
// 	duplicateValueGroupLength: number;
// 	sortedPasswordsGroups: Group[];
// 	sortedValuesGroups: Group[];
// 	addGroup: (key: string, value: Group) => Promise<void>;
// 	updateGroup: (key: string, updatedGroup: Group) => Promise<void>;
// 	deleteGroup: (key: string, group: Group) => Promise<void>;
// }

// let groupState: GroupStoreState
// let loadedFile: boolean = false;

// export default function useGroupStore(): GroupStore
// {
// 	groupState = reactive(defaultState());

// 	function defaultState(): GroupStoreState
// 	{
// 		loadedFile = false;
// 		return {
// 			groupHashSalt: '',
// 			groupHash: '',
// 			groups: [],
// 			groupsById: {},
// 			emptyPasswordGroups: [],
// 			emptyValueGroups: [],
// 			duplicatePasswordGroups: {},
// 			duplicateValueGroups: {},
// 		}
// 	}

// 	function toString()
// 	{
// 		return JSON.stringify(groupState);
// 	}

// 	function getState(): GroupStoreState
// 	{
// 		return groupState;
// 	}

// 	async function updateState(key: string, state: GroupStoreState): Promise<void>
// 	{
// 		Object.assign(groupState, state);
// 		await writeState(key);
// 	}

// 	function readState(key: string): Promise<boolean>
// 	{
// 		return new Promise((resolve, _) =>
// 		{
// 			if (loadedFile)
// 			{
// 				resolve(true);
// 			}

// 			fileHelper.read<GroupStoreState>(key, window.api.files.group).then((state: GroupStoreState) =>
// 			{
// 				loadedFile = true;
// 				Object.assign(groupState, state);

// 				resolve(true);
// 			}).catch(() =>
// 			{
// 				resolve(false);
// 			});
// 		})
// 	}

// 	function writeState(key: string): Promise<void>
// 	{
// 		if (groupState.groups.length == 0)
// 		{
// 			return window.api.files.group.empty();
// 		}

// 		return fileHelper.write<GroupStoreState>(key, groupState, window.api.files.group);
// 	}

// 	function resetToDefault()
// 	{
// 		Object.assign(groupState, defaultState());
// 	}

// 	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
// 	{
// 		return window.api.files.group.exists();
// 	}

// 	function canAuthenticateKeyAfterEntry(): boolean
// 	{
// 		return groupState.groups.length > 0;
// 	}

// 	async function checkKeyBeforeEntry(key: string): Promise<boolean>
// 	{
// 		if (!await readState(key))
// 		{
// 			return false;
// 		}

// 		const hash = await getHash(key);
// 		if (!hash[0])
// 		{
// 			return false;
// 		}

// 		const result = await cryptHelper.decrypt(key, groupState.groupHash);
// 		if (!result.success)
// 		{
// 			return false;
// 		}

// 		return hash[1] === result.value;
// 	}

// 	async function checkKeyAfterEntry(key: string): Promise<boolean>
// 	{
// 		const result = await cryptHelper.decrypt(key, groupState.groupHash);
// 		if (!result.success)
// 		{
// 			return false;
// 		}

// 		const hash = await getHash(key);
// 		if (!hash[0])
// 		{
// 			return false;
// 		}

// 		return hash[1] == result.value;
// 	}

// 	async function getHash(key: string): Promise<[boolean, string]>
// 	{
// 		let runningKeys: string = "";
// 		for (const filter of groupState.groups)
// 		{
// 			const result = await cryptHelper.decrypt(key, filter.key);
// 			if (!result.success)
// 			{
// 				return [false, ""];
// 			}

// 			runningKeys += result.value ?? "";
// 		}

// 		const hash = await window.api.utilities.hash.hash(runningKeys, groupState.groupHashSalt);
// 		return [true, hash];
// 	}

// 	// --- Public ---
// 	const passwordGroups: ComputedRef<Group[]> = computed(() => groupState.groups.filter(g => g.type == DataType.Passwords));
// 	const valuesGroups: ComputedRef<Group[]> = computed(() => groupState.groups.filter(g => g.type == DataType.NameValuePairs));

// 	const sortedPasswordsGroups: ComputedRef<Group[]> = computed(() => passwordGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));
// 	const sortedValuesGroups: ComputedRef<Group[]> = computed(() => valuesGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));

// 	const duplicatePasswordGroupsLength: ComputedRef<number> = computed(() => Object.keys(groupState.duplicatePasswordGroups).length);
// 	const duplicateValuesGroupsLength: ComputedRef<number> = computed(() => Object.keys(groupState.duplicateValueGroups).length);

// 	const activeAtRiskPasswordGroupType: Ref<AtRiskType> = ref(AtRiskType.None);
// 	const activeAtRiskValueGroupType: Ref<AtRiskType> = ref(AtRiskType.None);

// 	async function addGroup(key: string, group: Group): Promise<void>
// 	{
// 		const addGroupData = {
// 			Sync: false,
// 			Key: key,
// 			Group: group,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.group.add(JSON.stringify(addGroupData));
// 		await stores.handleUpdateStoreResponse(key, data);
// 	}

// 	async function updateGroup(key: string, updatedGroup: Group): Promise<void>
// 	{
// 		const updateGroupData = {
// 			Sync: false,
// 			Key: key,
// 			Group: updatedGroup,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.group.update(JSON.stringify(updateGroupData));
// 		await stores.handleUpdateStoreResponse(key, data);
// 	}

// 	async function deleteGroup(key: string, group: Group): Promise<void>
// 	{
// 		const deleteGroupData = {
// 			Sync: false,
// 			Key: key,
// 			Group: group,
// 			...stores.getStates()
// 		};

// 		const data: any = await window.api.server.group.delete(JSON.stringify(deleteGroupData));
// 		await stores.handleUpdateStoreResponse(key, data);
// 	}

// 	function toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
// 	{
// 		if (dataType == DataType.Passwords)
// 		{
// 			if (activeAtRiskPasswordGroupType.value != atRiskType)
// 			{
// 				activeAtRiskPasswordGroupType.value = atRiskType;
// 				return;
// 			}

// 			activeAtRiskPasswordGroupType.value = AtRiskType.None;
// 		}
// 		else if (dataType == DataType.NameValuePairs)
// 		{
// 			if (activeAtRiskValueGroupType.value != atRiskType)
// 			{
// 				activeAtRiskValueGroupType.value = atRiskType;
// 				return;
// 			}

// 			activeAtRiskValueGroupType.value = AtRiskType.None;
// 		}
// 	}

// 	return {
// 		get groups() { return groupState.groups; },
// 		get passwordGroups() { return passwordGroups.value; },
// 		get activeAtRiskPasswordGroupType() { return activeAtRiskPasswordGroupType.value; },
// 		get activeAtRiskValueGroupType() { return activeAtRiskValueGroupType.value; },
// 		get emptyPasswordGroups() { return groupState.emptyPasswordGroups; },
// 		get duplicatePasswordGroups() { return groupState.duplicatePasswordGroups; },
// 		get duplicatePasswordGroupLength() { return duplicatePasswordGroupsLength.value; },
// 		get valuesGroups() { return valuesGroups.value; },
// 		get emptyValueGroups() { return groupState.emptyValueGroups; },
// 		get duplicateValueGroups() { return groupState.duplicateValueGroups; },
// 		get duplicateValueGroupLength() { return duplicateValuesGroupsLength.value; },
// 		get sortedPasswordsGroups() { return sortedPasswordsGroups.value; },
// 		get sortedValuesGroups() { return sortedValuesGroups.value },
// 		getState,
// 		updateState,
// 		canAuthenticateKeyBeforeEntry,
// 		canAuthenticateKeyAfterEntry,
// 		toString,
// 		checkKeyBeforeEntry,
// 		checkKeyAfterEntry,
// 		readState,
// 		resetToDefault,
// 		addGroup,
// 		updateGroup,
// 		deleteGroup,
// 		toggleAtRiskType
// 	};
// }
class GroupStore extends AuthenticationStore<Group, GroupStoreState>
{
	private internalPasswordGroups: ComputedRef<Group[]>;
	private internalValueGroups: ComputedRef<Group[]>;

	private internalSortedPasswordsGroups: ComputedRef<Group[]>;
	private internalSortedValuesGroups: ComputedRef<Group[]>;

	private internalDuplicatePasswordGroupsLength: ComputedRef<number>;
	private internalDuplicateValuesGroupsLength: ComputedRef<number>;

	private internalActiveAtRiskPasswordGroupType: Ref<AtRiskType>;
	private internalActiveAtRiskValueGroupType: Ref<AtRiskType>;

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

	protected getFile(): DataFile
	{
		return window.api.files.group;
	}

	protected getPasswordAtRiskType(): Ref<AtRiskType>
	{
		return this.internalActiveAtRiskPasswordGroupType;
	}

	protected getValueAtRiskType(): Ref<AtRiskType>
	{
		return this.internalActiveAtRiskValueGroupType;
	}

	async addGroup(key: string, group: Group): Promise<void>
	{
		const addGroupData = {
			Sync: false,
			Key: key,
			Group: group,
			...stores.getStates()
		};

		const data: any = await window.api.server.group.add(JSON.stringify(addGroupData));
		await stores.handleUpdateStoreResponse(key, data);
	}

	async updateGroup(key: string, updatedGroup: Group): Promise<void>
	{
		const updateGroupData = {
			Sync: false,
			Key: key,
			Group: updatedGroup,
			...stores.getStates()
		};

		const data: any = await window.api.server.group.update(JSON.stringify(updateGroupData));
		await stores.handleUpdateStoreResponse(key, data);
	}

	async deleteGroup(key: string, group: Group): Promise<void>
	{
		const deleteGroupData = {
			Sync: false,
			Key: key,
			Group: group,
			...stores.getStates()
		};

		const data: any = await window.api.server.group.delete(JSON.stringify(deleteGroupData));
		await stores.handleUpdateStoreResponse(key, data);
	}
}

const groupStore = new GroupStore();
export default groupStore;

export type GroupStoreType = typeof groupStore;
