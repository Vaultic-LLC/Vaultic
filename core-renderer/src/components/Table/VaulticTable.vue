<template>
    <div class="vaulticTableContainer">
        <DataTable scrollable lazy :first="firstRow" :rows="rowsToDisplay" :value="rowValues" :sortField="defaultSortField"
            :sortOrder="defaultSortOrder" :totalRecords="totalRecords" :paginator="!hidePaginator" :rowsPerPageOptions="[5, 15, 30, 50]" 
            :loading="loading" resizableColumns columnResizeMode="fit" :reorderableColumns="true" class="vaulticTableContainer__dataTable"
            @update:sortOrder="onSortOrder" @update:sortField="onSortField" @value-change="calcScrollbarColor" @page="onPage"
            :pt="{
                thead: 'vaulticTableContainer__thead',
                header: () =>
                {
                    const display = headerTabs && headerTabs.length > 0 ? 'block': 'none';
                    return {
                        class: 'vaulticTableContainer__header',
                        style: { 'display': display }
                    }
                },
                columnResizeIndicator: 'vaulticTableContainer__columnResizeIndicator',
                tableContainer: () =>
                {
                    const height = hidePaginator ? '100%' : 'calc(100% - 50px)';
                    return {
                        id: tableContainerID,
                        class: 'vaulticTableContainer__dataTableTableContainer',
                        style: { 'height': height }
                    }
                },
                bodyRow: ({ context }) => 
                {
                    const height = smallRows ? 'clamp(30px, 2vw, 70px)' : 'clamp(40px, 3.5vw, 100px)';
                    return {
                        class: 'vaulticTableContainer__dataTableRow',
                        style: { 'animation-delay': `${(Math.min(context.index, 10) / 8)}s`, 'height': height }
                    }
                },
                emptyMessage: 'vaulticTableContainer__emptyMessage',
                emptyMessageCell: 'vaulticTableContainer__emptyMessageCell',
                pcPaginator: () => 
                {
                    return {
                        paginatorContainer: 'vaulticTableContainer__paginatorContainer',
                        root: 'vaulticTableContainer__paginator',
                        content: 'vaulticTableContainer__paginatorContent',
                        first: 'vaulticTableContainer__paginatorNavigationButton',
                        firstIcon: 'vaulticTableContainer__paginatorNavigationIcon',
                        pages: 'vaulticTableContainer__paginatorPages',
                        page: 'vaulticTableContainer__pageIcon',
                        prev: 'vaulticTableContainer__paginatorNavigationButton',
                        prevIcon: 'vaulticTableContainer__paginatorNavigationIcon',
                        next: 'vaulticTableContainer__paginatorNavigationButton',
                        nextIcon: 'vaulticTableContainer__paginatorNavigationIcon',
                        last: 'vaulticTableContainer__paginatorNavigationButton',
                        lastIcon: 'vaulticTableContainer__paginatorNavigationIcon',
                        pcRowPerPageDropdown: () => 
                        {
                            return {
                                'appendTo': 'self',
                                root: 'vaulticTableContainer__pageCountSelect',
                                label: 'vaulticTableContainer__pageCountSelectLabel',
                                dropdown: 'vaulticTableContainer__pageCountSelectDropdown',
                                // @ts-ignore
                                option: ({ context }) => 
                                {
                                    const style: { [key: string]: any} = 
                                    {
                                        padding: 'clamp(4px, 0.4vw, 8px) clamp(6px, 0.6vw, 12px) !important',
                                        'font-size': 'clamp(11px, 1vw, 16px)'
                                    };

                                    if (context.selected)
                                    {
                                        style['background'] = `color-mix(in srgb, ${primaryColor}, transparent 84%) !important`;
                                    }

                                    return {
                                        style
                                    };
                                }
                            }
                        }
                    }
                }
            }">
            <template #header>
                <div class="vaulticTableContainer__tabContainer" v-if="headerTabs && headerTabs.length > 0">
                    <TableHeaderTab v-for="(model, index) in headerTabs" :key="index" :model="model" />
                </div>
            </template>
            <template #empty>
                {{ emptyMessage }}
            </template>
            <Column v-for="(column) in columns" :key="column.field" :field="column.field" :header="column.header" :columnKey="getColumnID()" :sortable="column.sortable !== false" 
                class="vaulticTableContainer__column" :headerStyle="{'width': `${column.startingWidth ?? 'auto'} !important`}"
                :pt="{
                    headerCell:['vaulticTableContainer__headerCell', 'vaulticTableContainer__headerCell--reOrderable']
                }">
                <template #sorticon="{ sortOrder }">
                    <i v-if="sortOrder === 0" class="pi pi-arrow-up vaulticTableContainer__sortIcon vaulticTableContainer__column--no-sort" />
                    <i v-else class="pi pi-arrow-up vaulticTableContainer__sortIcon" :class="{'vaulticTableContainer__column--sort-rotate' : sortOrder === -1}" />
                </template>
                <template #body="slotProps">
                    <!-- Click handler needs its own div since cellWrapper has padding, which isn't clickable -->
                    <div class="vaulticTableContainer__cellWrapper" :class="{'vaulticTableContainer__cellWrapper--clickable': !!column.onClick}"
                            @click="() => column.onClick?.((slotProps.data as TableRowModel<any>).backingObject)"
                            @click.right.stop="!column.isGroupIconCell && !column.component ? 
                                onTextClick(column, (slotProps.data as TableRowModel<any>).backingObject) : undefined">
                        <div class="vaulticTableContainer__cell">
                            <!-- TODO Tooltip no longer works on group icons -->
                            <div v-if="column.isGroupIconCell" class="vaulticTableContainer__groupIconCell">
                                <div v-for="model in (slotProps.data as TableRowModel<any>).state['groupModels']" class="vaulticTableContainer__groupIconContainer" 
                                    :style="{ background: `color-mix(in srgb, ${model.color}, transparent 84%)`}">
                                    <span class="vaulticTableContainer__groupIconSpan">
                                        <i v-if="model.icon" :class='`pi ${model.icon} vaulticTableContainer__groupIcon`' :style="{color: model.color}"></i>
                                        <template v-else class="vaulticTableContainer__groupIcon" :style="{color: model.color}">{{ model.toolTipText[0] }}</template>
                                    </span>
                                </div>
                            </div>
                            <component v-else-if="column.component != undefined" :is="column.component" :model="(slotProps.data as TableRowModel<any>).backingObject" 
                                :field="column.field" :data="column.data" :state="(slotProps.data as TableRowModel<any>).state" :isFielded="column.isFielded" />
                            <template v-else-if="column.isFielded === false">
                                {{ (slotProps.data as TableRowModel<any>).backingObject?.[column.field] }}
                            </template>
                            <template v-else>
                                {{ (slotProps.data as TableRowModel<any>).backingObject?.value[column.field]?.value }}
                            </template>
                        </div>
                    </div>
                </template>
            </Column>
            <Column :columnKey="'tableControls'" class="w-24 !text-end vaulticTableContainer__column" :reorderableColumn="false"
                :pt="{
                    headerCell:['vaulticTableContainer__headerCell', 'vaulticTableContainer__ControlsHeaderCell'],
                    columnHeaderContent: 'vaulticTableContainer__headerControlsContent'
                }">
                <template #header="">
                    <div class="flex justify-end" v-if="showSearchBar">
                        <SearchBar :modelValue="searchText" :color="color" :sizeModel="searchBarSizeModel" @update:modelValue="onSearch" />
                    </div>
                    <slot name="tableControls"></slot>
                </template>
                <template #body="{ data }">
                    <div class="vaulticTableContainer__rowIconButtonsContainer">
                        <div v-if="(data as TableRowModel<any>).atRiskModel" class="vaulticTableContainer__rowIconButton" @click="(data as TableRowModel<any>).atRiskModel?.onClick">
                            <div class="tableRow__rowIconContainer">
                                <AtRiskIndicator :color="color" :message="(data as TableRowModel<any>).atRiskModel?.message" />
                            </div>
                        </div>
                        <div v-if="allowPinning !== false" class="vaulticTableContainer__rowIconButton" @click="internalOnPin((data as TableRowModel<any>).isPinned === true, data)">
                            <IonIcon class="rowIcon magnet" :class="{ isPinned: (data as TableRowModel<any>).isPinned === true}" :name="'magnet-outline'" />
                        </div>
                        <div v-if="onEdit" class="vaulticTableContainer__rowIconButton" @click="(e) => onEdit((data as TableRowModel<any>).backingObject, e)">
                            <IonIcon class="rowIcon edit" :name="'create-outline'" />
                        </div>
                        <div v-if="onDelete" class="vaulticTableContainer__rowIconButton" @click="deleteConfirm((data as TableRowModel<any>).backingObject)">
                            <IonIcon class="rowIcon delete" :name="'trash-outline'" />
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
import DataTable, { DataTablePageEvent } from "primevue/datatable";
import Column from 'primevue/column';
import Button from 'primevue/button';
import SearchBar from './Controls/SearchBar.vue';

