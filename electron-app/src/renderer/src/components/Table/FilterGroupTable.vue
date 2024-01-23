<template>
	<div id="filterGroupTableContainer">
		<TableTemplate ref="tableRef" :rowGap="10" class="shadow scrollbar" id="filterTable" :color="color"
			:scrollbar-size="1" :style="{ height: '43%', width: '25%', left: '3%', top: '42%' }"
			@scrolledToBottom="tableRowDatas.loadNextChunk()">
			<template #header>
				<TableHeaderRow :model="headerModels" :tabs="headerTabs">
					<template #controls>
						<SearchBar v-model="currentSearchText" :color="color" :width="'250px'" />
						<AddTableItemButton :color="color" :initalActiveContentOnClick="tabToOpenOnAdd" />
					</template>
				</TableHeaderRow>
			</template>
			<template #body>
				<SelectableTableRow class="shadow hover" v-for="(trd, index) in tableRowDatas.visualValues" :key="trd.id"
					:rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false"
					:style="{ width: '5%', 'height': '70px' }" :color="color" :allowPin="true" :allowEdit="true"
					:allowDelete="true" />
			</template>
		</TableTemplate>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditGroupPopup" :closePopup="onEditGroupPopupClosed">
					<EditGroupPopup :model="currentlyEditingGroupModel" />
				</ObjectPopup>
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditFilterPopup" :closePopup="onEditFilterPopupClosed">
					<EditFilterPopup :model="currentlyEditingFilterModel" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, ref, watch } from 'vue';

import TableTemplate from './TableTemplate.vue';
import TableHeaderRow from './Header/TableHeaderRow.vue';
import SelectableTableRow from './SelectableTableRow.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import EditGroupPopup from '../ObjectPopups/EditPopups/EditGroupPopup.vue';
import EditFilterPopup from '../ObjectPopups/EditPopups/EditFilterPopup.vue';
import SearchBar from './Controls/SearchBar.vue';

import { DataType, Filter, Group } from '../../Types/Table';
import AddTableItemButton from './Controls/AddTableItemButton.vue';
import { HeaderTabModel, SelectableTableRowData, SortableHeaderModel, emptyHeader } from '../../Types/Models';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { HeaderDisplayField } from '../../Types/EncryptedData';
import { createPinnableSelectableTableRowModels, createSortableHeaderModels } from '../../Helpers/ModelHelper';
import { stores } from '../../Objects/Stores';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import { RequestAuthenticationFunctionKey, ShowToastFunctionKey } from '../../Types/Keys';
import { v4 as uuidv4 } from 'uuid';
import { getLinearGradientFromColor } from '@renderer/Helpers/ColorHelper';

