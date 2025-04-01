<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition" :hideButtons="readOnly">
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
import { PendingStoreState } from '@vaultic/shared/Types/Stores';
import { FilterStoreState, FilterStoreStateKeys } from '../../Objects/Stores/FilterStore';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

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
        let filterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys> = app.currentVault.filterStore.getPendingState()!;
        
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const filterState: Reactive<Filter> = props.creating ? reactive(props.model) : setupProxies(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.f);
        const displayFieldOptions: ComputedRef<PropertySelectorDisplayFields[]> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            FilterablePasswordProperties : FilterableValueProperties);

        let allConditions: { [key: string]: FilterCondition } = {};
        let addedConditions: FilterCondition[] = [];
        let removedConditions: string[] = [];

        const filterConditionModels: SortedCollection = new SortedCollection([], () => allConditions);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const readOnly: Ref<boolean> = ref(app.currentVault.isReadOnly.value);

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
                if (await app.currentVault.filterStore.addFilter(key, filterState, filterStoreState))
                {
                    // This won't track changes within the pending store since we didn't re create the 
                    // custom ref but that's ok since we are creating
                    filterStoreState = app.currentVault.filterStore.getPendingState()!;

                    // TODO: this is causing issues since the same object reference is saved to the store later on.
                    // Find another way to do this
                    //Object.assign(filterState, defaultFilter(filterState.t));

                    allConditions = {};
                    addedConditions = [];
                    removedConditions = [];

                    await onAdd();
                    refreshKey.value = Date.now().toString();
                    handleSaveResponse(true);

                    return;
                }

                handleSaveResponse(false);
            }
            else
            {
                if (await app.currentVault.filterStore.updateFilter(key, filterState, addedConditions, 
                    removedConditions, filterStoreState))
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

            allConditions[id] = filterCondition;
            addedConditions.push(filterCondition);

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
            delete allConditions[filterCondition.id];

            const addedIndex = addedConditions.findIndex(c => c.id == filterCondition.id);
            if (addedIndex >= 0)
            {
                addedConditions.splice(addedIndex, 1);
                return;
            }

            removedConditions.push(filterCondition.id);
            filterConditionModels.remove(filterCondition.id);

            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function setupProxies(filter: Filter)
        {
            let dataTypePath: keyof FilterStoreStateKeys | undefined;
            let conditionPath: keyof FilterStoreStateKeys | undefined;

            if (filter.t == DataType.Passwords)
            {
                dataTypePath = 'passwordDataTypesByID.dataType';
                conditionPath = 'passwordDataTypes.conditions.condition';
            }
            else
            {
                dataTypePath = 'valueDataTypesByID.dataType';
                conditionPath = 'valueDataTypes.conditions.condition';
            }

            OH.forEachValue(filter.c, (c, i) =>
            {
                filter.c[i!] = filterStoreState.createCustomRef(conditionPath, c, filter.id, c.id);
            });
            
            // Do this last so that updating setting the conditions doesn't actually track them as a change
            return filterStoreState.createCustomRef(dataTypePath, filter, filter.id);
        }

        onMounted(() =>
        {
            if (OH.size(filterState.c) == 0)
            {
                onAdd();
            }
            else
            {
                let models: TableRowModel[] = [];
                OH.forEach(filterState.c, (k, v)  =>
                {
                    allConditions[k] = v;

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
            readOnly,
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
