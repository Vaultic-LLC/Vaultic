import { ComputedRef, computed, reactive } from "vue";
import { DataType, Group } from "../../Types/Table";
import { AtRiskType, IGroupable, IIdentifiable } from "../../Types/EncryptedData";
import { Dictionary } from "../../Types/DataStructures";
import { AuthenticationStore, stores } from ".";
import File from "../Files/File"
import cryptUtility from "@renderer/Utilities/CryptUtility";
import hashUtility from "@renderer/Utilities/HashUtility";
import generator from "../../Utilities/Generator";

interface GroupState
{
	loadedFile: boolean;
	groupHash: string;
	groups: Group[];
	groupsById: Dictionary<Group>;
	activeAtRiskPasswordGroupType: AtRiskType;
	activeAtRiskValueGroupType: AtRiskType;
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
	syncGroupsAfterPasswordOrValueWasAdded: <T extends IGroupable & IIdentifiable>(dataType: DataType, value: T) => void;
	syncGroupsAfterPasswordOrValueWasUpdated: (dataType: DataType, addedGroups: string[], removedGroups: string[], valueId: string) => void;
	removeValueFromGroups: <T extends IGroupable & IIdentifiable>(dataType: DataType, value: T) => void;
	toggleAtRiskType: (dataType: DataType, atRiskType: AtRiskType) => void;
}

const groupFile: File = new File("groups");
let groupState: GroupState

