<template>
    <div id="filterGroupTableContainer">
        <TableTemplate :name="'filterGroup'" ref="tableRef" :rowGap="0" class="shadow scrollbar" id="filterTable"
            :color="color" :headerModels="headerModels" :scrollbar-size="1" :emptyMessage="emptyTableMessage"
            :showEmptyMessage="tableRowDatas.visualValues.length == 0" :headerTabs="headerTabs"
            @scrolledToBottom="tableRowDatas.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="currentSearchText" :color="color" :width="'9vw'" :maxWidth="'250px'"
                    :minWidth="'100px'" :minHeight="'25px'" />
                <Transition name="fade" mode="out-in">
                    <AddDataTableItemButton v-if="!readOnly" :color="color"
                        :initalActiveContentOnClick="tabToOpenOnAdd" />
                </Transition>
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
import SelectableTableRow from './Rows/SelectableTableRow.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import EditGroupPopup from '../ObjectPopups/EditPopups/EditGroupPopup.vue';
import EditFilterPopup from '../ObjectPopups/EditPopups/EditFilterPopup.vue';
import SearchBar from './Controls/SearchBar.vue';
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';

import { HeaderTabModel, SelectableTableRowData, SortableHeaderModel, emptyHeader } from '../../Types/Models';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { createPinnableSelectableTableRowModels, createSortableHeaderModels, getEmptyTableMessage } from '../../Helpers/ModelHelper';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { Filter, DataType, Group } from '../../Types/DataTypes';
import { HeaderDisplayField } from '../../Types/Fields';

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
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const tabToOpenOnAdd: ComputedRef<number> = computed(() => app.activeFilterGroupsTable);
        const readOnly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);

        const passwordFilters: SortedCollection<Filter> = new SortedCollection(
            app.currentVault.filterStore.passwordFilters, "name");
        const pinnedPasswordFilters: SortedCollection<Filter> = new SortedCollection(
            [], "name");

        const passwordGroups: SortedCollection<Group> = new SortedCollection(
            app.currentVault.groupStore.passwordGroups, "name");
        const pinnedPasswordGroups: SortedCollection<Group> = new SortedCollection(
            [], "name");

        const valueFilters: SortedCollection<Filter> = new SortedCollection(
            app.currentVault.filterStore.nameValuePairFilters, "name");
        const pinnedValueFilters: SortedCollection<Filter> = new SortedCollection(
            [], "name");

        const valueGroups: SortedCollection<Group> = new SortedCollection(
            app.currentVault.groupStore.valuesGroups, "name");
        const pinnedValueGroups: SortedCollection<Group> = new SortedCollection(
            [], "name");

        const currentFilters: ComputedRef<SortedCollection<Filter>> = computed(() =>
            app.activePasswordValuesTable == DataType.Passwords ? passwordFilters : valueFilters);
        const currentPinnedFilter: ComputedRef<SortedCollection<Filter>> = computed(() =>
            app.activePasswordValuesTable == DataType.Passwords ? pinnedPasswordFilters : pinnedValueFilters);

        const currentGroups: ComputedRef<SortedCollection<Group>> = computed(() =>
            app.activePasswordValuesTable == DataType.Passwords ? passwordGroups : valueGroups);
        const currentPinnedGroups: ComputedRef<SortedCollection<Group>> = computed(() =>
            app.activePasswordValuesTable == DataType.Passwords ? pinnedPasswordGroups : pinnedValueGroups);

        const tableRowDatas: Ref<InfiniteScrollCollection<SelectableTableRowData>> | any = ref(new InfiniteScrollCollection<SelectableTableRowData>());

        const showEditGroupPopup: Ref<boolean> = ref(false);
        const currentlyEditingGroupModel: Ref<Group | any> = ref({});

        const showEditFilterPopup: Ref<boolean> = ref(false);
        const currentlyEditingFilterModel: Ref<Filter | any> = ref({});

        const filterSearchText: Ref<string> = ref('');
        const groupSearchText: Ref<string> = ref('');
        const currentSearchText: ComputedRef<Ref<string>> = computed(() => app.activeFilterGroupsTable == DataType.Filters ?
            filterSearchText : groupSearchText);

        let deleteFilter: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());
        let deleteGroup: Ref<(key: string) => Promise<boolean>> = ref((_: string) => Promise.reject());

        const emptyTableMessage: ComputedRef<string> = computed(() => app.activeFilterGroupsTable == DataType.Filters ?
            getEmptyTableMessage(app.activePasswordValuesTable == DataType.Passwords ? "Password Filters" : "Value Filters") :
            getEmptyTableMessage(app.activePasswordValuesTable == DataType.Passwords ? "Password Groups" : "Value Groups")
        );

        const color: ComputedRef<string> = computed(() =>
        {
            switch (app.activeFilterGroupsTable)
            {
                case DataType.Groups:
                    return app.userPreferences.currentColorPalette.groupsColor;
                case DataType.Filters:
                default:
                    return app.userPreferences.currentColorPalette.filtersColor;
            }
        });

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Filters',
                active: computed(() => app.activeFilterGroupsTable == DataType.Filters),
                color: computed(() => app.userPreferences.currentColorPalette.filtersColor),
                onClick: () => { app.activeFilterGroupsTable = DataType.Filters; }
            },
            {
                name: 'Groups',
                active: computed(() => app.activeFilterGroupsTable == DataType.Groups),
                color: computed(() => app.userPreferences.currentColorPalette.groupsColor),
                onClick: () => { app.activeFilterGroupsTable = DataType.Groups; }
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
            switch (app.activeFilterGroupsTable)
            {
                case DataType.Groups:
                    if (app.activePasswordValuesTable == DataType.Passwords)
                    {
                        return passwordGroupHeaders;
                    }

                    return valueGroupHeaders;
                case DataType.Filters:
                default:
                    if (app.activePasswordValuesTable == DataType.Passwords)
                    {
                        return passwordFilterHeaders;
                    }

                    return valueFilterHeaders;
            }
        });

        function setTableRowDatas()
        {
            switch (app.activeFilterGroupsTable)
            {
                case DataType.Groups:
                    createPinnableSelectableTableRowModels<Group>(DataType.Groups, app.activePasswordValuesTable, tableRowDatas,
                        currentGroups.value, currentPinnedGroups.value, (g: Group) =>
                    {
                        return [{ component: 'TableRowTextValue', value: g.name.value, copiable: false, width: 'calc(clamp(60px, 4.3vw, 112px) - clamp(5px, 0.5vw, 12px))', margin: true },
                        { component: "TableRowColorValue", color: g.color.value, copiable: true, width: 'clamp(60px, 4.3vw, 100px)', margin: false }]
                    },
                        false, "", false, undefined, onEditGroup,
                        onGroupDeleteInitiated);
                    break;
                case DataType.Filters:
                default:
                    createPinnableSelectableTableRowModels<Filter>(DataType.Filters, app.activePasswordValuesTable,
                        tableRowDatas, currentFilters.value, currentPinnedFilter.value, (f: Filter) =>
                    { return [{ component: 'TableRowTextValue', value: f.name.value, copiable: false, width: 'clamp(60px, 4.3vw, 100px)' }] },
                        true, "isActive", true, (f: Filter) => app.currentVault.filterStore.toggleFilter(f.id.value), onEditFilter, onFilterDeleteInitiated);
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
                passwordGroups.updateValues(app.currentVault.groupStore.unpinnedPasswordGroups);
                pinnedPasswordGroups.updateValues(app.currentVault.groupStore.pinnedPasswordGroups);

                valueGroups.updateValues(app.currentVault.groupStore.unpinnedValueGroups);
                pinnedValueGroups.updateValues(app.currentVault.groupStore.pinnedValueGroups);

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
                passwordFilters.updateValues(app.currentVault.filterStore.unpinnedPasswordFilters);
                pinnedPasswordFilters.updateValues(app.currentVault.filterStore.pinnedPasswordFilters);

                valueFilters.updateValues(app.currentVault.filterStore.unpinnedValueFitlers);
                pinnedValueFilters.updateValues(app.currentVault.filterStore.pinnedValueFilters);

                setTableRowDatas();
            }
        }

        function onFilterDeleteInitiated(filter: Filter)
        {
            deleteFilter.value = async (key: string) =>
            {
                return await app.currentVault.filterStore.deleteFilter(key, filter);
            }

            app.popups.showRequestAuthentication(color.value, onFilterDeleteConfirmed, () => { });
        }

        async function onFilterDeleteConfirmed(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Deleting Filter");
            const succeeded = await deleteFilter.value(key);
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast(color.value, "Filter Deleted", true);
            }
            else
            {
                app.popups.showToast(color.value, "Delete Failed", false);
            }
        }

        function onGroupDeleteInitiated(group: Group)
        {
            deleteGroup.value = async (key: string) =>
            {
                return await app.currentVault.groupStore.deleteGroup(key, group);
            }

            app.popups.showRequestAuthentication(color.value, onGroupDeleteConfirmed, () => { });
        }

        async function onGroupDeleteConfirmed(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Deleting Group");
            const succeeded = await deleteGroup.value(key);
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast(color.value, "Group Deleted", true);
            }
            else
            {
                app.popups.showToast(color.value, "Delete Failed", false);
            }
        }

        onMounted(() =>
        {
            setTableRowDatas();
        });

        watch(() => app.activeFilterGroupsTable, () =>
        {
            setTableRowDatas();
        });

        watch(() => app.activePasswordValuesTable, () =>
        {
            setTableRowDatas();
        });

        watch(() => app.currentVault.filterStore.passwordFilters.length, () =>
        {
            passwordFilters.updateValues(app.currentVault.filterStore.unpinnedPasswordFilters);
            pinnedPasswordFilters.updateValues(app.currentVault.filterStore.pinnedPasswordFilters)
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.nameValuePairFilters.length, () =>
        {
            valueFilters.updateValues(app.currentVault.filterStore.unpinnedValueFitlers);
            pinnedValueFilters.updateValues(app.currentVault.filterStore.pinnedValueFilters)
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.passwordGroups.length, () =>
        {
            passwordGroups.updateValues(app.currentVault.groupStore.unpinnedPasswordGroups);
            pinnedPasswordGroups.updateValues(app.currentVault.groupStore.pinnedPasswordGroups);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.valuesGroups.length, () =>
        {
            valueGroups.updateValues(app.currentVault.groupStore.unpinnedValueGroups);
            pinnedValueGroups.updateValues(app.currentVault.groupStore.pinnedValueGroups);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.activeAtRiskPasswordGroupType, () =>
        {
            passwordGroups.updateValues(app.currentVault.groupStore.unpinnedPasswordGroups);
            pinnedPasswordGroups.updateValues(app.currentVault.groupStore.pinnedPasswordGroups);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.activeAtRiskValueGroupType, () =>
        {
            valueGroups.updateValues(app.currentVault.groupStore.unpinnedValueGroups);
            pinnedValueGroups.updateValues(app.currentVault.groupStore.pinnedValueGroups);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.activeAtRiskPasswordFilterType, () =>
        {
            passwordFilters.updateValues(app.currentVault.filterStore.unpinnedPasswordFilters);
            pinnedPasswordFilters.updateValues(app.currentVault.filterStore.pinnedPasswordFilters);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.activeAtRiskValueFilterType, () =>
        {
            valueFilters.updateValues(app.currentVault.filterStore.unpinnedValueFitlers);
            pinnedValueFilters.updateValues(app.currentVault.filterStore.pinnedValueFilters);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => filterSearchText.value, (newValue) =>
        {
            currentFilters.value.search(newValue);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => groupSearchText.value, (newValue) =>
        {
            currentGroups.value.search(newValue);
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        return {
            readOnly,
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
    width: 24%;
    min-width: 285px;
    left: 11%;
    top: max(252px, 42%);
}

@media (max-width: 1300px) {
    #filterTable {
        left: max(11px, 1%);
    }
}
</style>