import AtRiskIndicator from "./AtRiskIndicator.vue";
import SelectorButtonTableRowCell from './Rows/SelectorButtonTableRowCell.vue';
import ColorTableRowCell from './Rows/ColorTableRowCell.vue';
import PropertySelectorCell from './Rows/PropertySelectorCell.vue';
import EnumInputCell from './Rows/EnumInputCell.vue';
import FilterValueSelectorCell from './Rows/FilterValueSelectorCell.vue';
import EncryptedInputCell from "./Rows/EncryptedInputCell.vue";
import PermissionsCell from './Rows/PermissionsCell.vue';
import VaultListCell from "./Rows/VaultListCell.vue";
import IonIcon from '../Icons/IonIcon.vue';

import { TableColumnModel, TableDataSouce, TableDataSources, TableRowModel } from '../../Types/Models';
import { widgetBackgroundHexString } from '../../Constants/Colors';
import { RGBColor } from '../../Types/Colors';
import { hexToRgb } from '../../Helpers/ColorHelper';
import { tween } from '../../Helpers/TweenHelper';
import * as TWEEN from '@tweenjs/tween.js';
import { useConfirm } from "primevue/useconfirm";
import { rowChunkAmount } from '../../Constants/Misc';
import app from '../../Objects/Stores/AppStore';

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
        AtRiskIndicator,
        SelectorButtonTableRowCell,
        ColorTableRowCell,
        PropertySelectorCell,
        EnumInputCell,
        FilterValueSelectorCell,
        EncryptedInputCell,
        PermissionsCell,
        VaultListCell,
        IonIcon
    },
    props: ['color', 'dataSources', 'pinnedValues', 'columns', 'scrollbarSize', 'border', 'emptyMessage', 'backgroundColor',
        'headerTabs', 'allowSearching', 'allowPinning', 'onPin', 'onEdit', 'onDelete', 'searchBarSizeModel', 'loading', 'hidePaginator',
        'smallRows'],
    setup(props)
    {
        const tableContainerID = ref(useId());

        const resizeObserver: ResizeObserver = new ResizeObserver(onResize);
        const key: Ref<string> = ref('');
        const tableContainer: Ref<HTMLElement | null> = ref(null);
        const primaryColor: ComputedRef<string> = computed(() => props.color);
        const columns: ComputedRef<TableColumnModel[]> = computed(() => props.columns);
        const applyBorder: ComputedRef<boolean> = computed(() => props.border == true);
        const backgroundColor: ComputedRef<string> = computed(() => props.backgroundColor ? props.backgroundColor : widgetBackgroundHexString());
        const scrollbarClass: ComputedRef<string> = computed(() => props.scrollbarSize == 0 ? "small" : props.scrollbarSize == 1 ? "medium" : "");

        const showSearchBar: ComputedRef<boolean> = computed(() => props.allowSearching != undefined ? props.allowSearching : true);
        const tableDataSources: Ref<TableDataSources> = ref(props.dataSources);    
        const activeTableDataSource: ComputedRef<TableDataSouce> = computed(() => tableDataSources.value.dataSources[tableDataSources.value.activeIndex()]);
        const rowValues: Ref<TableRowModel<any>[]> = ref([]);

        const pinnedRowValues: Ref<TableRowModel<any>[] | undefined> = ref(props.pinnedValues ?? []);
        const searchText: Ref<string | undefined > = ref();

        const defaultSortField: ComputedRef<string | undefined> = computed(() => activeTableDataSource.value.collection.property);
        const defaultSortOrder: ComputedRef<number> = computed(() => activeTableDataSource.value.collection.descending ? -1 : 1);

        let tweenGroup: TWEEN.Group | undefined = undefined;
        let scrollbarColor: Ref<string> = ref(primaryColor.value);
        let thumbColor: Ref<string> = ref(primaryColor.value);

        let lastColor: Ref<string> = ref(primaryColor.value);
        let lastScrollHeight: number = Number.MAX_VALUE;

        let lastClientHeight: number | undefined = 0;
        let lastClientWidth: number | undefined = 0;

        let currentColumnId = 0;

        const allRows: Ref<TableRowModel<any>[]> = ref([]);
        const totalRecords: Ref<number> = ref(0);
        const firstRow: Ref<number> = ref(0);
        const rowsToDisplay: Ref<number> = ref(15);

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

            // @ts-ignore
            const currentPlace = tableContainer.value?.scrollHeight - tableContainer.value?.offsetHeight - tableContainer.value?.scrollTop;
            if (currentPlace < 600)
            {
                loadNextChunk();
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

        function internalOnPin(isPinned: boolean, model: TableRowModel<any>)
        {
            if (isPinned)
            {
                model.isPinned = false;
                activeTableDataSource.value.pinnedCollection?.remove(model.getBackingObjectIdentifier());
                activeTableDataSource.value.collection.push(model);
            }
            else
            {
                model.isPinned = true;
                activeTableDataSource.value.pinnedCollection?.push(model);
                activeTableDataSource.value.collection.remove(model.getBackingObjectIdentifier());
            }

            props.onPin?.(isPinned, model.backingObject);
        }

        function onSortOrder(value: undefined | number)
        {
            activeTableDataSource.value.collection.updateSort(activeTableDataSource.value.collection.property, value == -1, true);
            activeTableDataSource.value.pinnedCollection?.updateSort(activeTableDataSource.value.pinnedCollection.property, value == -1, true);
        }

        function onSortField(value: string)
        {
            // don't actually do the sort yet since onSortOrder will be called after
            activeTableDataSource.value.collection.updateSort(value, activeTableDataSource.value.collection.descending, false);
            activeTableDataSource.value.pinnedCollection?.updateSort(value, activeTableDataSource.value.pinnedCollection.descending, false);
        }

        const confirm = useConfirm();
        const deleteConfirm = (backingObject: any) => 
        {
            confirm.require({
                message: `Are you sure you want to delete this ${activeTableDataSource.value.friendlyDataTypeName}?`,
                header: `Delete ${activeTableDataSource.value.friendlyDataTypeName}`,
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
            reSetRowValues();
        }

        function onSearch(value: string | undefined)
        {
            activeTableDataSource.value.collection.search(value ?? "");
        }

        function reSetRowValues()
        {
            totalRecords.value = (activeTableDataSource.value.pinnedCollection?.values.length ?? 0) + activeTableDataSource.value.collection.values.length;
            allRows.value = activeTableDataSource.value.pinnedCollection?.calculatedValues != undefined ? [...activeTableDataSource.value.pinnedCollection?.calculatedValues] : [];
            allRows.value.push(...activeTableDataSource.value.collection.calculatedValues);

            rowValues.value = allRows.value.slice(0, rowChunkAmount);
            scrollToTop();
        }
        
        function onPage(e: DataTablePageEvent)
        {
            firstRow.value = e.first;
            rowsToDisplay.value = e.rows;
            rowValues.value = allRows.value.slice(e.first, e.first + Math.min(e.rows, rowChunkAmount));
            scrollToTop();
        }

        function loadNextChunk()
        {
            const rowsToLoad = Math.min(20, rowsToDisplay.value - rowValues.value.length);
            const start = firstRow.value + rowValues.value.length;

            rowValues.value.push(...allRows.value.slice(start, start + rowsToLoad));
        }

        function onTextClick(column: TableColumnModel, object: any)
        {
            if (column.isFielded === false)
            {
                app.copyToClipboard(object?.[column.field])
            }
            else
            {
                app.copyToClipboard(object?.value[column.field]?.value)
            }
        }

        watch(() => activeTableDataSource.value, () => 
        {
            reSetRowValues();
            searchText.value = activeTableDataSource.value.collection.searchText;
        });

        watch(() => props.color, () =>
        {
            setTimeout(calcScrollbarColor, 1);
        });
    
        onMounted(() =>
        {
            if (tableDataSources.value)
            {
                tableDataSources.value.dataSources.forEach(d => 
                {
                    d.collection.onUpdate = onTableCollectionUpdate;
                    if (d.pinnedCollection)
                    {
                        d.pinnedCollection.onUpdate = onTableCollectionUpdate;  
                    }
                });
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
            totalRecords,
            firstRow,
            rowsToDisplay,
            tableContainerID,
            rowChunkAmount,
            columns,
            rowValues,
            pinnedRowValues,
            searchText,
            showSearchBar,
            key,
            tableContainer,
            primaryColor,
            scrollbarColor,
            thumbColor,
            applyBorder,
            backgroundColor,
            defaultSortField,
            defaultSortOrder,
            scrollbarClass,
            onTextClick,
            checkScrollHeight,
            scrollToTop,
            calcScrollbarColor,
            deleteConfirm,
            internalOnPin,
            getColumnID,
            onSortOrder,
            onSortField,
            onSearch,
            onPage
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
    height: clamp(30px, 2.5vw, 50px);

    /* so that there isn't a little bit of border over the scrollbar on the right */
    width: calc(100% - clamp(7px, 0.7vw, 10px));
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
    /* height: calc(100% - 50px); */
    overflow-x: hidden !important;
    overflow-y: scroll !important;
    background: v-bind(backgroundColor);
    /* border-bottom-left-radius: 20px; */
}

:deep(.vaulticTableContainer__headerCell) {
    border-right-width: 1px;
    font-size: clamp(11px, 1vw, 16px) !important;
}

:deep(.vaulticTableContainer__column.vaulticTableContainer__headerCell) {
    padding: clamp(5px, 0.6vw, 12px) clamp(5px, 0.6vw, 16px) !important;
}

:deep(.vaulticTableContainer__headerCell:focus-visible){
    outline: 1px solid v-bind(primaryColor) !important;
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
    font-size: clamp(12px, 1vw, 16px);
    padding: 0 !important;
    height: inherit;
}

:deep(.vaulticTableContainer__sortIcon) {
    transition: 0.3s;
    font-size: clamp(12px, 0.8vw, 16px);
}

:deep(.vaulticTableContainer__column--no-sort) {
    opacity: 0;
}

:deep(.vaulticTableContainer__column):hover .vaulticTableContainer__column--no-sort {
    opacity: 0.7;
}

:deep(.vaulticTableContainer__column--sort-rotate) {
    transform: rotate(180deg);
}

:deep(.vaulticTableContainer__cellWrapper) {
    width: 100%;
    height: 100%;
}

:deep(.vaulticTableContainer__cellWrapper--clickable) {
    cursor: pointer;
}

:deep(.vaulticTableContainer__cell) {
    width: 100%;
    height: 100%;
    padding: clamp(5px, 0.6vw, 12px) clamp(5px, 0.6vw, 16px) !important;
    display: flex;
    align-items: center;
}

:deep(.vaulticTableContainer__dataTableRow) {
    /* height: clamp(40px, 3.5vw, 100px); */
    background: transparent;
    /* opacity: 0;
    animation: fadeIn 1s linear forwards; */
}

:deep(.vaulticTableContainer__dataTableTableContainer::-webkit-scrollbar) {
    width: clamp(5px, 0.5vw, 10px);
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

:deep(.vaulticTableContainer__emptyMessage) {
    background: transparent !important;
    opacity: 0;
    animation: fadeIn 1s linear forwards;
}

:deep(.vaulticTableContainer__emptyMessageCell) {
    text-align: center;
    color: #c1c1c1;
    font-size: clamp(12px, 0.8vw, 24px);
    text-wrap: wrap !important;
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
    transform: rotate(134deg);
}

.vaulticTableContainer__rowIconButton .magnet.isPinned {
    color: v-bind(primaryColor);
    transform: rotate(134deg);
}

.vaulticTableContainer__rowIconButton:hover .magnet {
    color: v-bind(primaryColor);
    transform: rotate(134deg) scale(1.05);
}

:deep(.vaulticTableContainer__paginatorContainer) {
    /* transform: translateY(-100%); */
    background: transparent;
    border-bottom-left-radius: 20px;
    width: calc(100% - clamp(7px, 0.7vw, 10px));
    height: clamp(40px, 5vh, 60px);
}

:deep(.vaulticTableContainer__paginator) {
    border-bottom-left-radius: 20px;
    background: #181822 !important;
    height: 100%;
    padding: clamp(4px, 0.4vw, 8px) clamp(8px, 0.8vw, 16px) !important;
}

:deep(.vaulticTableContainer__paginatorContent) {
    height: 100%;
}

:deep(.vaulticTableContainer__paginatorNavigationButton) {
    height: 90%;
    min-width: unset !important;
    aspect-ratio: 1 / 1;
}

:deep(.vaulticTableContainer__paginatorPages) {
    height: 100%;
}

:deep(.vaulticTableContainer__pageIcon:focus-visible),
:deep(.vaulticTableContainer__paginatorNavigationButton:focus-visible) {
    outline: 1px solid v-bind(primaryColor);
}

:deep(.vaulticTableContainer__pageIcon) {
    min-width: unset !important;
    aspect-ratio: 1 / 1;
    height: 90% !important;
    font-size: clamp(10px, 1vw, 15px) !important;
}

:deep(.vaulticTableContainer__paginatorNavigationIcon) {
    height: 50%;
    width: unset !important;
    aspect-ratio: 1 / 1;
}

:deep(.vaulticTableContainer__pageIcon.p-paginator-page-selected){
    background: color-mix(in srgb, v-bind(primaryColor), transparent 84%)
}

:deep(.vaulticTableContainer__pageCountSelect) {
    background: v-bind(backgroundColor) !important;
    justify-content: space-evenly;
    height: 90%;
    display: flex !important;
    align-items: center;
    column-gap: 5px;
}

:deep(.vaulticTableContainer__pageCountSelect.p-focus) {
    border-color: v-bind(primaryColor) !important;
}

:deep(.vaulticTableContainer__pageCountSelectLabel) {
    height: 100%;
    font-size: clamp(10px, 1vw, 16px);
    display: flex !important;
    align-items: center;
    text-align: center;
    padding: 0 clamp(6px, 0.6vw, 12px) !important;
}

:deep(.vaulticTableContainer__pageCountSelectDropdown) {
    width: clamp(25px, 1.5vw, 40px) !important;
}

.vaulticTableContainer__groupIconCell {
    display: flex;
    height: inherit;
    justify-content: left;
    align-items: center;
    overflow: hidden;
    flex-wrap: wrap;
    width: auto;
}

.vaulticTableContainer__groupIconContainer {
    width: clamp(20px, 1.4vw, 40px);
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: 0.5s;
    /* background: v-bind('groupModel.color'); */
    /* box-shadow: 0 0 5px v-bind('groupModel.color'); */
    margin: 2px;
    will-change: transform;
}

.vaulticTableContainer__groupIconSpan {
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
    font-size: clamp(10px, 0.7vw, 16px);
}

.vaulticTableContainer__groupIcon {
    font-size: clamp(13px, 1vw, 20px) !important;
}
</style>
