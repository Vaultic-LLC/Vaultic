<template>
    <div class="vaulticTableContainer">
        <ConfirmDialog></ConfirmDialog>
        <DataTable scrollable removableSort :value="rowValues" :frozenValue="pinnedRowValues"
            resizableColumns columnResizeMode="fit" :reorderableColumns="true" class="vaulticTableContainer__dataTable" :dataKey="'id'"
            @update:sortOrder="onSortOrder" @update:sortField="onSortField"
            :pt="{
                thead: 'vaulticTableContainer__thead',
                header: 'vaulticTableContainer__header',
                columnResizeIndicator: 'vaulticTableContainer__columnResizeIndicator',
                tableContainer: 
                {
                    id: tableContainerID,
                    class: 'vaulticTableContainer__dataTableTableContainer'
                },
                table:'vaulticTableContainer__dataTableTable',
                bodyRow: ({ context }) => 
                {
                    return {
                        class: 'vaulticTableContainer__dataTableRow',
                        style: { 'animation-delay': `${(context.index % rowChunkAmount) / 8}s` }
                    }
                }
            }">
            <template #header>
                <div class="vaulticTableContainer__tabContainer">
                    <TableHeaderTab v-for="(model, index) in headerTabs" :key="index" :model="model" />
                </div>
            </template>
            <Column v-for="(column) in columns" :key="column.field" :field="column.field" :header="column.header" :columnKey="getColumnID()" sortable 
                class="vaulticTableContainer__column" :headerStyle="{'width': `${column.startingWidth ?? 'auto'} !important`}"
                :pt="{
                    headerCell:['vaulticTableContainer__headerCell', 'vaulticTableContainer__headerCell--reOrderable']
                }">
                <template #sorticon="{ sortOrder }">
                    <i v-if="sortOrder === 0" class="pi pi-arrow-up vaulticTableContainer__column--no-sort" />
                    <i v-else class="pi pi-arrow-up" :class="{'vaulticTableContainer__column--sort-rotate' : sortOrder === -1}" />
                </template>
                <template #body="slotProps">
                    <component v-if="column.component != undefined" :is="column.component" :model="(slotProps.data as TableRowModel).backingObject?.value[column.field]?.value" :data="column.data" />
                    <template v-else>
                        {{ (slotProps.data as TableRowModel).backingObject?.value[column.field]?.value }}
                    </template>
                </template>
            </Column>
            <Column :columnKey="'tableControls'" class="w-24 !text-end vaulticTableContainer__column" :reorderableColumn="false" 
                :pt="{
                    headerCell:['vaulticTableContainer__headerCell', 'vaulticTableContainer__ControlsHeaderCell'],
                    columnHeaderContent: 'vaulticTableContainer__headerControlsContent'
                }">
                <template #header="">
                    <div class="flex justify-end" v-if="showSearchBar">
                        <SearchBar :modelValue="searchText" :color="color" @update:modelValue="onSearch" />
                    </div>
                    <slot name="tableControls"></slot>
                </template>
                <template #body="{ data, frozenRow }">
                    <div class="vaulticTableContainer__rowIconButtonsContainer">
                        <div v-if="(data as TableRowModel).atRiskModel" class="vaulticTableContainer__rowIconButton" @click="(data as TableRowModel).atRiskModel?.onClick">
                            <div class="tableRow__rowIconContainer">
                                <AtRiskIndicator :color="color" :message="(data as TableRowModel).atRiskModel?.message" />
                            </div>
                        </div>
                        <div v-if="internalOnPin" class="vaulticTableContainer__rowIconButton" @click="internalOnPin(frozenRow, (data as TableRowModel).backingObject)">
                            <ion-icon class="rowIcon magnet" name="magnet-outline"></ion-icon>
                        </div>
                        <div v-if="onEdit" class="vaulticTableContainer__rowIconButton" @click="onEdit((data as TableRowModel).backingObject)">
                            <ion-icon class="rowIcon edit" name="create-outline"></ion-icon>
                        </div>
                        <div v-if="onDelete" class="vaulticTableContainer__rowIconButton" @click="deleteConfirm((data as TableRowModel).backingObject)">
                            <ion-icon class="rowIcon delete" name="trash-outline"></ion-icon>
                        </div>
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, onUnmounted, Ref, ref, useId, watch } from 'vue';

