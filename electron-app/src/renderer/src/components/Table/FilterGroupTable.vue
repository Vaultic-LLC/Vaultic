<template>
	<div id="filterGroupTableContainer">
		<TableTemplate :name="'filterGroup'" ref="tableRef" :rowGap="0" class="shadow scrollbar" id="filterTable"
			:color="color" :headerModels="headerModels" :scrollbar-size="1" :emptyMessage="emptyTableMessage"
			:showEmptyMessage="tableRowDatas.visualValues.length == 0" :headerTabs="headerTabs"
			@scrolledToBottom="tableRowDatas.loadNextChunk()">
			<template #headerControls>
				<SearchBar v-model="currentSearchText" :color="color" :width="'9vw'" :maxWidth="'250px'"
					:minWidth="'100px'" :minHeight="'25px'" />
				<AddDataTableItemButton :color="color" :initalActiveContentOnClick="tabToOpenOnAdd" />
			</template>
			<template #body>
				<SelectableTableRow class="shadow hover" v-for="(trd, index) in tableRowDatas.visualValues"
					:key="trd.id" :rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false"
					:color="color" :allowPin="true" :allowEdit="true" :allowDelete="true" />
			</template>
		</TableTemplate>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditGroupPopup" :closePopup="onEditGroupPopupClosed" :minWidth="'800px'"
					:minHeight="'480px'">
					<EditGroupPopup :model="currentlyEditingGroupModel" />
				</ObjectPopup>
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditFilterPopup" :closePopup="onEditFilterPopupClosed" :minWidth="'800px'"
					:minHeight="'480px'">
					<EditFilterPopup :model="currentlyEditingFilterModel" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import TableTemplate from './TableTemplate.vue';
import TableHeaderRow from './Header/TableHeaderRow.vue';
import SelectableTableRow from './SelectableTableRow.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import EditGroupPopup from '../ObjectPopups/EditPopups/EditGroupPopup.vue';
import EditFilterPopup from '../ObjectPopups/EditPopups/EditFilterPopup.vue';
import SearchBar from './Controls/SearchBar.vue';
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';

