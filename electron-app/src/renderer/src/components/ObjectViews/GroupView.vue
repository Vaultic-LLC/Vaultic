<template>
	<ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :label="'Name'" :color="groupColor" v-model="groupState.name"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '4 / span 2' }" />
		<ColorPickerInputField :label="'Color'" :color="groupColor" v-model="groupState.color"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '4 / span 2' }" />
		<TableTemplate ref="tableRef"
			:style="{ 'position': 'relative', 'grid-row': '5 / span 8', 'grid-column': '4 / span 9' }"
			class="scrollbar border" :scrollbar-size="1" :color="groupColor" :border="true"
			:headerModels="tableHeaderModels" :emptyMessage="emptyMessage"
			:showEmptyMessage="mounted && tableRowDatas.visualValues.length == 0"
			@scrolledToBottom="tableRowDatas.loadNextChunk()">
			<template #header>
				<TableHeaderRow :color="groupColor" :border="true" :model="tableHeaderModels" :tabs="headerTabs">
					<template #controls>
						<SearchBar v-model="searchText" :color="groupColor" />
					</template>
				</TableHeaderRow>
			</template>
			<template #body>
				<SelectableTableRow v-for="(trd, index) in tableRowDatas.visualValues" class="hover" :key="trd.id"
					:rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false"
					:style="{ width: '5%', 'height': '75px' }" :color="groupColor" />
			</template>
		</TableTemplate>
	</ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUpdated, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ObjectSelectorInputField from '../InputFields/ObjectSelectorInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import SelectableTableRow from '../Table/SelectableTableRow.vue';