import TableHeaderTab from './Header/TableHeaderTab.vue';
import DataTable from "primevue/datatable";
import Column from 'primevue/column';
import Button from 'primevue/button';
import SearchBar from './Controls/SearchBar.vue';

import GroupIconsRowValue from './Rows/GroupIconsRowValue.vue';
import ConfirmDialog from "primevue/confirmdialog";
import AtRiskIndicator from "./AtRiskIndicator.vue"

import { HeaderTabModel, SortableHeaderModel, TableCollections, TableColumnModel, TableRowModel } from '../../Types/Models';
import { widgetBackgroundHexString } from '../../Constants/Colors';
import { RGBColor } from '../../Types/Colors';
import { hexToRgb } from '../../Helpers/ColorHelper';
import { tween } from '../../Helpers/TweenHelper';
import * as TWEEN from '@tweenjs/tween.js';
import { useConfirm } from "primevue/useconfirm";
import { rowChunkAmount } from '../../Constants/Misc';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';


// Base Component for all Tables.
// --- Scrollbar Color Usage ---
// The scrollbar color is very finicky. You must ensure that any update that needs to update the scrollbar color
// only calls calcScrollbarColor once. Otherwise the transition will not work.
// Automatic Handling:
// onResize handles resizing
// watch(() => props.color)) handles if just the prop color changes
// Anything else needs to be done manually, i.e. if the number of rows is being changed, by calling calcScrollbarColor
// on a ref of the TableTemplate that is wrapped in a setTimeout, but only if it isn't already handled by the automatic ones above.
export default defineComponent({
    name: "VaulticTable",
    components:
    {
        TableHeaderTab,
        DataTable,
        Column,
        Button,
        SearchBar,
        GroupIconsRowValue,
        ConfirmDialog,
        AtRiskIndicator
    },
    props: ['color', 'pinnedValues', 'columns', 'scrollbarSize', 'headerModels', 'border', 'showEmptyMessage', 'emptyMessage', 'backgroundColor',
        'headerTabs', 'headerHeight', 'hideHeader', 'initialPaddingRow', 'allowSearching', 'valueName', 'onPin', 'onEdit', 'onDelete', 'collections'],
    setup(props)
    {
        const tableContainerID = ref(useId());

        const resizeObserver: ResizeObserver = new ResizeObserver(onResize);
        const key: Ref<string> = ref('');
        const table: Ref<HTMLElement | null> = ref(null);
        const tableContainer: Ref<HTMLElement | null> = ref(null);
        const primaryColor: ComputedRef<string> = computed(() => props.color);
        const rowGapValue: ComputedRef<string> = computed(() => props.rowGap ?? "0px");
        const columns: ComputedRef<TableColumnModel[]> = computed(() => props.columns);
        const headers: ComputedRef<SortableHeaderModel[]> = computed(() => props.headerModels ?? []);
        const applyBorder: ComputedRef<boolean> = computed(() => props.border == true);
        const backgroundColor: ComputedRef<string> = computed(() => props.backgroundColor ? props.backgroundColor : widgetBackgroundHexString());
        const currentHeaderTabs: ComputedRef<HeaderTabModel[]> = computed(() => props.headerTabs ?? []);
        const scrollbarClass: ComputedRef<string> = computed(() => props.scrollbarSize == 0 ? "small" : props.scrollbarSize == 1 ? "medium" : "");
        const useInitalPaddingRow: ComputedRef<boolean> = computed(() => props.initialPaddingRow === false ? false : true);

        const showSearchBar: ComputedRef<boolean> = computed(() => props.allowSearching != undefined ? props.allowSearching : true);
        const tableCollections: Ref<TableCollections> = ref(props.collections);    
        const activeTableCollection: ComputedRef<SortedCollection> = computed(() => tableCollections.value.collections[tableCollections.value.activeIndex()]);
        const rowValues: Ref<TableRowModel[]> = ref([]);

        const pinnedRowValues: Ref<TableRowModel[]> = ref(props.pinnedValues ?? []);
        const searchText: Ref<string | undefined > = ref();

        let tweenGroup: TWEEN.Group | undefined = undefined;
        let scrollbarColor: Ref<string> = ref(primaryColor.value);
        let thumbColor: Ref<string> = ref(primaryColor.value);

        let lastColor: Ref<string> = ref(primaryColor.value);
        let lastScrollHeight: number = Number.MAX_VALUE;

        let lastClientHeight: number | undefined = 0;
        let lastClientWidth: number | undefined = 0;

        let currentColumnId = 0;

        function getColumnID()
        {
            currentColumnId += 1;
            return currentColumnId.toString();
        }

        function onResize()
        {
            // make sure we actually resized and didn't just change table headers
            if (tableContainer.value?.clientHeight == lastClientHeight &&
                tableContainer.value?.clientWidth == lastClientWidth)
            {
                return;
            }

            calcScrollbarColor();
        }

        function calcScrollbarColor()
        {
            if (!primaryColor?.value)
            {
                return;
            }

            // cancle the current tween so it doesn't interfere with the new one
            // otherwise the filter / group table scrollbar won't transition properly when clicking
            // between the passwords / values fast
            tweenGroup?.removeAll();

            if (tableContainer.value?.scrollHeight && tableContainer.value.clientHeight)
            {
                const from: RGBColor | null = hexToRgb(lastColor.value);
                const to: RGBColor | null = hexToRgb(primaryColor.value);

                if (tableContainer.value?.scrollHeight <= tableContainer.value?.clientHeight)
                {
                    scrollbarColor.value = lastColor.value;
                    tweenGroup = tween<RGBColor>(from!, to!, 500, (object) =>
                    {
                        scrollbarColor.value = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
                    });
                }
                else
                {
                    if (primaryColor.value != lastColor.value || tableContainer.value?.scrollHeight < lastScrollHeight ||
                        tableContainer.value?.scrollHeight > lastScrollHeight)
                    {
                        thumbColor.value = lastColor.value;
                        tweenGroup = tween<RGBColor>(from!, to!, 500, (object) =>
                        {
                            thumbColor.value = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
                        });

                        // only transition the scrollbar if there was no thumb aka if it took up the full track, otherwise it'll
                        // flash the from color
                        if (primaryColor.value != lastColor.value && tableContainer.value?.clientHeight == lastScrollHeight)
                        {
                            tweenGroup = tween<RGBColor>(from!, hexToRgb('#0f111d')!, 500, (object) =>
                            {
                                scrollbarColor.value = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
                            });
                        }
                        else
                        {
                            // pretty sure we should only be here when resizing the table smaller than all the rows,
                            // so the scrollbar thumb should show up
                            thumbColor.value = lastColor.value;
                            scrollbarColor.value = '#0f111d';
                        }
                    }
                    else
                    {
                        scrollbarColor.value = '#0f111d';
                    }
                }

                lastScrollHeight = tableContainer.value?.scrollHeight;
            }

            lastClientHeight = tableContainer.value?.clientHeight;
            lastClientWidth = tableContainer.value?.clientWidth;

            lastColor.value = primaryColor.value;
        }

        let lastCallTime: number = 0;
        function checkScrollHeight(event: any)
        {
            const debounce: number = 100;
            if (Date.now() - lastCallTime < debounce)
            {
                return;
            }

            const loadMoreRowsThreshold: number = Math.max(1 / (0.000009 * ((tableContainer.value?.scrollHeight ?? 2) - (tableContainer.value?.offsetHeight ?? 1))), 200);
            if (!tableContainer.value?.offsetHeight || (tableContainer.value?.scrollTop + loadMoreRowsThreshold) >= (tableContainer.value?.scrollHeight - tableContainer.value?.offsetHeight))
            {
                activeTableCollection.value.loadNextChunk();
                rowValues.value = activeTableCollection.value.visualValues;
            }

            lastCallTime = Date.now();
        }

        function scrollToTop()
        {
            if (tableContainer.value)
            {
                tableContainer.value.scrollTop = 0;
            }
        }

        // watch(() => props.emptyMessage, () =>
        // {
        //     key.value = Date.now().toString();
        // });

        function internalOnPin(isPinning: boolean, backingObject: any)
        {
            if (isPinning)
            {
                const index = rowValues.value.indexOf(backingObject);
                if (index < 0)
                {
                    return;
                }
    
                rowValues.value.splice(index, 1);
                pinnedRowValues.value.push(backingObject);
            }
            else 
            {
                const index = pinnedRowValues.value.indexOf(backingObject);
                if (index < 0)
                {
                    return;
                }
    
                pinnedRowValues.value.splice(index, 1);
                rowValues.value.push(backingObject);
            }

            props.onPin?.(isPinning, backingObject);
        }

        function onSortOrder(value: undefined | number)
        {
            activeTableCollection.value.updateSort(activeTableCollection.value.property, value == -1, true);
        }

        function onSortField(value: string)
        {
            // don't actually do the sort yet since onSortOrder will be called after
            activeTableCollection.value.updateSort(value, activeTableCollection.value.descending, false);
        }

        const confirm = useConfirm();
        const deleteConfirm = (backingObject: any) => 
        {
            confirm.require({
                message: `Are you sure you want to delete this ${props.valueName}?`,
                header: `Delete ${props.valueName}`,
                icon: 'pi pi-info-circle',
                rejectLabel: 'Cancel',
                rejectProps: {
                    label: 'Cancel',
                    severity: 'secondary',
                    outlined: true
                },
                acceptProps: {
                    label: 'Delete',
                    severity: 'danger'
                },
                accept: () => {
                    props.onDelete?.(backingObject);
                },
                reject: () => { }
            });
        };

        function onTableCollectionUpdate()
        {
            rowValues.value = activeTableCollection.value.visualValues;
        }

        function onSearch(value: string | undefined)
        {
            activeTableCollection.value.search(value ?? "");
        }

        watch(() => activeTableCollection.value, () => 
        {
            rowValues.value = activeTableCollection.value.visualValues;
            searchText.value = activeTableCollection.value.searchText;
        });

        watch(() => props.color, () =>
        {
            setTimeout(calcScrollbarColor, 1);
        });
    
        onMounted(() =>
        {
            if (tableCollections.value)
            {
                tableCollections.value.collections.forEach(c => c.onUpdate = onTableCollectionUpdate);
            }

            tableContainer.value = document.getElementById(tableContainerID.value);
            if (tableContainer.value)
            {
                tableContainer.value.addEventListener('scroll', checkScrollHeight, true);
                resizeObserver.observe(tableContainer.value);
            }
        });

        onUnmounted(() =>
        {
            if (tableContainer.value)
            {
                tableContainer.value.removeEventListener('scroll', checkScrollHeight, true);
                resizeObserver.unobserve(tableContainer.value);
            }
        });

        // Don't use this. It causes multiple and unexpected calls to calcScrollbarColor, which will cause Tweens to not function
        // correctly. calcScrollbarColor should only be called when known that it will only call once per needed update.
        // onUpdated(() =>
        // {
        // 		calcScrollbarColor();
        // });

        return {
            tableContainerID,
            rowChunkAmount,
            columns,
            rowValues,
            pinnedRowValues,
            searchText,
            showSearchBar,
            key,
            table,
            tableContainer,
            primaryColor,
            scrollbarColor,
            thumbColor,
            rowGapValue,
            headers,
            applyBorder,
            backgroundColor,
            currentHeaderTabs,
            scrollbarClass,
            useInitalPaddingRow,
            checkScrollHeight,
            scrollToTop,
            calcScrollbarColor,
            deleteConfirm,
            internalOnPin,
            getColumnID,
            onSortOrder,
            onSortField,
            onSearch
        }
    },
})
</script>