import { DataType, Filter, Group } from '../../Types/Table';
import { HeaderTabModel, SelectableTableRowData, SortableHeaderModel, emptyHeader } from '../../Types/Models';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { HeaderDisplayField } from '../../Types/EncryptedData';
import { createPinnableSelectableTableRowModels, createSortableHeaderModels, getEmptyTableMessage } from '../../Helpers/ModelHelper';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: 'FilterGroupTable',
	components:
	{
		TableTemplate,
		SelectableTableRow,
		TableHeaderRow,
		AddDataTableItemButton,
		ObjectPopup,
		EditGroupPopup,
		EditFilterPopup,
		SearchBar
	},
	setup()
	{
		const tableRef: Ref<null> = ref(null);
		const tabToOpenOnAdd: ComputedRef<number> = computed(() => stores.appStore.activeFilterGroupsTable);

		const passwordFilters: SortedCollection<Filter> = new SortedCollection(
			stores.filterStore.passwordFilters, "name");
		const pinnedPasswordFilters: SortedCollection<Filter> = new SortedCollection(
			[], "name");

		const passwordGroups: SortedCollection<Group> = new SortedCollection(
			stores.groupStore.passwordGroups, "name");
		const pinnedPasswordGroups: SortedCollection<Group> = new SortedCollection(
			[], "name");

		const valueFilters: SortedCollection<Filter> = new SortedCollection(
			stores.filterStore.nameValuePairFilters, "name");
		const pinnedValueFilters: SortedCollection<Filter> = new SortedCollection(
			[], "name");

		const valueGroups: SortedCollection<Group> = new SortedCollection(
			stores.groupStore.valuesGroups, "name");
		const pinnedValueGroups: SortedCollection<Group> = new SortedCollection(
			[], "name");

		const currentFilters: ComputedRef<SortedCollection<Filter>> = computed(() =>
			stores.appStore.activePasswordValuesTable == DataType.Passwords ? passwordFilters : valueFilters);
		const currentPinnedFilter: ComputedRef<SortedCollection<Filter>> = computed(() =>
			stores.appStore.activePasswordValuesTable == DataType.Passwords ? pinnedPasswordFilters : pinnedValueFilters);

		const currentGroups: ComputedRef<SortedCollection<Group>> = computed(() =>
			stores.appStore.activePasswordValuesTable == DataType.Passwords ? passwordGroups : valueGroups);
		const currentPinnedGroups: ComputedRef<SortedCollection<Group>> = computed(() =>
			stores.appStore.activePasswordValuesTable == DataType.Passwords ? pinnedPasswordGroups : pinnedValueGroups);

		const tableRowDatas: Ref<InfiniteScrollCollection<SelectableTableRowData>> | any = ref(new InfiniteScrollCollection<SelectableTableRowData>());

		const showEditGroupPopup: Ref<boolean> = ref(false);
		const currentlyEditingGroupModel: Ref<Group | any> = ref({});

		const showEditFilterPopup: Ref<boolean> = ref(false);
		const currentlyEditingFilterModel: Ref<Filter | any> = ref({});

		const filterSearchText: Ref<string> = ref('');
		const groupSearchText: Ref<string> = ref('');
		const currentSearchText: ComputedRef<Ref<string>> = computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters ?
			filterSearchText : groupSearchText);

		let deleteFilter: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());
		let deleteGroup: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());

		const emptyTableMessage: ComputedRef<string> = computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters ?
			getEmptyTableMessage(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Password Filters" : "Value Filters") :
			getEmptyTableMessage(stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Password Groups" : "Value Groups")
		);

		const color: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activeFilterGroupsTable)
			{
				case DataType.Groups:
					return stores.userPreferenceStore.currentColorPalette.groupsColor;
				case DataType.Filters:
				default:
					return stores.userPreferenceStore.currentColorPalette.filtersColor;
			}
		});

		const headerTabs: HeaderTabModel[] = [
			{
				name: 'Filters',
				active: computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters),
				color: computed(() => stores.userPreferenceStore.currentColorPalette.filtersColor),
				onClick: () => { stores.appStore.activeFilterGroupsTable = DataType.Filters; }
			},
			{
				name: 'Groups',
				active: computed(() => stores.appStore.activeFilterGroupsTable == DataType.Groups),
				color: computed(() => stores.userPreferenceStore.currentColorPalette.groupsColor),
				onClick: () => { stores.appStore.activeFilterGroupsTable = DataType.Groups; }
			}
		];

		const filterHeaderDisplayField: HeaderDisplayField[] = [
			{
				displayName: "Active",
				backingProperty: "isActive",
				width: 'clamp(60px, 4.3vw, 112px)',
				padding: 'clamp(5px, 0.5vw, 12px)',
				clickable: true
			},
			{
				displayName: "Name",
				backingProperty: "name",
				width: 'clamp(60px, 4.3vw, 100px)',
				clickable: true
			}
		];

		const groupHeaderDisplayField: HeaderDisplayField[] = [
			{
				displayName: "Name",
				backingProperty: "name",
				width: 'clamp(60px, 4.3vw, 112px)',
				padding: 'clamp(5px, 0.5vw, 12px)',
				clickable: true
			},
			{
				displayName: "Color",
				backingProperty: "color",
				width: 'clamp(60px, 4.3vw, 100px)',
				clickable: true
			}
		];

		const activePasswordFilterHeader: Ref<number> = ref(1);
		const passwordFilterHeaders: SortableHeaderModel[] = createSortableHeaderModels<Filter>(activePasswordFilterHeader, filterHeaderDisplayField, currentFilters.value,
			currentPinnedFilter.value, setTableRowDatas);
		passwordFilterHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const activeValueFilterHeader: Ref<number> = ref(1);
		const valueFilterHeaders: SortableHeaderModel[] = createSortableHeaderModels<Filter>(activeValueFilterHeader, filterHeaderDisplayField, currentFilters.value,
			currentPinnedFilter.value, setTableRowDatas);
		valueFilterHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const passwordGroupHeaders: SortableHeaderModel[] = createSortableHeaderModels<Group>(ref(0), groupHeaderDisplayField,
			currentGroups.value, currentPinnedGroups.value, setTableRowDatas);
		passwordGroupHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const valueGroupHeaders: SortableHeaderModel[] = createSortableHeaderModels<Group>(ref(0), groupHeaderDisplayField,
			currentGroups.value, currentPinnedGroups.value, setTableRowDatas);
		valueGroupHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const headerModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
		{
			switch (stores.appStore.activeFilterGroupsTable)
			{
				case DataType.Groups:
					if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
					{
						return passwordGroupHeaders;
					}

					return valueGroupHeaders;
				case DataType.Filters:
				default:
					if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
					{
						return passwordFilterHeaders;
					}

					return valueFilterHeaders;
			}
		});

		function setTableRowDatas()
		{
			switch (stores.appStore.activeFilterGroupsTable)
			{
				case DataType.Groups:
					createPinnableSelectableTableRowModels<Group>(DataType.Groups, stores.appStore.activePasswordValuesTable, tableRowDatas,
						currentGroups.value, currentPinnedGroups.value, (g: Group) =>
					{
						return [{ component: 'TableRowTextValue', value: g.name, copiable: false, width: 'calc(clamp(60px, 4.3vw, 112px) - clamp(5px, 0.5vw, 12px))', margin: true },
						{ component: "TableRowColorValue", color: g.color, copiable: true, width: 'clamp(60px, 4.3vw, 100px)', margin: false }]
					},
						false, "", false, undefined, onEditGroup,
						onGroupDeleteInitiated);
					break;
				case DataType.Filters:
				default:
					createPinnableSelectableTableRowModels<Filter>(DataType.Filters, stores.appStore.activePasswordValuesTable,
						tableRowDatas, currentFilters.value, currentPinnedFilter.value, (f: Filter) =>
					{ return [{ component: 'TableRowTextValue', value: f.name, copiable: false, width: 'clamp(60px, 4.3vw, 100px)' }] },
						true, "isActive", true, (f: Filter) => stores.filterStore.toggleFilter(f.id), onEditFilter, onFilterDeleteInitiated);
			}

			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		function onEditGroup(group: Group)
		{
			currentlyEditingGroupModel.value = group;
			showEditGroupPopup.value = true;
		}

		function onEditGroupPopupClosed(saved: boolean)
		{
			showEditGroupPopup.value = false;

			if (saved)
			{
				passwordGroups.updateValues(stores.groupStore.unpinnedPasswordGroups);
				pinnedPasswordGroups.updateValues(stores.groupStore.pinnedPasswordGroups);

				valueGroups.updateValues(stores.groupStore.unpinnedValueGroups);
				pinnedValueGroups.updateValues(stores.groupStore.pinnedValueGroups);

				setTableRowDatas();
			}
		}

		function onEditFilter(filter: Filter)
		{
			currentlyEditingFilterModel.value = filter;
			showEditFilterPopup.value = true;
		}

		function onEditFilterPopupClosed(saved: boolean)
		{
			showEditFilterPopup.value = false;

			if (saved)
			{
				passwordFilters.updateValues(stores.filterStore.unpinnedPasswordFilters);
				pinnedPasswordFilters.updateValues(stores.filterStore.pinnedPasswordFilters);

				valueFilters.updateValues(stores.filterStore.unpinnedValueFitlers);
				pinnedValueFilters.updateValues(stores.filterStore.pinnedValueFilters);

				setTableRowDatas();
			}
		}

		function onFilterDeleteInitiated(filter: Filter)
		{
			deleteFilter.value = async (key: string) =>
			{
				return await stores.filterStore.deleteFilter(key, filter);
			}

			stores.popupStore.showRequestAuthentication(color.value, onFilterDeleteConfirmed, () => { });
		}

		async function onFilterDeleteConfirmed(key: string)
		{
			stores.popupStore.showLoadingIndicator(color.value, "Deleting Filter");
			const succeeded = await deleteFilter.value(key);
			stores.popupStore.hideLoadingIndicator();

			if (succeeded)
			{
				stores.popupStore.showToast(color.value, "Filter Deleted Successfully", true);
			}
			else
			{
				stores.popupStore.showToast(color.value, "Filter Delete Failed", false);
			}
		}

		function onGroupDeleteInitiated(group: Group)
		{
			deleteGroup.value = async (key: string) =>
			{
				return await stores.groupStore.deleteGroup(key, group);
			}

			stores.popupStore.showRequestAuthentication(color.value, onGroupDeleteConfirmed, () => { });
		}

		async function onGroupDeleteConfirmed(key: string)
		{
			stores.popupStore.showLoadingIndicator(color.value, "Deleting Group");
			const succeeded = await deleteGroup.value(key);
			stores.popupStore.hideLoadingIndicator();

			if (succeeded)
			{
				stores.popupStore.showToast(color.value, "Group Deleted Sucessfully", true);
			}
			else
			{
				stores.popupStore.showToast(color.value, "Group Delete Failed", false);
			}
		}

		onMounted(() =>
		{
			setTableRowDatas();
		});

		watch(() => stores.appStore.activeFilterGroupsTable, () =>
		{
			setTableRowDatas();
		});

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
			setTableRowDatas();
		});

		watch(() => stores.filterStore.passwordFilters.length, () =>
		{
			passwordFilters.updateValues(stores.filterStore.unpinnedPasswordFilters);
			pinnedPasswordFilters.updateValues(stores.filterStore.pinnedPasswordFilters)
			setTableRowDatas();
		});

		watch(() => stores.filterStore.nameValuePairFilters.length, () =>
		{
			valueFilters.updateValues(stores.filterStore.unpinnedValueFitlers);
			pinnedValueFilters.updateValues(stores.filterStore.pinnedValueFilters)
			setTableRowDatas();
		});

		watch(() => stores.groupStore.passwordGroups.length, () =>
		{
			passwordGroups.updateValues(stores.groupStore.unpinnedPasswordGroups);
			pinnedPasswordGroups.updateValues(stores.groupStore.pinnedPasswordGroups);
			setTableRowDatas();
		});

		watch(() => stores.groupStore.valuesGroups.length, () =>
		{
			valueGroups.updateValues(stores.groupStore.unpinnedValueGroups);
			pinnedValueGroups.updateValues(stores.groupStore.pinnedValueGroups);
			setTableRowDatas();
		});

		watch(() => stores.groupStore.activeAtRiskPasswordGroupType, () =>
		{
			passwordGroups.updateValues(stores.groupStore.unpinnedPasswordGroups);
			pinnedPasswordGroups.updateValues(stores.groupStore.pinnedPasswordGroups);
			setTableRowDatas();
		});

		watch(() => stores.groupStore.activeAtRiskValueGroupType, () =>
		{
			valueGroups.updateValues(stores.groupStore.unpinnedValueGroups);
			pinnedValueGroups.updateValues(stores.groupStore.pinnedValueGroups);
			setTableRowDatas();
		});

		watch(() => stores.filterStore.activeAtRiskPasswordFilterType, () =>
		{
			passwordFilters.updateValues(stores.filterStore.unpinnedPasswordFilters);
			pinnedPasswordFilters.updateValues(stores.filterStore.pinnedPasswordFilters);
			setTableRowDatas();
		});

		watch(() => stores.filterStore.activeAtRiskValueFilterType, () =>
		{
			valueFilters.updateValues(stores.filterStore.unpinnedValueFitlers);
			pinnedValueFilters.updateValues(stores.filterStore.pinnedValueFilters);
			setTableRowDatas();
		});

		watch(() => filterSearchText.value, (newValue) =>
		{
			currentFilters.value.search(newValue);
			setTableRowDatas();
		});

		watch(() => groupSearchText.value, (newValue) =>
		{
			currentGroups.value.search(newValue);
			setTableRowDatas();
		});

		return {
			tableRef,
			tabToOpenOnAdd,
			headerModels,
			tableRowDatas,
			color,
			showEditGroupPopup,
			currentlyEditingGroupModel,
			showEditFilterPopup,
			currentlyEditingFilterModel,
			currentSearchText,
			headerTabs,
			emptyTableMessage,
			onEditGroupPopupClosed,
			onEditFilterPopupClosed,
			onFilterDeleteConfirmed,
			onGroupDeleteConfirmed
		}
	}
});
</script>

<style>
#filterTable {
	height: 43%;
	width: 25%;
	min-width: 285px;
	left: 3%;
	top: max(252px, 42%);
}

@media (max-width: 1300px) {
	#filterTable {
		left: max(11px, 1%);
	}
}
</style>