export default function useGroupStore(): GroupStore
{
	groupState = reactive(defaultState());

	function defaultState(): GroupState
	{
		return {
			loadedFile: false,
			groupHash: '',
			groups: [],
			groupsById: {},
			activeAtRiskPasswordGroupType: AtRiskType.None,
			activeAtRiskValueGroupType: AtRiskType.None,
			emptyPasswordGroups: [],
			emptyValueGroups: [],
			duplicatePasswordGroups: {},
			duplicateValueGroups: {},
		}
	}

	function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (groupState.loadedFile)
			{
				resolve(true);
			}

			groupFile.read<GroupState>(key).then((state: GroupState) =>
			{
				state.loadedFile = true;
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
			return groupFile.empty();
		}

		return groupFile.write<GroupState>(key, groupState);
	}

	function resetToDefault()
	{
		Object.assign(groupState, defaultState());
	}

	function canAuthenticateKeyBeforeEntry(): Promise<boolean>
	{
		return groupFile.exists();
	}

	function canAuthenticateKeyAfterEntry(): boolean
	{
		return groupState.groupHash != "";
	}

	async function checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!await readState(key))
		{
			return false;
		}

		let runningKeys: string = "";
		groupState.groups.forEach(g => runningKeys += cryptUtility.decrypt(key, g.key));

		return hashUtility.hash(runningKeys) === cryptUtility.decrypt(key, groupState.groupHash);
	}

	function checkKeyAfterEntry(key: string): boolean
	{
		return getHash(key) == cryptUtility.decrypt(key, groupState.groupHash);
	}

	function getHash(key: string): string
	{
		let runningKeys: string = "";
		groupState.groups.forEach(g => runningKeys += cryptUtility.decrypt(key, g.key));

		return hashUtility.hash(runningKeys);
	}

	function updateHash(key: string, group: Group | undefined = undefined)
	{
		let runningKeys: string = "";
		groupState.groups.forEach(g => runningKeys += cryptUtility.decrypt(key, g.key));

		if (groupState.groupHash === "" || cryptUtility.decrypt(key, groupState.groupHash) === hashUtility.hash(runningKeys))
		{
			if (group && group.key)
			{
				runningKeys += group.key;
			}

			groupState.groupHash = cryptUtility.encrypt(key, hashUtility.hash(runningKeys));
		}
	}

	function getDuplicateGroups(group: Group, groupValues: string, allGroups: Group[]): string[]
	{
		if (group[groupValues].length == 0)
		{
			return allGroups.filter(g => g[groupValues].length == 0 && g.id != group.id).map(g => g.id);
		}

		let potentialDuplicateGroups: Group[] = allGroups.filter(g => g.id != group.id && g[groupValues].length == group[groupValues].length);
		for (let i = 0; i < group[groupValues].length; i++)
		{
			if (potentialDuplicateGroups.length == 0)
			{
				return [];
			}

			potentialDuplicateGroups = potentialDuplicateGroups.filter(g => g[groupValues].includes(group[groupValues][i]));
		}

		return potentialDuplicateGroups.map(g => g.id);
	}

	function checkAddRemoveDuplicateGroup(group: Group, groupValues: string, allGroups: Group[], duplicateGroups: Dictionary<string[]>)
	{
		if (!duplicateGroups[group.id])
		{
			duplicateGroups[group.id] = [];
		}

		const newDuplicateGroups: string[] = getDuplicateGroups(group, groupValues, allGroups);
		const addedDuplicateGroups: string[] = newDuplicateGroups.filter(g => !duplicateGroups[group.id].includes(g));
		const removedDuplicateGroups: string[] = duplicateGroups[group.id].filter(g => !newDuplicateGroups.includes(g));

		// nothing changed, everything is still good
		if (newDuplicateGroups.length == 0 && duplicateGroups[group.id].length == 0)
		{
			delete duplicateGroups[group.id];
			return;
		}

		// add all new duplicate groups
		addedDuplicateGroups.forEach(g =>
		{
			if (!duplicateGroups[group.id].includes(g))
			{
				duplicateGroups[group.id].push(g);
			}

			if (!duplicateGroups[g])
			{
				duplicateGroups[g] = [];
			}

			if (!duplicateGroups[g].includes(group.id))
			{
				duplicateGroups[g].push(group.id);
			}
		});

		// remove all duplicates group that are no longer duplciate. Delete property if its now empty
		removedDuplicateGroups.forEach(g =>
		{
			if (duplicateGroups[group.id].includes(g))
			{
				duplicateGroups[group.id].splice(duplicateGroups[group.id].indexOf(g), 1);
			}

			if (duplicateGroups[g].includes(group.id))
			{
				duplicateGroups[g].splice(duplicateGroups[g].indexOf(group.id), 1);
				if (duplicateGroups[g].length == 0)
				{
					delete duplicateGroups[g];
				}
			}
		});

		// delete property if its now empty
		if (duplicateGroups[group.id].length == 0)
		{
			delete duplicateGroups[group.id];
		}
	}

	function removeDuplicateGroup(group: Group, duplicateGroups: Dictionary<string[]>)
	{
		if (!duplicateGroups[group.id])
		{
			return;
		}

		duplicateGroups[group.id].forEach(g =>
		{
			if (!duplicateGroups[g])
			{
				return;
			}

			if (duplicateGroups[g].includes(group.id))
			{
				duplicateGroups[g].splice(duplicateGroups[g].indexOf(group.id), 1);
			}

			if (duplicateGroups[g].length == 0)
			{
				delete duplicateGroups[g];
			}
		});

		delete duplicateGroups[group.id];
	}

	// --- Public ---
	const passwordGroups: ComputedRef<Group[]> = computed(() => groupState.groups.filter(g => g.type == DataType.Passwords));
	const valuesGroups: ComputedRef<Group[]> = computed(() => groupState.groups.filter(g => g.type == DataType.NameValuePairs));

	const sortedPasswordsGroups: ComputedRef<Group[]> = computed(() => passwordGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));
	const sortedValuesGroups: ComputedRef<Group[]> = computed(() => valuesGroups.value.sort((a, b) => a.name >= b.name ? 1 : -1));

	const duplicatePasswordGroupsLength: ComputedRef<number> = computed(() => Object.keys(groupState.duplicatePasswordGroups).length);
	const duplicateValuesGroupsLength: ComputedRef<number> = computed(() => Object.keys(groupState.duplicateValueGroups).length);

	async function addGroup(key: string, group: Group): Promise<void>
	{
		group.id = generator.uniqueId(groupState.groups);
		group.key = generator.randomValue(30);

		groupState.groups.push(group);
		groupState.groupsById[group.id] = group;

		if (group.type == DataType.Passwords)
		{
			if (group.passwords.length == 0)
			{
				groupState.emptyPasswordGroups.push(group.id);
			}
			else
			{
				group.passwords.forEach(p => stores.encryptedDataStore.passwords.filter(pw => pw.id == p)[0].groups.push(group.id));
			}

			const duplicateGroups: string[] = getDuplicateGroups(group, "passwords", passwordGroups.value);
			if (duplicateGroups.length > 0)
			{
				groupState.duplicatePasswordGroups[group.id] = duplicateGroups;
				groupState.duplicatePasswordGroups[group.id].forEach(g =>
				{
					if (!groupState.duplicatePasswordGroups[g])
					{
						groupState.duplicatePasswordGroups[g] = [];
					}

					groupState.duplicatePasswordGroups[g].push(group.id);
				});
			}
		}
		else if (group.type == DataType.NameValuePairs)
		{
			if (group.nameValuePairs.length == 0)
			{
				groupState.emptyValueGroups.push(group.id);
			}
			else
			{
				group.nameValuePairs.forEach(nvp => stores.encryptedDataStore.nameValuePairs.filter(nvpp => nvpp.id == nvp)[0].groups.push(group.id));
			}

			const duplicateGroups: string[] = getDuplicateGroups(group, "nameValuePairs", valuesGroups.value);
			if (duplicateGroups.length > 0)
			{
				groupState.duplicateValueGroups[group.id] = duplicateGroups;
				groupState.duplicateValueGroups[group.id].forEach(g =>
				{
					if (!groupState.duplicateValueGroups[g])
					{
						groupState.duplicateValueGroups[g] = [];
					}

					groupState.duplicateValueGroups[g].push(group.id);
				});
			}
		}

		updateHash(key, group);
		group.key = cryptUtility.encrypt(key, group.key);

		await writeState(key);
	}

	async function updateGroup(key: string, updatedGroup: Group): Promise<void>
	{
		if (updatedGroup.type == DataType.Passwords)
		{
			const addedPasswords: string[] = updatedGroup.passwords.filter(p => !groupState.groupsById[updatedGroup.id].passwords.includes(p))
			const removedPasswords: string[] = groupState.groupsById[updatedGroup.id].passwords.filter(p => !updatedGroup.passwords.includes(p));

			stores.encryptedDataStore.addRemoveGroupsFromPasswordValue(addedPasswords, removedPasswords, updatedGroup);

			Object.assign(groupState.groupsById[updatedGroup.id], updatedGroup);
			Object.assign(groupState.groups.filter(g => g.id == updatedGroup.id)[0], updatedGroup);

			stores.filterStore.recalcGroupFilters(stores.filterStore.passwordFilters, stores.encryptedDataStore.passwords, "passwords");

			checkAddRemoveFromEmptyGroups(stores.encryptedDataStore.passwords, groupState.emptyPasswordGroups);
			checkAddRemoveDuplicateGroup(updatedGroup, "passwords", passwordGroups.value, groupState.duplicatePasswordGroups);
		}
		else if (updatedGroup.type == DataType.NameValuePairs)
		{
			const addedValues: string[] = updatedGroup.nameValuePairs.filter(p => !groupState.groupsById[updatedGroup.id].nameValuePairs.includes(p))
			const removedValues: string[] = groupState.groupsById[updatedGroup.id].nameValuePairs.filter(p => !updatedGroup.nameValuePairs.includes(p));

			stores.encryptedDataStore.addRemoveGroupsFromPasswordValue(addedValues, removedValues, updatedGroup);

			Object.assign(groupState.groupsById[updatedGroup.id], updatedGroup);
			Object.assign(groupState.groups.filter(g => g.id == updatedGroup.id)[0], updatedGroup);

			stores.filterStore.recalcGroupFilters(stores.filterStore.nameValuePairFilters, stores.encryptedDataStore.nameValuePairs, "nameValuePairs");

			checkAddRemoveFromEmptyGroups(stores.encryptedDataStore.nameValuePairs, groupState.emptyValueGroups);
			checkAddRemoveDuplicateGroup(updatedGroup, "nameValuePairs", valuesGroups.value, groupState.duplicateValueGroups);
		}

		function checkAddRemoveFromEmptyGroups<T extends IGroupable>(values: T[], emptyGroups: string[])
		{
			if (values.filter(v => v.groups.includes(updatedGroup.id)).length == 0)
			{
				if (!emptyGroups.includes(updatedGroup.id))
				{
					emptyGroups.push(updatedGroup.id);
				}
			}
			else
			{
				if (emptyGroups.includes(updatedGroup.id))
				{
					emptyGroups.splice(emptyGroups.indexOf(updatedGroup.id), 1);
				}
			}
		}

		await writeState(key);
	}

	async function deleteGroup(key: string, group: Group): Promise<void>
	{
		groupState.groups.splice(groupState.groups.indexOf(group), 1);
		stores.encryptedDataStore.removeGroupFromValues(group);

		if (group.type == DataType.Passwords)
		{
			if (groupState.emptyPasswordGroups.includes(group.id))
			{
				groupState.emptyPasswordGroups.splice(groupState.emptyPasswordGroups.indexOf(group.id), 1);
			}

			removeDuplicateGroup(group, groupState.duplicatePasswordGroups);
		}
		else if (group.type == DataType.NameValuePairs)
		{
			if (groupState.emptyValueGroups.includes(group.id))
			{
				groupState.emptyValueGroups.splice(groupState.emptyValueGroups.indexOf(group.id), 1);
			}

			removeDuplicateGroup(group, groupState.duplicateValueGroups);
		}

		groupState.groupHash = cryptUtility.encrypt(key, getHash(key));
		await writeState(key);
	}

	// called when adding password or value
	function syncGroupsAfterPasswordOrValueWasAdded<T extends IGroupable & IIdentifiable>(dataType: DataType, value: T)
	{
		let emptyGroups: string[];
		let duplicateGroups: Dictionary<string[]>;
		let allGroups: Group[];
		let groupValue: string;

		if (dataType == DataType.Passwords)
		{
			emptyGroups = groupState.emptyPasswordGroups;
			duplicateGroups = groupState.duplicatePasswordGroups;
			allGroups = passwordGroups.value;
			groupValue = "passwords";
		}
		else if (dataType == DataType.NameValuePairs)
		{
			emptyGroups = groupState.emptyValueGroups;
			duplicateGroups = groupState.duplicateValueGroups;
			allGroups = valuesGroups.value;
			groupValue = "nameValuePairs";
		}

		value.groups.forEach(g =>
		{
			const currentGroup: Group = groupState.groupsById[g];
			currentGroup[groupValue].push(value.id);

			if (emptyGroups.includes(g))
			{
				emptyGroups.splice(emptyGroups.indexOf(g), 1);
			}

			checkAddRemoveDuplicateGroup(currentGroup, groupValue, allGroups, duplicateGroups);
		});
	}

	function syncGroupsAfterPasswordOrValueWasUpdated(dataType: DataType, addedGroups: string[], removedGroups: string[], valueId: string)
	{
		let emptyGroups: string[];
		let duplicateGroups: Dictionary<string[]>;
		let allGroups: Group[];
		let groupValue: string;

		if (dataType == DataType.Passwords)
		{
			emptyGroups = groupState.emptyPasswordGroups;
			duplicateGroups = groupState.duplicatePasswordGroups;
			allGroups = passwordGroups.value;
			groupValue = "passwords";
		}
		else if (dataType == DataType.NameValuePairs)
		{
			emptyGroups = groupState.emptyValueGroups;
			duplicateGroups = groupState.duplicateValueGroups;
			allGroups = valuesGroups.value;
			groupValue = "nameValuePairs";
		}

		addedGroups.forEach(g =>
		{
			const group: Group = groupState.groupsById[g];
			if (!group[groupValue].includes(valueId))
			{
				group[groupValue].push(valueId);
			}

			syncComputedProperties(group);
		});

		removedGroups.forEach(g =>
		{
			const group: Group = groupState.groupsById[g];
			if (group[groupValue].includes(valueId))
			{
				group[groupValue].splice(group[groupValue].indexOf(valueId), 1);
			}

			syncComputedProperties(group);
		})

		function syncComputedProperties(group: Group)
		{
			if (group[groupValue].length == 0)
			{
				if (!emptyGroups.includes(group.id))
				{
					emptyGroups.push(group.id);
				}
			}
			else
			{
				if (emptyGroups.includes(group.id))
				{
					emptyGroups.splice(emptyGroups.indexOf(group.id), 1);
				}
			}

			checkAddRemoveDuplicateGroup(group, groupValue, allGroups, duplicateGroups);
		}
	}

	function removeValueFromGroups<T extends IGroupable & IIdentifiable>(dataType: DataType, value: T)
	{
		if (dataType == DataType.Passwords)
		{
			passwordGroups.value.forEach(g =>
			{
				if (g.passwords.includes(value.id))
				{
					g.passwords.splice(g.passwords.indexOf(value.id), 1);
					if (g.passwords.length == 0 && !groupState.emptyPasswordGroups.includes(g.id))
					{
						groupState.emptyPasswordGroups.push(g.id);
					}

					checkAddRemoveDuplicateGroup(g, "passwords", passwordGroups.value, groupState.duplicatePasswordGroups);
				}
			});
		}
		else if (dataType == DataType.NameValuePairs)
		{
			valuesGroups.value.forEach(g =>
			{
				if (g.nameValuePairs.includes(value.id))
				{
					g.nameValuePairs.splice(g.nameValuePairs.indexOf(value.id), 1);
					if (g.nameValuePairs.length == 0 && !groupState.emptyValueGroups.includes(g.id))
					{
						groupState.emptyValueGroups.push(g.id);
					}

					checkAddRemoveDuplicateGroup(g, "nameValuePairs", valuesGroups.value, groupState.duplicateValueGroups);
				}
			});
		}
	}

	function toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
	{
		if (dataType == DataType.Passwords)
		{
			if (groupState.activeAtRiskPasswordGroupType != atRiskType)
			{
				groupState.activeAtRiskPasswordGroupType = atRiskType;
				return;
			}

			groupState.activeAtRiskPasswordGroupType = AtRiskType.None;
		}
		else if (dataType == DataType.NameValuePairs)
		{
			if (groupState.activeAtRiskValueGroupType != atRiskType)
			{
				groupState.activeAtRiskValueGroupType = atRiskType;
				return;
			}

			groupState.activeAtRiskValueGroupType = AtRiskType.None;
		}
	}

	return {
		get groups() { return groupState.groups; },
		get passwordGroups() { return passwordGroups.value; },
		get activeAtRiskPasswordGroupType() { return groupState.activeAtRiskPasswordGroupType; },
		get activeAtRiskValueGroupType() { return groupState.activeAtRiskValueGroupType; },
		get emptyPasswordGroups() { return groupState.emptyPasswordGroups; },
		get duplicatePasswordGroups() { return groupState.duplicatePasswordGroups; },
		get duplicatePasswordGroupLength() { return duplicatePasswordGroupsLength.value; },
		get valuesGroups() { return valuesGroups.value; },
		get emptyValueGroups() { return groupState.emptyValueGroups; },
		get duplicateValueGroups() { return groupState.duplicateValueGroups; },
		get duplicateValueGroupLength() { return duplicateValuesGroupsLength.value; },
		get sortedPasswordsGroups() { return sortedPasswordsGroups.value; },
		get sortedValuesGroups() { return sortedValuesGroups.value },
		canAuthenticateKeyBeforeEntry,
		canAuthenticateKeyAfterEntry,
		checkKeyBeforeEntry,
		checkKeyAfterEntry,
		readState,
		resetToDefault,
		addGroup,
		updateGroup,
		syncGroupsAfterPasswordOrValueWasAdded,
		syncGroupsAfterPasswordOrValueWasUpdated,
		removeValueFromGroups,
		deleteGroup,
		toggleAtRiskType
	};
}