<style scoped>
.vaulticTableContainer {
    position: absolute;
}

:deep(.vaulticTableContainer__thead) {
    background: #181822 !important;
}

:deep(.vaulticTableContainer__header) {
    background: transparent;
    padding: 0;
    height: 6%;
}

.vaulticTableContainer__tabContainer {
    width: 100%;
    height: 100%;
    display: flex;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    color: white;
    font-size: clamp(10px, 1vw, 20px);
}

.vaulticTableContainer__dataTable{
    height: 100%;
}

:deep(.vaulticTableContainer__dataTableTableContainer) {
    height: 94%;
    overflow-x: hidden !important;
    overflow-y: scroll !important;
    background: v-bind(backgroundColor);
}

:deep(.vaulticTableContainer__dataTableTable){
}

:deep(.vaulticTableContainer__headerCell) {
    border-right-width: 1px;
}

:deep(.vaulticTableContainer__headerCell--reOrderable) {
    cursor: move;
}

:deep(.vaulticTableContainer__ControlsHeaderCell) {
    width: 10px !important;
    cursor:auto;
}

:deep(.vaulticTableContainer__headerControlsContent) {
    justify-content: end;
    padding-right: 25px;
    column-gap: 15px;
}

:deep(.vaulticTableContainer__columnResizeIndicator) {
    width: 1px;
    background: v-bind(color);
    height: 94% !important;
    top: 6% !important;
}

