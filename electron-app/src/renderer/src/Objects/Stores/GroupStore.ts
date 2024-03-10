import { ComputedRef, Ref, computed, reactive, ref } from "vue";
import { DataType, Group } from "../../Types/Table";
import { AtRiskType } from "../../Types/EncryptedData";
import { Dictionary } from "../../Types/DataStructures";
import { AuthenticationStore, stores } from ".";
import fileHelper from "@renderer/Helpers/fileHelper";

export interface GroupStoreState
{
	groupHash: string;
	groups: Group[];
	groupsById: Dictionary<Group>;
	emptyPasswordGroups: string[];
	emptyValueGroups: string[];
	duplicatePasswordGroups: Dictionary<string[]>;
	duplicateValueGroups: Dictionary<string[]>;
}

export interface GroupStore extends AuthenticationStore
{
	groups: Group[];
	passwordGroups: Group[];
	activeAtRiskPasswordGroupType: AtRiskType;
	activeAtRiskValueGroupType: AtRiskType;
	emptyPasswordGroups: string[];
	duplicatePasswordGroups: Dictionary<string[]>;
	duplicatePasswordGroupLength: number;
	valuesGroups: Group[];
	emptyValueGroups: string[];
	duplicateValueGroups: Dictionary<string[]>;
	duplicateValueGroupLength: number;
	sortedPasswordsGroups: Group[];
	sortedValuesGroups: Group[];
	addGroup: (key: string, value: Group) => Promise<void>;
	updateGroup: (key: string, updatedGroup: Group) => Promise<void>;
	deleteGroup: (key: string, group: Group) => Promise<void>;
	toggleAtRiskType: (dataType: DataType, atRiskType: AtRiskType) => void;
}

let groupState: GroupStoreState
let loadedFile: boolean = false;