import { DataType, Group } from '../../Types/Table';
import { GridDefinition, HeaderTabModel, SelectableTableRowData, SortableHeaderModel, TextTableRowValue } from '../../Types/Models';
import { HeaderDisplayField, defaultGroup } from '../../Types/EncryptedData';
import { v4 as uuidv4 } from 'uuid';
import { createSortableHeaderModels, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';
import { useRequestAuthFunction, useLoadingIndicator } from '@renderer/Helpers/injectHelper';
import { stores } from '@renderer/Objects/Stores';
import { ReactivePassword } from '@renderer/Objects/Stores/ReactivePassword';
import { ReactiveValue } from '@renderer/Objects/Stores/ReactiveValue';

export default defineComponent({
	name: "GroupView",
	components:
	{
		ObjectView,
		TextInputField,
		ColorPickerInputField,
		ObjectSelectorInputField,
		SearchBar,
		TableTemplate,
		TableHeaderRow,
		SelectableTableRow
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const refreshKey: Ref<string> = ref("");
		const tableRef: Ref<HTMLElement | null> = ref(null);
		const mounted: Ref<boolean> = ref(false);
		const groupState: Ref<Group> = ref(props.model);
		const groupColor: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.groupsColor);

		const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

		const title: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			'Passwords in Group' : 'Values in Group');

		// @ts-ignore
		const tableRowDatas: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());

		const passwordSortedCollection: SortedCollection<ReactivePassword> = new SortedCollection(stores.passwordStore.passwords, "passwordFor");
		const valueSortedCollection: SortedCollection<ReactiveValue> = new SortedCollection(stores.valueStore.nameValuePairs, "name");

		let saveSucceeded: (value: boolean) => void;
		let saveFailed: (value: boolean) => void;

		const requestAuthFunc = useRequestAuthFunction();
		const [showLoadingIndicator, hideLoadingIndicator] = useLoadingIndicator();

		const emptyMessage: ComputedRef<string> = computed(() =>
		{
			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				return getObjectPopupEmptyTableMessage("Passwords", "Group", "Password");
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				return getObjectPopupEmptyTableMessage("Values", "Group", "Value");
			}

			return "";
		})

		let tableHeaderModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					return createSortableHeaderModels<ReactiveValue>(
						activeValueHeader, valueHeaderDisplayField, valueSortedCollection, undefined, setTableRows);
				case DataType.Passwords:
				default:
					return createSortableHeaderModels<ReactivePassword>(
						activePasswordHeader, passwordHeaderDisplayFields, passwordSortedCollection, undefined, setTableRows);
			}
		});

		let headerTabs: ComputedRef<HeaderTabModel[]> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			passwordHeaderTab : valueHeaderTab);

		const gridDefinition: GridDefinition =
		{
			rows: 12,
			rowHeight: '50px',
			columns: 15,
			columnWidth: '100px'
		};

		const activePasswordHeader: Ref<number> = ref(1);
		const activeValueHeader: Ref<number> = ref(1);
		const activeHeader: ComputedRef<number> = computed(() => stores.appStore.activePasswordValuesTable ==
			DataType.Passwords ? activePasswordHeader.value : activeValueHeader.value);

		const passwordHeaderTab: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Passwords',
				active: computed(() => true),
				color: groupColor,
				onClick: () => { }
			}
		];

		const valueHeaderTab: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Values',
				active: computed(() => true),
				color: groupColor,
				onClick: () => { }
			}
		];

		const passwordHeaderDisplayFields: HeaderDisplayField[] = [
			{
				backingProperty: "",
				displayName: "  ",
				width: '100px',
				clickable: false
			},
			{
				backingProperty: "passwordFor",
				displayName: "Password For",
				width: '150px',
				clickable: true
			},
			{
				backingProperty: "login",
				displayName: "Username",
				width: '150px',
				clickable: true
			}
		];

		const valueHeaderDisplayField: HeaderDisplayField[] = [
			{
				backingProperty: " ",
				displayName: " ",
				width: '100px',
				clickable: false
			},
			{
				backingProperty: "name",
				displayName: "Name",
				width: '150px',
				clickable: true
			},
			{
				displayName: "Type",
				backingProperty: "valueType",
				width: '150px',
				clickable: true
			}
		];

		function setTableRows(): void
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					tableRowDatas.value.setValues(valueSortedCollection.calculatedValues.map(nvp =>
					{
						const values: TextTableRowValue[] = [
							{
								component: "TableRowTextValue",
								value: nvp.name,
								copiable: false,
								width: '150px'
							},
							{
								component: 'TableRowTextValue',
								value: nvp.valueType ?? '',
								copiable: false,
								width: '150px'
							}
						]

						return {
							id: uuidv4(),
							key: nvp.id,
							values: values,
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
					}));
					break;
				case DataType.Passwords:
				default:
					tableRowDatas.value.setValues(passwordSortedCollection.calculatedValues.map(p =>
					{
						const values: TextTableRowValue[] = [
							{
								component: "TableRowTextValue",
								value: p.passwordFor,
								copiable: false,
								width: '150px'
							},
							{
								component: "TableRowTextValue",
								value: p.login,
								copiable: false,
								width: '150px'
							}
						];

						const model: SelectableTableRowData = {
							id: uuidv4(),
							key: p.id,
							values: values,
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
					}));
			}

			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(groupColor.value, doSave, onAuthCanceld);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFailed = reject;
				});
			}

			return Promise.reject(false);
		}

		async function doSave(key: string)
		{
			showLoadingIndicator(groupColor.value, "Saving Group");
			if (props.creating)
			{
				await stores.groupStore.addGroup(key, groupState.value);
				groupState.value = defaultGroup(groupState.value.type);
				setTableRows();
				refreshKey.value = Date.now().toString();
			}
			else
			{
				await stores.groupStore.updateGroup(key, groupState.value);
			}

			hideLoadingIndicator();
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
			setTableRows();
			mounted.value = true;
		});

		onUpdated(() =>
		{
			setTableRows();
		});

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
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
			gridDefinition,
			searchText,
			headerTabs,
			emptyMessage,
			mounted,
			tableRef,
			onSave
		};
	},
})
</script>

<style></style>
