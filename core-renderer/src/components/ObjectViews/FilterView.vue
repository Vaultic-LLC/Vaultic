<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField class="filterView__name" :label="'Name'" :color="color" v-model="filterState.name"
            :width="'8vw'" :height="'4vh'" :minHeight="'35px'" />
        <TableTemplate ref="tableRef" id="addFilterTable" class="scrollbar" :scrollbar-size="1" :color="color"
            :row-gap="0" :border="true" :emptyMessage="emptyMessage"
            :showEmptyMessage="filterState?.conditions?.length == 0 ?? true" :headerTabs="headerTabs">
            <template #headerControls>
                <AddButton :color="color" @click="onAdd" />
            </template>
            <template #body>
                <FilterConditionRow v-for="( fc, index ) in  filterState.conditions" :key="fc.id" :rowNumber="index"
                    :color="color" :model="fc" :displayFieldOptions="displayFieldOptions" @onDelete="onDelete(fc.id)" />
            </template>
        </TableTemplate>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import FilterConditionRow from '../Table/Rows/FilterConditionRow.vue';

import { DataType, Filter } from '../../Types/Table';
import { DisplayField, FilterablePasswordProperties, FilterableValueProperties, defaultFilter } from '../../Types/EncryptedData';
import { GridDefinition, HeaderTabModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { generateUniqueID } from '../../Helpers/generatorHelper';
import { TableTemplateComponent } from '../../Types/Components';

export default defineComponent({
    name: "FilterView",
    components: {
        ObjectView,
        TextInputField,
        TableTemplate,
        TableHeaderRow,
        AddButton,
        FilterConditionRow
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const refreshKey: Ref<string> = ref("");
        const filterState: Ref<Filter> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.filtersColor);
        const displayFieldOptions: ComputedRef<DisplayField[]> = computed(() => app.activePasswordValuesTable == DataType.Passwords ?
            FilterablePasswordProperties : FilterableValueProperties);

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
                    filterState.value = await defaultFilter(filterState.value.type);
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
            filterState.value.conditions.push(
                {
                    id: await generateUniqueID(filterState.value.conditions),
                    property: '',
                    value: ''
                });

            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        function onDelete(id: string)
        {
            filterState.value.conditions = filterState.value.conditions.filter(f => f.id != id);
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        }

        onMounted(() =>
        {
            if (filterState.value.conditions.length == 0)
            {
                onAdd();
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
            onSave,
            onAdd,
            onDelete
        };
    },
})
</script>

<style>
#addFilterTable {
    position: relative;
    grid-row: 4 / span 8;
    grid-column: 4 / span 9;
    height: 110%;
    min-width: 410px;
    min-height: 200px;
}

.filterView__name {
    grid-row: 1 / span 2;
    grid-column: 4 / span 2;
}
</style>