export default function useGroupStore(): GroupStore
{
	groupState = reactive(defaultState());

	function defaultState(): GroupStoreState
	{
		loadedFile = false;
		return {
			groupHash: '',
			groups: [],
			groupsById: {},
			emptyPasswordGroups: [],
			emptyValueGroups: [],
			duplicatePasswordGroups: {},
			duplicateValueGroups: {},
		}
	}

	function toString()
	{
		return JSON.stringify(groupState);
	}

	function getState(): GroupStoreState
	{
		return groupState;
	}

	async function updateState(key: string, state: GroupStoreState): Promise<void>
	{
		Object.assign(groupState, state);
		await writeState(key);
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (loadedFile)
			{
				resolve(true);
			}

			fileHelper.read<GroupStoreState>(key, window.api.files.group).then((state: GroupStoreState) =>
			{
				loadedFile = true;
				Object.assign(groupState, state);

				resolve(true);
			}).catch(() =>
			{
				resolve(false);
			});
		})
	}

	function writeState(key: string): Promise<void>
	{
		if (groupState.groups.length == 0)
		{
			return window.api.files.group.empty();
		}

		return fileHelper.write<GroupStoreState>(key, groupState, window.api.files.group);
	}

	function resetToDefault()
	{
		Object.assign(groupState, defaultState());
	}

	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
	{
		return window.api.files.group.exists();
	}

	function canAuthenticateKeyAfterEntry(): boolean
	{
		return groupState.groups.length > 0;
	}

	async function checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!await readState(key))
		{
			return false;
		}

		let runningKeys: string = "";
		groupState.groups.forEach(g => runningKeys += window.api.utilities.crypt.decrypt(key, g.key));

		return window.api.utilities.hash.hash(runningKeys) === window.api.utilities.crypt.decrypt(key, groupState.groupHash);
	}

	async function checkKeyAfterEntry(key: string): Promise<boolean>
	{
		return await getHash(key) == await window.api.utilities.crypt.decrypt(key, groupState.groupHash);
	}

	async function getHash(key: string): Promise<string>
	{
		let runningKeys: string = "";
		groupState.groups.forEach(async g => runningKeys += await window.api.utilities.crypt.decrypt(key, g.key));

		return await window.api.utilities.hash.hash(runningKeys);
	}

	// --- Public ---
	const passwordGroups: ComputedRef<Group[]> = computed(() => groupState.groups.filter(g => g.type == DataType.Passwords));
	const valuesGroups: ComputedRef<Group[]> = computed(() => groupState.groups.filter(g => g.type == DataType.NameValuePairs));

	const sortedPasswordsGroups: ComputedRef<Group[]> = computed(() => passwordGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));
	const sortedValuesGroups: ComputedRef<Group[]> = computed(() => valuesGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));

	const duplicatePasswordGroupsLength: ComputedRef<number> = computed(() => Object.keys(groupState.duplicatePasswordGroups).length);
	const duplicateValuesGroupsLength: ComputedRef<number> = computed(() => Object.keys(groupState.duplicateValueGroups).length);

	const activeAtRiskPasswordGroupType: Ref<AtRiskType> = ref(AtRiskType.None);
	const activeAtRiskValueGroupType: Ref<AtRiskType> = ref(AtRiskType.None);

	async function addGroup(key: string, group: Group): Promise<void>
	{
		const addGroupData = {
			Sync: false,
			Key: key,
			Group: group,
			...stores.getStates()
		};

		const data: any = await window.api.server.group.add(JSON.stringify(addGroupData));
		await stores.updateAllStates(key, data);
	}

	async function updateGroup(key: string, updatedGroup: Group): Promise<void>
	{
		const updateGroupData = {
			Sync: false,
			Key: key,
			Group: updatedGroup,
			...stores.getStates()
		};

		const data: any = await window.api.server.group.update(JSON.stringify(updateGroupData));
		await stores.updateAllStates(key, data);
	}

	async function deleteGroup(key: string, group: Group): Promise<void>
	{
		const deleteGroupData = {
			Sync: false,
			Key: key,
			Group: group,
			...stores.getStates()
		};

		const data: any = await window.api.server.group.delete(JSON.stringify(deleteGroupData));
		await stores.updateAllStates(key, data);
	}

	function toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.Passwords)
		{
			if (activeAtRiskPasswordGroupType.value != atRiskType)
			{
				activeAtRiskPasswordGroupType.value = atRiskType;
				return;
			}

			activeAtRiskPasswordGroupType.value = AtRiskType.None;
		}
		else if (dataType == DataType.NameValuePairs)
		{
			if (activeAtRiskValueGroupType.value != atRiskType)
			{
				activeAtRiskValueGroupType.value = atRiskType;
				return;
			}

			activeAtRiskValueGroupType.value = AtRiskType.None;
		}
	}

	return {
		get groups() { return groupState.groups; },
		get passwordGroups() { return passwordGroups.value; },
		get activeAtRiskPasswordGroupType() { return activeAtRiskPasswordGroupType.value; },
		get activeAtRiskValueGroupType() { return activeAtRiskValueGroupType.value; },
		get emptyPasswordGroups() { return groupState.emptyPasswordGroups; },
		get duplicatePasswordGroups() { return groupState.duplicatePasswordGroups; },
		get duplicatePasswordGroupLength() { return duplicatePasswordGroupsLength.value; },
		get valuesGroups() { return valuesGroups.value; },
		get emptyValueGroups() { return groupState.emptyValueGroups; },
		get duplicateValueGroups() { return groupState.duplicateValueGroups; },
		get duplicateValueGroupLength() { return duplicateValuesGroupsLength.value; },
		get sortedPasswordsGroups() { return sortedPasswordsGroups.value; },
		get sortedValuesGroups() { return sortedValuesGroups.value },
		getState,
		updateState,
		canAuthenticateKeyBeforeEntry,
		canAuthenticateKeyAfterEntry,
		toString,
		checkKeyBeforeEntry,
		checkKeyAfterEntry,
		readState,
		resetToDefault,
		addGroup,
		updateGroup,
		deleteGroup,
		toggleAtRiskType
	};
}
