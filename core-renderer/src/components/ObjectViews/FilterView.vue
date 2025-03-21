<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <VaulticFieldset :centered="true">
            <TextInputField class="filterView__name" :label="'Name'" :color="color" v-model="filterState.n"
                :width="'50%'" :maxWidth="''" :fadeIn="false" />
        </VaulticFieldset>
        <VaulticFieldset :centered="true" :end="true" :fill-space="true">
            <VaulticTable ref="tableRef" id="addFilterTable" :color="color" :columns="tableColumns" 
                :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyMessage" :allowPinning="false"
                :allowSearching="false" :onDelete="onDelete">
                <template #tableControls>
                    <Transition name="fade" mode="out-in">
                        <AddButton :color="color" @click="onAdd" />
                    </Transition>
                </template>
            </VaulticTable>
        </VaulticFieldset>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, Reactive, reactive } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import VaulticTable from '../Table/VaulticTable.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';

import { DataType, defaultFilter, EqualFilterConditionType, Filter, FilterCondition, FilterConditionType, NameValuePairType } from '../../Types/DataTypes';
import { GridDefinition, HeaderTabModel, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { FilterablePasswordProperties, FilterableValueProperties, PropertySelectorDisplayFields, PropertyType } from '../../Types/Fields';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { uniqueIDGenerator } from '@vaultic/shared/Utilities/UniqueIDGenerator';

export default defineComponent({
    name: "FilterView",
    components: {
        ObjectView,
        TextInputField,
        AddButton,
        VaulticTable,
        VaulticFieldset
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const filterState: Ref<Filter> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.f);
        const displayFieldOptions: ComputedRef<PropertySelectorDisplayFields[]> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            FilterablePasswordProperties : FilterableValueProperties);

        const filterConditionModels: SortedCollection = new SortedCollection([], () => filterState.value.c);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const emptyMessage: Ref<string> = ref(getEmptyTableMessage("Filter Conditions"));

        const gridDefinition: GridDefinition =
        {
            rows: 12,
            rowHeight: 'clamp(10px, 2vw, 50px)',
            columns: 14,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Filter Conditions',
                active: computed(() => true),
                color: color,
                onClick: () => { }
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const tableColumnsModels: TableColumnModel[] = [];
            tableColumnsModels.push(new TableColumnModel("Property", "p").setComponent("PropertySelectorCell")
                .setData({ color: color.value, properties: displayFieldOptions.value, label: "Property" }).setSortable(false));

            tableColumnsModels.push(new TableColumnModel("Condition", "t").setComponent("EnumInputCell")
                .setData({ color: color.value, label: "Condition" }).setSortable(false));

            tableColumnsModels.push(new TableColumnModel("Value", "v").setComponent("FilterValueSelectorCell")
                .setData({ color: color.value }).setSortable(false));

            return tableColumnsModels;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => 0,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Filter Condition",
                    collection: filterConditionModels,
                }
            ]
        });
        
        function onSave()
        {
            app.popups.showRequestAuthentication(color.value, doSave, onAuthCancelled);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function doSave(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Filter");
            if (props.creating)
            {
                if (await app.currentVault.filterStore.addFilter(key, filterState.value))
                {
                    filterState.value = defaultFilter(filterState.value.t);
                    await onAdd();
                    refreshKey.value = Date.now().toString();

                    handleSaveResponse(true);
                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                if (await app.currentVault.filterStore.updateFilter(key, filterState.value))
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

        function onAuthCancelled()
        {
            saveFailed(false);
        }

        async function onAdd()
        {
            const id = uniqueIDGenerator.generate();
            const filterCondition: FilterCondition = {
                id,
                p: '',
                v: '',
                t: undefined
            };

            filterState.value.c.set(id, filterCondition);

            const tableRowModel = new TableRowModel(id, false, undefined, 
            {
                filterConditionType: FilterConditionType,
                inputType: PropertyType.String
            });

            filterConditionModels.push(tableRowModel);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function onDelete(filterCondition: FilterCondition)
        {
            filterState.value.c.delete(filterCondition.id);
            filterConditionModels.remove(filterCondition.id);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        onMounted(() =>
        {
            if (filterState.value.c.size == 0)
            {
                onAdd();
            }
            else
            {
                let models: TableRowModel[] = [];
                filterState.value.c.forEach((v, k, map) =>
                {
                    const propertyType = displayFieldOptions.value.find(df => df.backingProperty == v.p)?.type ?? PropertyType.String;
                    models.push(new TableRowModel(k, false, undefined, 
                    {
                        filterConditionType: propertyType == PropertyType.String ? FilterConditionType : EqualFilterConditionType,
                        inputType: propertyType,
                        filterType: v.t,
                        inputEnumType: propertyType == PropertyType.Enum ? NameValuePairType : undefined    // Passwords don't have an emum selectable type
                    }));
                });

                filterConditionModels.updateValues(models);
            }
        })

        return {
            tableRef,
            color,
            filterState,
            displayFieldOptions,
            refreshKey,
            gridDefinition,
            emptyMessage,
            headerTabs,
            tableColumns,
            tableDataSources,
            onSave,
            onAdd,
            onDelete
        };
    },
})
</script>

<style>
#addFilterTable {
    width: 70%;
    height: 70%;
    transform: translateY(-15%);
}
</style>
