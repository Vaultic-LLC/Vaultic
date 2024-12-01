<template>
    <ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="groupView__name" :label="'Name'" :color="groupColor" v-model="groupState.name.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" />
        <ColorPickerInputField class="groupView__color" :label="'Color'" :color="groupColor" v-model="groupState.color.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" :minWidth="'125px'" />
        <TextInputField class="groupView__icon" :label="'Icon'" :color="groupColor" v-model="groupState.icon.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" :minWidth="'125px'" />
        <VaulticTable ref="tableRef" id="addGroupTable" :color="groupColor" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false" />
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, onUpdated, reactive, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import SelectableTableRow from '../Table/Rows/SelectableTableRow.vue';
import VaulticTable from '../Table/VaulticTable.vue';

import { GridDefinition, HeaderTabModel, SelectableBackingObject, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import { getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { DataType, defaultGroup, Group } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

interface SelectablePrimaryObject extends SelectableBackingObject
{
    passwordFor?: Field<string>;
    login?: Field<string>;
    name?: Field<string>;
    type?: Field<any>;
}

export default defineComponent({
    name: "GroupView",
    components:
    {
        ObjectView,
        TextInputField,
        ColorPickerInputField,
        SearchBar,
        TableTemplate,
        TableHeaderRow,
        SelectableTableRow,
        VaulticTable
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const mounted: Ref<boolean> = ref(false);
        const groupState: Ref<Group> = ref(props.model);
        const groupColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.groupsColor.value);

        const passwordSortedCollection: SortedCollection = new SortedCollection([]);
        const valueSortedCollection: SortedCollection = new SortedCollection([]);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const emptyMessage: ComputedRef<string> = computed(() =>
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                return getObjectPopupEmptyTableMessage("Passwords", "Group", "Password", props.creating);
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                return getObjectPopupEmptyTableMessage("Values", "Group", "Value", props.creating);
            }

            return "";
        })

        const gridDefinition: GridDefinition =
        {
            rows: 13,
            rowHeight: 'clamp(10px, 2vw, 50px)',
            columns: 15,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        const passwordHeaderTab: HeaderTabModel[] = [
            {
                name: 'Passwords',
                active: computed(() => true),
                color: groupColor,
                onClick: () => { }
            }
        ];

        const valueHeaderTab: HeaderTabModel[] = [
            {
                name: 'Values',
                active: computed(() => true),
                color: groupColor,
                onClick: () => { }
            }
        ];

        let headerTabs: ComputedRef<HeaderTabModel[]> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            passwordHeaderTab : valueHeaderTab);

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = [];
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                models.push({ header: "", field: "isActive", component: 'SelectorButtonTableRowValue', data: { 'color': groupColor, onClick: onPasswordSelected } });
                models.push({ header: "Password For", field: "passwordFor" });
                models.push({ header: "Username", field: "login" });
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
            {
                models.push({ header: "", field: "isActive", component: 'SelectorButtonTableRowValue', data: { 'color': groupColor, onClick: onValueSelected } });
                models.push({ header: "Name", field: "name" });
                models.push({ header: "Type", field: "type" });
            }

            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => app.activePasswordValuesTable == DataType.Passwords ? 0 : 1,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Password",
                    collection: passwordSortedCollection,
                },
                {
                    friendlyDataTypeName: "Value",
                    collection: valueSortedCollection,
                }
            ]
        });
        
        function onPasswordSelected(value: Field<SelectablePrimaryObject>)
        {     
            if (value.value.isActive.value)
            {
                groupState.value.passwords.value.delete(value.value.id.value);
                value.value.isActive.value = false;
            }
            else
            {
                groupState.value.passwords.value.set(value.value.id.value, new Field(value.value.id.value));
                value.value.isActive.value = true;
            }
        }

        function onValueSelected(value: Field<SelectablePrimaryObject>)
        {     
            if (value.value.isActive.value)
            {
                groupState.value.values.value.delete(value.value.id.value);
                value.value.isActive.value = false;
            }
            else
            {
                groupState.value.values.value.set(value.value.id.value, new Field(value.value.id.value));
                value.value.isActive.value = true;
            }
        }

        function setTableRows()
        {
            let rows: TableRowModel[] = [];
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    rows = app.currentVault.valueStore.nameValuePairs.map(nvp =>
                    {
                        const selectablePrimaryObjectModel: SelectablePrimaryObject = 
                        {
                            isActive: new Field(groupState.value.values.value.has(nvp.value.id.value)),
                            id: nvp.value.id,
                            name: nvp.value.name,
                            type: nvp.value.type
                        };

                        const row: TableRowModel = 
                        {
                            id: nvp.value.id.value,
                            backingObject: new Field(selectablePrimaryObjectModel),
                        };

                        return row;
                    });

                    valueSortedCollection.updateValues(rows);

                    break;
                case DataType.Passwords:
                default:
                    rows = app.currentVault.passwordStore.passwords.map(p =>
                    {
                        const selectablePrimaryObjectModel: SelectablePrimaryObject = 
                        {
                            isActive: new Field(groupState.value.passwords.value.has(p.value.id.value)),
                            id: p.value.id,
                            passwordFor: p.value.passwordFor,
                            login: p.value.login
                        };

                        const row: TableRowModel = 
                        {
                            id: p.value.id.value,
                            backingObject: new Field(selectablePrimaryObjectModel),
                        };

                        return row;
                    });

                    passwordSortedCollection.updateValues(rows);
            }
        }

        function onSave()
        {
            app.popups.showRequestAuthentication(groupColor.value, doSave, onAuthCanceld);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function doSave(key: string)
        {
            app.popups.showLoadingIndicator(groupColor.value, "Saving Group");
            if (props.creating)
            {
                if (await app.currentVault.groupStore.addGroup(key, groupState.value))
                {
                    groupState.value = defaultGroup(groupState.value.type.value);
                    setTableRows();
                    refreshKey.value = Date.now().toString();

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                if (await app.currentVault.groupStore.updateGroup(key, groupState.value))
                {
                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
        }

        function handleSaveResponse(succeeded: boolean)
        {
            app.popups.hideLoadingIndicator();
            if (succeeded)
            {
                if (saveSucceeded)
                {
                    saveSucceeded(true);
                }
            }
            else
            {
                if (saveFailed)
                {
                    saveFailed(true);
                }
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

        return {
            groupState,
            groupColor,
            refreshKey,
            gridDefinition,
            headerTabs,
            emptyMessage,
            mounted,
            tableRef,
            tableColumns,
            tableDataSources,
            onSave
        };
    },
})
</script>

<style>
#addGroupTable {
    position: relative;
    grid-row: 7 / span 8;
    grid-column: 4 / span 9;
    min-width: 410px;
    min-height: 182px;
}

.groupView__name {
    grid-row: 1 / span 2;
    grid-column: 4 / span 2;
}

.groupView__color {
    grid-row: 3 / span 2;
    grid-column: 4 / span 2;
}

.groupView__icon {
    grid-row: 5 / span 2;
    grid-column: 4 / span 2;
}
</style>
