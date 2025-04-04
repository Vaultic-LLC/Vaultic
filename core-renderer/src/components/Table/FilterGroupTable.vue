<template>
    <div id="filterGroupTableContainer">
        <VaulticTable ref="tableRef" id="filterTable" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyTableMessage"
            :allowPinning="!readOnly" :onPin="onPin" :onEdit="onEdit" :onDelete="onDelete" 
            :searchBarSizeModel="searchBarSizeModel">
            <template #tableControls>
                <Transition name="fade" mode="out-in">
                    <AddDataTableItemButton v-if="!readOnly" :color="color" :initalActiveContentOnClick="tabToOpenOnAdd" />
                </Transition>
            </template>
        </VaulticTable>
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
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, reactive, ref, watch } from 'vue';

import VaulticTable from './VaulticTable.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import EditGroupPopup from '../ObjectPopups/EditPopups/EditGroupPopup.vue';
import EditFilterPopup from '../ObjectPopups/EditPopups/EditFilterPopup.vue';
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';

import { ComponentSizeModel, HeaderTabModel, TableColumnModel, TableDataSources } from '../../Types/Models';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { getEmptyTableMessage, getFilterGroupTableRowModels } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { Filter, DataType, Group } from '../../Types/DataTypes';

export default defineComponent({
    name: 'FilterGroupTable',
    components:
    {
        VaulticTable,
        AddDataTableItemButton,
        ObjectPopup,
        EditGroupPopup,
        EditFilterPopup,
    },
    setup()
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const tabToOpenOnAdd: ComputedRef<number> = computed(() => app.activeFilterGroupsTable);
        const readOnly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);

        const passwordFilters: SortedCollection = new SortedCollection([], () => app.currentVault.filterStore.passwordFiltersByID, "n");
        const pinnedPasswordFilters: SortedCollection = new SortedCollection([], () => app.currentVault.filterStore.passwordFiltersByID, "n");

        const passwordGroups: SortedCollection = new SortedCollection([], () => app.currentVault.groupStore.passwordGroupsByID, "n");
        const pinnedPasswordGroups: SortedCollection = new SortedCollection([], () => app.currentVault.groupStore.passwordGroupsByID, "n");

        const valueFilters: SortedCollection = new SortedCollection([], () => app.currentVault.filterStore.nameValuePairFiltersByID,  "n");
        const pinnedValueFilters: SortedCollection = new SortedCollection([], () => app.currentVault.filterStore.nameValuePairFiltersByID,  "n");

        const valueGroups: SortedCollection = new SortedCollection([], () => app.currentVault.groupStore.valueGroupsByID, "n");
        const pinnedValueGroups: SortedCollection = new SortedCollection([], () => app.currentVault.groupStore.valueGroupsByID, "n");

        const showEditGroupPopup: Ref<boolean> = ref(false);
        const currentlyEditingGroupModel: Ref<Group | any> = ref({});

        const showEditFilterPopup: Ref<boolean> = ref(false);
        const currentlyEditingFilterModel: Ref<Filter | any> = ref({});

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
                    return app.userPreferences.currentColorPalette.g;
                case DataType.Filters:
                default:
                    return app.userPreferences.currentColorPalette.f;
            }
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => 
            {
                if (app.activePasswordValuesTable == DataType.Passwords)
                {
                    return app.activeFilterGroupsTable == DataType.Filters ? 0 : 1;
                }
                else if (app.activePasswordValuesTable == DataType.NameValuePairs)
                {
                    return app.activeFilterGroupsTable == DataType.Filters ? 2 : 3;
                }

                return -1;
            },
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Filter",
                    collection: passwordFilters,
                    pinnedCollection: pinnedPasswordFilters
                },
                {
                    friendlyDataTypeName: "Group",
                    collection: passwordGroups,
                    pinnedCollection: pinnedPasswordGroups
                },
                {
                    friendlyDataTypeName: "Filter",
                    collection: valueFilters,
                    pinnedCollection: pinnedValueFilters
                },
                {
                    friendlyDataTypeName: "Group",
                    collection: valueGroups,
                    pinnedCollection: pinnedValueGroups
                }
            ]
        });
        
        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Filters',
                active: computed(() => app.activeFilterGroupsTable == DataType.Filters),
                color: computed(() => app.userPreferences.currentColorPalette.f),
                onClick: () => { app.activeFilterGroupsTable = DataType.Filters; }
            },
            {
                name: 'Groups',
                active: computed(() => app.activeFilterGroupsTable == DataType.Groups),
                color: computed(() => app.userPreferences.currentColorPalette.g),
                onClick: () => { app.activeFilterGroupsTable = DataType.Groups; }
            }
        ];

        function toggleFilter(f: Filter)
        {
            app.currentVault.filterStore.toggleFilter(f.id);
        }

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() =>
        {
            const models: TableColumnModel[] = [];
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                models.push(new TableColumnModel("Active", "a").setComponent("SelectorButtonTableRowCell")
                    .setData({ 'color': color, onClick: toggleFilter, startingWidth: '105px' }).setOnClick(toggleFilter));

                models.push(new TableColumnModel("Name", "n"));
            }
            else
            {
                models.push(new TableColumnModel("Name", "n"));
                models.push(new TableColumnModel("Icon", "").setIsGroupIconCell(true).setData({ 'color': color })
                    .setSortable(false));
            }

            return models;
        });

        const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
            width: '8vw',
            maxWidth: '250px',
            minWidth: '85px',
            minHeight: '25px'
        });

        function setTableRowDatas()
        {
            switch (app.activeFilterGroupsTable)
            {
                case DataType.Groups:
                    switch (app.activePasswordValuesTable)
                    {
                        case DataType.Passwords:
                            const [pgModels, pgPinnedModels] = getFilterGroupTableRowModels(DataType.Groups, DataType.Passwords, app.currentVault.groupStore.passwordGroups);
                            passwordGroups.updateValues(pgModels);
                            pinnedPasswordGroups.updateValues(pgPinnedModels);
                            break;
                        case DataType.NameValuePairs:
                            const [vgModels, vgPinnedModels] = getFilterGroupTableRowModels(DataType.Groups, DataType.NameValuePairs, app.currentVault.groupStore.valuesGroups);
                            valueGroups.updateValues(vgModels);
                            pinnedValueGroups.updateValues(vgPinnedModels);
                            break;
                    }
                    break;
                case DataType.Filters:
                    switch (app.activePasswordValuesTable)
                    {
                        case DataType.Passwords:
                            const [pfModels, pfPinnedModels] = getFilterGroupTableRowModels(DataType.Filters, DataType.Passwords, app.currentVault.filterStore.passwordFilters);
                            passwordFilters.updateValues(pfModels);
                            pinnedPasswordFilters.updateValues(pfPinnedModels);
                            break;
                        case DataType.NameValuePairs:
                            const [vfModels, vfPinnedModels] = getFilterGroupTableRowModels(DataType.Filters, DataType.NameValuePairs, app.currentVault.filterStore.nameValuePairFilters);
                            valueFilters.updateValues(vfModels);
                            pinnedValueFilters.updateValues(vfPinnedModels);
                            break;
                    }
                default:
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
                app.popups.showToast("Filter Deleted", true);
            }
            else
            {
                app.popups.showToast("Delete Failed", false);
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
                app.popups.showToast("Group Deleted", true);
            }
            else
            {
                app.popups.showToast("Delete Failed", false);
            }
        }

        function onPinFilter(isPinned: boolean, value: Filter)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedFilters(value.id);
            }
            else
            {
                app.userPreferences.addPinnedFilter(value.id);
            }
        }

        function onPinGroup(isPinned: boolean, value: Group)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedGroups(value.id);
            }
            else
            {
                app.userPreferences.addPinnedGroup(value.id);
            }
        }

        function onPin(isPinned: boolean, dataType: (Filter | Group))
        {
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                onPinFilter(isPinned, dataType as Filter);
            }
            else if (app.activeFilterGroupsTable == DataType.Groups)
            {
                onPinGroup(isPinned, dataType as Group);
            }
        }

        function onEdit(dataType: (Filter | Group))
        {
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                onEditFilter(dataType as Filter);
            }
            else if (app.activeFilterGroupsTable == DataType.Groups)
            {
                onEditGroup(dataType as Group);
            }
        }

        function onDelete(dataType: Filter | Group)
        {
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                onFilterDeleteInitiated(dataType as Filter);
            }
            else if (app.activeFilterGroupsTable == DataType.Groups)
            {
                onGroupDeleteInitiated(dataType as Group);
            }
        }

        onMounted(() =>
        {
            setTableRowDatas();
        });

        watch(() => app.loadedUser.value, () =>
        {
            showEditFilterPopup.value = false;
            showEditGroupPopup.value = false;
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
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.nameValuePairFilters.length, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.passwordGroups.length, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.valuesGroups.length, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.activeAtRiskPasswordGroupType, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.groupStore.activeAtRiskValueGroupType, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.activeAtRiskPasswordFilterType, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        watch(() => app.currentVault.filterStore.activeAtRiskValueFilterType, () =>
        {
            setTableRowDatas();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        return {
            readOnly,
            tableRef,
            tableDataSources,
            tabToOpenOnAdd,
            tableColumns,
            color,
            showEditGroupPopup,
            currentlyEditingGroupModel,
            showEditFilterPopup,
            currentlyEditingFilterModel,
            headerTabs,
            emptyTableMessage,
            searchBarSizeModel,
            onEditGroupPopupClosed,
            onEditFilterPopupClosed,
            onPin,
            onEdit,
            onDelete
        }
    }
});
</script>

<style>
#filterTable {
    height: 39%;
    width: 24%;
    min-width: 285px;
    left: 11%;
    top: max(252px, 42%);
}

@media (max-width: 1300px) {
    #filterTable {
        left: 10%;
    }
}
</style>