:deep(.vaulticTableContainer__column) {
    background: transparent !important;
    transition: 0.3s;
}

:deep(.vaulticTableContainer__column--no-sort) {
    opacity: 0;
    transition: 0.3s;
}

:deep(.vaulticTableContainer__column):hover .vaulticTableContainer__column--no-sort {
    opacity: 0.7;
}

:deep(.vaulticTableContainer__column--sort-rotate) {
    transition: 0.3s;
    transform: rotate(180deg);
}

:deep(.vaulticTableContainer__dataTableRow) {
    height: clamp(40px, 3.5vw, 100px);
    background: transparent;
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

:deep(.vaulticTableContainer__dataTableTableContainer::-webkit-scrollbar) {
    width: clamp(7px, 0.7vw, 10px);
}

:deep(.vaulticTableContainer__dataTableTableContainer::-webkit-scrollbar-track) {
    transition: 0.3s;
    background: v-bind(scrollbarColor);
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
    border-top-right-radius: 20px;
    border-bottom-right-radius: 20px;
}

:deep(.vaulticTableContainer__dataTableTableContainer::-webkit-scrollbar-thumb) {
    max-width: 50%;
    transition: 0.3s;
    background: v-bind(thumbColor);
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
    border-top-right-radius: 20px;
    border-bottom-right-radius: 20px;
}

.vaulticTableContainer__rowIconButtonsContainer {
    display: flex;
    justify-content: space-around;
    padding-right: 20px;
    align-items: center
}

.vaulticTableContainer__rowIconButton {
    color: white;
    font-size: clamp(18px, 1.1vw, 28px) !important;
    transition: 0.3s;
    cursor: pointer;
}

.vaulticTableContainer__rowIconButton:hover {
    color: v-bind(primaryColor) !important;
    background: transparent !important;
    transform: scale(1.1);
}

.vaulticTableContainer__rowIconButton .magnet {
    transform: rotate(134deg)
}

.vaulticTableContainer__rowIconButton:hover .magnet {
    color: v-bind(primaryColor);
    transform: rotate(134deg) scale(1.05);
}
</style>
