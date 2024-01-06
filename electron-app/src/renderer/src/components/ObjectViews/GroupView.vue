<template>
	<ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :label="'Name'" :color="groupColor" v-model="groupState.name"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
		<ColorPickerInputField :label="'Color'" :color="groupColor" v-model="groupState.color"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
		<SearchBar v-model="searchText" :color="groupColor"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '7 / span 3' }" />
		<ObjectSelectorInputField :key="refreshObjects" :border="true" :scrollbar="true" :headerModels="tableHeaderModels"
			:initalSelectedHeader="activeHeader" :models="tableRowDatas" :title="title" :color="groupColor" :maxHeight="300"
			:style="{ 'grid-row': '5 / span 3', 'grid-column': '2 / span 8' }" />
	</ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUpdated, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ObjectSelectorInputField from '../InputFields/ObjectSelectorInputField.vue';

import { DataType, Group } from '../../Types/Table';
import { GridDefinition, SelectableTableRowData, SortableHeaderModel } from '../../Types/Models';
import { HeaderDisplayField, defaultGroup } from '../../Types/EncryptedData';
import { v4 as uuidv4 } from 'uuid';
import { stores } from '../../Objects/Stores';
import { createSortableHeaderModels } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { PasswordStore } from '../../Objects/Stores/PasswordStore';
import { NameValuePairStore } from '../../Objects/Stores/NameValuePairStore';
import { RequestAuthenticationFunctionKey } from '../../Types/Keys';
import SearchBar from '../Table/Controls/SearchBar.vue';

export default defineComponent({
	name: "GroupView",
	components:
	{
		ObjectView,
		TextInputField,
		ColorPickerInputField,
		ObjectSelectorInputField,
		SearchBar
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const refreshKey: Ref<string> = ref("");
		const refreshObjects: Ref<string> = ref("");
		const groupState: Ref<Group> = ref(props.model);
		const groupColor: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.groupsColor);

		const title: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			'Passwords in Group' : 'Values in Group');

		const passwordSortedCollection: SortedCollection<PasswordStore> = new SortedCollection(stores.encryptedDataStore.passwords, "passwordFor");
		const valueSortedCollection: SortedCollection<NameValuePairStore> = new SortedCollection(stores.encryptedDataStore.nameValuePairs, "name");

		let saveSucceeded: (value: boolean) => void;
		let saveFailed: (value: boolean) => void;

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);

		let tableHeaderModels: Ref<SortableHeaderModel[]> = ref([]);
		let tableRowDatas: Ref<SelectableTableRowData[]> = ref([]);

		const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

		const gridDefinition: GridDefinition =
		{
			rows: 10,
			rowHeight: '50px',
			columns: 11,
			columnWidth: '100px'
		};

		const activePasswordHeader: Ref<number> = ref(1);
		const activeValueHeader: Ref<number> = ref(1);
		const activeHeader: ComputedRef<number> = computed(() => stores.appStore.activePasswordValuesTable ==
			DataType.Passwords ? activePasswordHeader.value : activeValueHeader.value);

		const passwordHeaderDisplayFields: HeaderDisplayField[] = [
			{
				backingProperty: "",
				displayName: "",
				width: '50px',
			},
			{
				backingProperty: "passwordFor",
				displayName: "Password For",
				width: '150px',
			},
			{
				backingProperty: "login",
				displayName: "Login",
				width: '150px'
			}
		];

		const valueHeaderDisplayField: HeaderDisplayField[] = [
			{
				backingProperty: "",
				displayName: "",
				width: '50px'
			},
			{
				backingProperty: "name",
				displayName: "Name",
				width: '150px'
			}
		];

		function setHeaderModels(): void
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					tableHeaderModels.value = createSortableHeaderModels<NameValuePairStore>(true,
						activeValueHeader, valueHeaderDisplayField, valueSortedCollection, undefined, setTableRows);
					break;
				case DataType.Passwords:
				default:
					tableHeaderModels.value = createSortableHeaderModels<PasswordStore>(true,
						activePasswordHeader, passwordHeaderDisplayFields, passwordSortedCollection, undefined, setTableRows);
			}
		}

		function setTableRows(): void
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					tableRowDatas.value = valueSortedCollection.calculatedValues.map(nvp =>
					{
						return {
							id: uuidv4(),
							key: nvp.id,
							values: [{
								value: nvp.name,
								copiable: false,
								width: '150px'
							}],
							isActive: ref(groupState.value.nameValuePairs.includes(nvp.id)),
							selectable: true,
							onClick: function ()
							{
								if (groupState.value.nameValuePairs.includes(nvp.id))
								{
									groupState.value.nameValuePairs = groupState.value.nameValuePairs.filter(id => id != nvp.id);
								}
								else
								{
									groupState.value.nameValuePairs.push(nvp.id);
								}
							}
						}
					});
					break;
				case DataType.Passwords:
				default:
					tableRowDatas.value = passwordSortedCollection.calculatedValues.map(p =>
					{
						const model: SelectableTableRowData = {
							id: uuidv4(),
							key: p.id,
							values: [{
								value: p.passwordFor,
								copiable: false,
								width: '150px'
							},
							{
								value: p.login,
								copiable: false,
								width: '150px'
							}],
							isActive: ref(groupState.value.passwords.includes(p.id)),
							selectable: true,
							onClick: function ()
							{
								if (groupState.value.passwords.includes(p.id))
								{
									groupState.value.passwords = groupState.value.passwords.filter(id => id != p.id);
								}
								else
								{
									groupState.value.passwords.push(p.id);
								}
							}
						}
						return model;
					});
			}

			refreshObjects.value = Date.now().toString();
		}

		function onSave()
		{
			if (!stores.settingsStore.requireMasterKeyOnFilterGrouopSave)
			{
				doSave();
				return Promise.resolve(true);
			}

			if (requestAuthFunc)
			{
				requestAuthFunc(doSave, onAuthCanceld);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFailed = reject;
				});
			}

			return Promise.reject(false);
		}

		function doSave()
		{
			if (props.creating)
			{
				stores.groupStore.addGroup(groupState.value);
				groupState.value = defaultGroup(groupState.value.type);
				setTableRows();
				refreshKey.value = Date.now().toString();
			}
			else
			{
				stores.groupStore.updateGroup(groupState.value);
			}

			if (saveSucceeded)
			{
				saveSucceeded(true);
			}
		}

		function onAuthCanceld()
		{
			saveFailed(false);
		}

		onMounted(() =>
		{
			setHeaderModels();
			setTableRows();
		});

		onUpdated(() =>
		{
			setTableRows();
			refreshObjects.value = Date.now().toString();
		});

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
			setHeaderModels();
			setTableRows();
		});

		watch(() => searchText.value.value, (newValue) =>
		{
			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				passwordSortedCollection.search(newValue);
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				valueSortedCollection.search(newValue);
			}

			setTableRows();
		});

		return {
			groupState,
			title,
			groupColor,
			tableHeaderModels,
			activeHeader,
			tableRowDatas,
			refreshKey,
			refreshObjects,
			gridDefinition,
			searchText,
			onSave
		};
	},
})
</script>

<style></style>
