<template>
    <div id="filterGroupTableContainer">
        <VaulticTable ref="tableRef" id="filterTable" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyTableMessage"
            :onPin="onPin" :onEdit="onEdit" :onDelete="onDelete" :searchBarSizeModel="searchBarSizeModel">
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
import { Filter, DataType, Group, ISecondaryDataObject } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

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

        const passwordFilters: SortedCollection = new SortedCollection(app.currentVault.filterStore.passwordFilters, "name");
        const pinnedPasswordFilters: SortedCollection = new SortedCollection([], "name");

        const passwordGroups: SortedCollection = new SortedCollection(app.currentVault.groupStore.passwordGroups, "name");
        const pinnedPasswordGroups: SortedCollection = new SortedCollection([], "name");

        const valueFilters: SortedCollection = new SortedCollection(app.currentVault.filterStore.nameValuePairFilters, "name");
        const pinnedValueFilters: SortedCollection = new SortedCollection([], "name");

        const valueGroups: SortedCollection = new SortedCollection(app.currentVault.groupStore.valuesGroups, "name");
        const pinnedValueGroups: SortedCollection = new SortedCollection([], "name");

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
                    return app.userPreferences.currentColorPalette.groupsColor.value;
                case DataType.Filters:
                default:
                    return app.userPreferences.currentColorPalette.filtersColor.value;
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
                color: computed(() => app.userPreferences.currentColorPalette.filtersColor.value),
                onClick: () => { app.activeFilterGroupsTable = DataType.Filters; }
            },
            {
                name: 'Groups',
                active: computed(() => app.activeFilterGroupsTable == DataType.Groups),
                color: computed(() => app.userPreferences.currentColorPalette.groupsColor.value),
                onClick: () => { app.activeFilterGroupsTable = DataType.Groups; }
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() =>
        {
            const models: TableColumnModel[] = []
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                models.push({ header: "Active", field: "isActive", component: 'SelectorButtonTableRowValue', 
                    data: { 'color': color, onClick: (f: Field<Filter>) => app.currentVault.filterStore.toggleFilter(f.value.id.value) }, startingWidth: '105px' });
                models.push({ header: "Name", field: "name" });
            }
            else
            {
                models.push({ header: "Name", field: "name" });
                models.push({ header: "Color", field: "color", component: 'ColorTableRowValue' });
            }

            return models;
        });

        const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
            width: '9vw',
            maxWidth: '250px',
            minWidth: '100px',
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
                            passwordGroups.updateValues(getFilterGroupTableRowModels(DataType.Groups, DataType.Passwords, app.currentVault.groupStore.passwordGroups));
                            break;
                        case DataType.NameValuePairs:
                            valueGroups.updateValues(getFilterGroupTableRowModels(DataType.Groups, DataType.NameValuePairs, app.currentVault.groupStore.valuesGroups));
                            break;
                    }
                    break;
                case DataType.Filters:
                    switch (app.activePasswordValuesTable)
                    {
                        case DataType.Passwords:
                            passwordFilters.updateValues(getFilterGroupTableRowModels(DataType.Filters, DataType.Passwords, app.currentVault.filterStore.passwordFilters, 
                                async (f: Filter) => await app.currentVault.filterStore.toggleFilter(f.id.value)));
                            break;
                        case DataType.NameValuePairs:
                            valueFilters.updateValues(getFilterGroupTableRowModels(DataType.Filters, DataType.NameValuePairs, app.currentVault.filterStore.nameValuePairFilters,
                                async (f: Filter) => await app.currentVault.filterStore.toggleFilter(f.id.value)));
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

        function onPinFilter(isPinned: boolean, value: Field<Filter>)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedFilters(value.value.id.value);
            }
            else
            {
                app.userPreferences.addPinnedFilter(value.value.id.value);
            }
        }

        function onPinGroup(isPinned: boolean, value: Field<Group>)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedGroups(value.value.id.value);
            }
            else
            {
                app.userPreferences.addPinnedGroup(value.value.id.value);
            }
        }

        function onPin(isPinned: boolean, dataType: Field<Filter | Group>)
        {
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                onPinFilter(isPinned, dataType as Field<Filter>);
            }
            else if (app.activeFilterGroupsTable == DataType.Groups)
            {
                onPinGroup(isPinned, dataType as Field<Group>);
            }
        }

        function onEdit(dataType: Field<Filter | Group>)
        {
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                onEditFilter(dataType.value as Filter);
            }
            else if (app.activeFilterGroupsTable == DataType.Groups)
            {
                onEditGroup(dataType.value as Group);
            }
        }

        function onDelete(dataType: Field<Filter | Group>)
        {
            if (app.activeFilterGroupsTable == DataType.Filters)
            {
                onFilterDeleteInitiated(dataType.value as Filter);
            }
            else if (app.activeFilterGroupsTable == DataType.Groups)
            {
                onGroupDeleteInitiated(dataType.value as Group);
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
        left: max(11px, 1%);
    }
}
</style>
