<template>
    <ObjectView :color="groupColor" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="groupView__name" :label="'Name'" :color="groupColor" v-model="groupState.name.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" />
        <ColorPickerInputField class="groupView__color" :label="'Color'" :color="groupColor" v-model="groupState.color.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" :minWidth="'125px'" />
        <TextInputField class="groupView__icon" :label="'Icon'" :color="groupColor" v-model="groupState.icon.value"
            :width="'8vw'" :height="'4vh'" :minHeight="'30px'" :minWidth="'125px'" />
        <TableTemplate ref="tableRef" id="addGroupTable" class="scrollbar border" :scrollbar-size="1"
            :color="groupColor" :border="true" :headerModels="tableHeaderModels" :emptyMessage="emptyMessage"
            :showEmptyMessage="mounted && tableRowDatas.visualValues.length == 0" :headerTabs="headerTabs"
            @scrolledToBottom="tableRowDatas.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="searchText" :color="groupColor" :width="'10vw'" :maxWidth="'250px'"
                    :minWidth="'130px'" />
            </template>
            <template #body>
                <SelectableTableRow v-for="(trd, index) in tableRowDatas.visualValues" class="hover" :key="trd.id"
                    :rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false" :color="groupColor" />
            </template>
        </TableTemplate>
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUpdated, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import SelectableTableRow from '../Table/Rows/SelectableTableRow.vue';

import { GridDefinition, HeaderTabModel, SelectableTableRowData, SortableHeaderModel, TextTableRowValue } from '../../Types/Models';
import { createSortableHeaderModels, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { ReactiveValue } from '../../Objects/Stores/ReactiveValue';
import { TableTemplateComponent } from '../../Types/Components';
import { api } from '../../API';
import { DataType, defaultGroup, Group } from '../../Types/DataTypes';
import { HeaderDisplayField } from '../../Types/Fields';
import { Field } from '@vaultic/shared/Types/Fields';

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
        SelectableTableRow
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const mounted: Ref<boolean> = ref(false);
        const groupState: Ref<Group> = ref(props.model);
        const groupColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.groupsColor.value);

        const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

        const title: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            'Passwords in Group' : 'Values in Group');

        // @ts-ignore
        const tableRowDatas: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());

        const passwordSortedCollection: SortedCollection<ReactivePassword> = new SortedCollection(app.currentVault.passwordStore.passwords, "passwordFor");
        const valueSortedCollection: SortedCollection<ReactiveValue> = new SortedCollection(app.currentVault.valueStore.nameValuePairs, "name");

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

        let tableHeaderModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
        {
            switch (app.activePasswordValuesTable)
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

        let headerTabs: ComputedRef<HeaderTabModel[]> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            passwordHeaderTab : valueHeaderTab);

        const gridDefinition: GridDefinition =
        {
            rows: 13,
            rowHeight: 'clamp(10px, 2vw, 50px)',
            columns: 15,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        const activePasswordHeader: Ref<number> = ref(1);
        const activeValueHeader: Ref<number> = ref(1);
        const activeHeader: ComputedRef<number> = computed(() => app.activePasswordValuesTable ==
            DataType.Passwords ? activePasswordHeader.value : activeValueHeader.value);

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

        const passwordHeaderDisplayFields: HeaderDisplayField[] = [
            {
                backingProperty: "",
                displayName: "  ",
                width: 'clamp(50px, 4vw, 100px)',
                clickable: false
            },
            {
                backingProperty: "passwordFor",
                displayName: "Password For",
                width: 'clamp(100px, 7vw, 200px)',
                clickable: true
            },
            {
                backingProperty: "login",
                displayName: "Username",
                width: 'clamp(100px, 7vw, 200px)',
                clickable: true
            }
        ];

        const valueHeaderDisplayField: HeaderDisplayField[] = [
            {
                backingProperty: " ",
                displayName: " ",
                width: 'clamp(50px, 4vw, 100px)',
                clickable: false
            },
            {
                backingProperty: "name",
                displayName: "Name",
                width: 'clamp(100px, 7vw, 200px)',
                clickable: true
            },
            {
                displayName: "Type",
                backingProperty: "valueType",
                width: 'clamp(100px, 7vw, 200px)',
                clickable: true
            }
        ];

        function setTableRows()
        {
            let pendingRows: Promise<SelectableTableRowData>[] = [];
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    pendingRows = valueSortedCollection.calculatedValues.map(async nvp =>
                    {
                        const values: TextTableRowValue[] = [
                            {
                                component: "TableRowTextValue",
                                value: nvp.value.name.value,
                                copiable: false,
                                width: 'clamp(100px, 7vw, 200px)'
                            },
                            {
                                component: 'TableRowTextValue',
                                value: nvp.value.valueType?.value ?? '',
                                copiable: false,
                                width: 'clamp(100px, 7vw, 200px)'
                            }
                        ]

                        const id = await api.utilities.generator.uniqueId();
                        return {
                            id: id,
                            key: nvp.value.id.value,
                            values: values,
                            isActive: ref(groupState.value.values.value.has(nvp.value.id.value)),
                            selectable: true,
                            onClick: async function ()
                            {
                                if (groupState.value.values.value.has(nvp.value.id.value))
                                {
                                    groupState.value.values.value.delete(nvp.value.id.value);
                                }
                                else
                                {
                                    groupState.value.values.value.set(nvp.value.id.value, new Field(nvp.value.id.value));
                                }
                            }
                        }
                    });
                    break;
                case DataType.Passwords:
                default:
                    pendingRows = passwordSortedCollection.calculatedValues.map(async p =>
                    {
                        const values: TextTableRowValue[] = [
                            {
                                component: "TableRowTextValue",
                                value: p.value.passwordFor.value,
                                copiable: false,
                                width: 'clamp(100px, 7vw, 200px)'
                            },
                            {
                                component: "TableRowTextValue",
                                value: p.value.login.value,
                                copiable: false,
                                width: 'clamp(100px, 7vw, 200px)'
                            }
                        ];

                        const id = await api.utilities.generator.uniqueId();
                        const model: SelectableTableRowData = {
                            id: id,
                            key: p.value.id.value,
                            values: values,
                            isActive: ref(groupState.value.passwords.value.has(p.value.id.value)),
                            selectable: true,
                            onClick: async function ()
                            {
                                if (groupState.value.passwords.value.has(p.value.id.value))
                                {
                                    groupState.value.passwords.value.delete(p.value.id.value);                                
                                }
                                else
                                {
                                    groupState.value.passwords.value.set(p.value.id.value, new Field(p.value.id.value));
                                }
                            }
                        }
                        return model;
                    });
            }

            if (pendingRows.length > 0)
            {
                Promise.all(pendingRows).then((rows) =>
                {
                    tableRowDatas.value.setValues(rows);
                    if (tableRef.value)
                    {
                        // @ts-ignore
                        tableRef.value.scrollToTop();
                        setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
                    }
                });
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

        onUpdated(() =>
        {
            setTableRows();
        });

        watch(() => app.activePasswordValuesTable, () =>
        {
            setTableRows();
        });

        watch(() => app.currentVault.passwordStore.passwords.length, setTableRows);
        watch(() => app.currentVault.valueStore.nameValuePairs.length, setTableRows);

        watch(() => searchText.value.value, (newValue) =>
        {
            if (app.activePasswordValuesTable == DataType.Passwords)
            {
                passwordSortedCollection.search(newValue);
            }
            else if (app.activePasswordValuesTable == DataType.NameValuePairs)
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