export default defineComponent({
	name: 'FilterGroupTable',
	components:
	{
		TableTemplate,
		SelectableTableRow,
		TableHeaderRow,
		AddTableItemButton,
		ObjectPopup,
		EditGroupPopup,
		EditFilterPopup,
		SearchBar
	},
	setup()
	{
		const tableRef: Ref<null> = ref(null);
		const tabToOpenOnAdd: ComputedRef<number> = computed(() => stores.appStore.activeFilterGroupsTable);

		const passwordFilters: SortedCollection<Filter> = new SortedCollection(stores.filterStore.passwordFilters, "text");
		const pinnedPasswordFilters: SortedCollection<Filter> = new SortedCollection(stores.filterStore.passwordFilters.filter(f => f.isPinned), "text");

		const passwordGroups: SortedCollection<Group> = new SortedCollection(stores.groupStore.passwordGroups, "name");
		const pinnedPasswordGroups: SortedCollection<Group> = new SortedCollection(stores.groupStore.passwordGroups.filter(g => g.isPinned), "name");

		const valueFilters: SortedCollection<Filter> = new SortedCollection(stores.filterStore.nameValuePairFilters, "text");
		const pinnedValueFilters: SortedCollection<Filter> = new SortedCollection(stores.filterStore.nameValuePairFilters.filter(f => f.isPinned), "text");

		const valueGroups: SortedCollection<Group> = new SortedCollection(stores.groupStore.valuesGroups, "name");
		const pinnedValueGroups: SortedCollection<Group> = new SortedCollection(stores.groupStore.valuesGroups.filter(g => g.isPinned), "name");

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

		let deleteFilter: Ref<(key: string) => void> = ref((_: string) => { });
		let deleteGroup: Ref<(key: string) => void> = ref((_: string) => { });

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);
		const showToastFunction: { (toastText: string, success: boolean): void } = inject(ShowToastFunctionKey, () => { });

		const color: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activeFilterGroupsTable)
			{
				case DataType.Groups:
					return stores.settingsStore.currentColorPalette.groupsColor;
				case DataType.Filters:
				default:
					return stores.settingsStore.currentColorPalette.filtersColor;
			}
		});

		const headerTabs: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Filters',
				active: computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters),
				color: computed(() => stores.settingsStore.currentColorPalette.filtersColor),
				backgroundColor: computed(() => getLinearGradientFromColor(color.value)),
				onClick: () => { stores.appStore.activeFilterGroupsTable = DataType.Filters; }
			},
			{
				id: uuidv4(),
				name: 'Groups',
				active: computed(() => stores.appStore.activeFilterGroupsTable == DataType.Groups),
				color: computed(() => stores.settingsStore.currentColorPalette.groupsColor),
				backgroundColor: computed(() => getLinearGradientFromColor(color.value)),
				onClick: () => { stores.appStore.activeFilterGroupsTable = DataType.Groups; }
			}
		];

		const filterHeaderDisplayField: HeaderDisplayField[] = [
			{
				displayName: "Active",
				backingProperty: "isActive",
				width: '100px',
			},
			{
				displayName: "Name",
				backingProperty: "text",
				width: '100px'
			}
		];

		const groupHeaderDisplayField: HeaderDisplayField[] = [
			{
				displayName: "Name",
				backingProperty: "name",
				width: '100px'
			}
		];

		const activePasswordFilterHeader: Ref<number> = ref(1);
		const passwordFilterHeaders: SortableHeaderModel[] = createSortableHeaderModels<Filter>(true, activePasswordFilterHeader, filterHeaderDisplayField, currentFilters.value,
			currentPinnedFilter.value, setTableRowDatas);
		passwordFilterHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const activeValueFilterHeader: Ref<number> = ref(1);
		const valueFilterHeaders: SortableHeaderModel[] = createSortableHeaderModels<Filter>(true, activeValueFilterHeader, filterHeaderDisplayField, currentFilters.value,
			currentPinnedFilter.value, setTableRowDatas);
		valueFilterHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const passwordGroupHeaders: SortableHeaderModel[] = createSortableHeaderModels<Group>(true, ref(0), groupHeaderDisplayField,
			currentGroups.value, currentPinnedGroups.value, setTableRowDatas);
		passwordGroupHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()]);

		const valueGroupHeaders: SortableHeaderModel[] = createSortableHeaderModels<Group>(true, ref(0), groupHeaderDisplayField,
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
						currentGroups.value, currentPinnedGroups.value, (g: Group) => { return [{ value: g.name, copiable: false, width: '100px', }] },
						false, "", false, undefined, onEditGroup,
						onGroupDeleteInitiated);
					break;
				case DataType.Filters:
				default:
					createPinnableSelectableTableRowModels<Filter>(DataType.Filters, stores.appStore.activePasswordValuesTable,
						tableRowDatas, currentFilters.value, currentPinnedFilter.value, (f: Filter) => { return [{ value: f.text, copiable: false, width: '100px' }] },
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
				setTableRowDatas();
			}
		}

		function onFilterDeleteInitiated(filter: Filter)
		{
			deleteFilter.value = (_: string) =>
			{
				stores.filterStore.deleteFilter(filter);
			}

			if (!stores.encryptedDataStore.canAuthenticateKey || !stores.settingsStore.requireMasterKeyOnFilterGroupDelete)
			{
				onFilterDeleteConfirmed("");
				return;
			}

			if (requestAuthFunc)
			{
				requestAuthFunc(onFilterDeleteConfirmed, () => { });
			}
		}

		function onFilterDeleteConfirmed(key: string)
		{
			deleteFilter.value(key);
			showToastFunction("Filter Deleted Sucessfully", true);
		}

		function onGroupDeleteInitiated(group: Group)
		{
			deleteGroup.value = (_: string) =>
			{
				stores.groupStore.deleteGroup(group);
			}

			if (!stores.encryptedDataStore.canAuthenticateKey || !stores.settingsStore.requireMasterKeyOnFilterGroupDelete)
			{
				onGroupDeleteConfirmed("");
				return;
			}

			if (requestAuthFunc)
			{
				requestAuthFunc(onGroupDeleteConfirmed, () => { });
			}
		}

		function onGroupDeleteConfirmed(key: string)
		{
			deleteGroup.value(key);
			showToastFunction("Group Deleted Sucessfully", true);
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
			passwordFilters.updateValues(stores.filterStore.passwordFilters);
			setTableRowDatas();
		});

		watch(() => stores.filterStore.nameValuePairFilters.length, () =>
		{
			valueFilters.updateValues(stores.filterStore.nameValuePairFilters);
			setTableRowDatas();
		});

		watch(() => stores.groupStore.passwordGroups.length, () =>
		{
			passwordGroups.updateValues(stores.groupStore.passwordGroups);
			setTableRowDatas();
		});

		watch(() => stores.groupStore.valuesGroups.length, () =>
		{
			valueGroups.updateValues(stores.groupStore.valuesGroups);
			setTableRowDatas();
		});

		watch(() => stores.groupStore.activeAtRiskPasswordGroupType, () =>
		{
			passwordGroups.updateValues(stores.groupStore.passwordGroups);
			pinnedPasswordGroups.updateValues(stores.groupStore.passwordGroups.filter(g => g.isPinned));

			setTableRowDatas();
		});

		watch(() => stores.groupStore.activeAtRiskValueGroupType, () =>
		{
			valueGroups.updateValues(stores.groupStore.valuesGroups);
			pinnedValueGroups.updateValues(stores.groupStore.valuesGroups.filter(g => g.isPinned));

			setTableRowDatas();
		});

		watch(() => stores.filterStore.activeAtRiskPasswordFilterType, () =>
		{
			passwordFilters.updateValues(stores.filterStore.passwordFilters);
			pinnedPasswordFilters.updateValues(stores.filterStore.passwordFilters.filter(f => f.isPinned));

			setTableRowDatas();
		});

		watch(() => stores.filterStore.activeAtRiskValueFilterType, () =>
		{
			valueFilters.updateValues(stores.filterStore.nameValuePairFilters);
			pinnedValueFilters.updateValues(stores.filterStore.nameValuePairFilters.filter(f => f.isPinned));

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
			onEditGroupPopupClosed,
			onEditFilterPopupClosed,
			onFilterDeleteConfirmed,
			onGroupDeleteConfirmed
		}
	}
});
</script>

<style></style>
