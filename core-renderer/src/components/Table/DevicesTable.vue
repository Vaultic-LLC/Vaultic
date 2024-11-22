<template>
    <div class="devicesTableContainer">
        <TableTemplate  id="devicesTable" ref="tableRef" :rowGap="0"
            class="shadow scrollbar" :color="color" :headerModels="deviceHeaders" :scrollbar-size="1"
            :emptyMessage="emptyTableMessage" :showEmptyMessage="tableRowModels.visualValues.length == 0"
            :headerTabs="headerTabs" @scrolledToBottom="tableRowModels.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="deviceSearchText" :color="color" :labelBackground="'rgb(44 44 51 / 16%)'"
                    :width="'10vw'" :maxWidth="'250px'" :minWidth="'130px'" :minHeight="'27px'" />
                <Transition name="fade" mode="out-in">
                </Transition>
            </template>
            <template #body>
                <TableRow v-for="(trd, index) in tableRowModels.visualValues" class="hover" :key="trd.id"
                    :rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false" :color="color" />
            </template>
        </TableTemplate>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import TableTemplate from './TableTemplate.vue';
import SearchBar from './Controls/SearchBar.vue';
import TableRow from './Rows/TableRow.vue';

import { HeaderTabModel, SortableHeaderModel, TableRowData, TextTableRowValue, emptyHeader } from '../../Types/Models';
import { createSortableHeaderModels } from '../../Helpers/ModelHelper';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { HeaderDisplayField } from '../../Types/Fields';
import { ClientDevice } from '@vaultic/shared/Types/Device';
import { api } from '../../API';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';

export default defineComponent({
    name: "DevicesTable",
    components:
    {
        TableTemplate,
        SearchBar,
        TableRow
    },
    setup()
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const activeTable: Ref<number> = ref(app.activePasswordValuesTable);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const devices: SortedCollection<ClientDevice> = new SortedCollection([], "Name");
        const pinnedDevices: SortedCollection<ClientDevice> = new SortedCollection(app.devices.pinnedDevices, "Name");

        let tableRowModels: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection<TableRowData>());

        const deviceSearchText: Ref<string> = ref('');
        const emptyTableMessage: ComputedRef<string> = computed(() =>
        {
            if (app.devices.failedToGetDevices)
            {
                return "Unable to retrieve devices at this moment. Please try again or contact support if the issue persists";
            }

            return "You currently don't have any registered devices. Click '+' to register this device";
        });

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Devices',
                active: computed(() => true),
                color: computed(() => app.userPreferences.currentPrimaryColor.value),
                onClick: () => { }
            }
        ];

        const deviceActiveHeader: Ref<number> = ref(0);
        const deviceHeaderDisplayFields: HeaderDisplayField[] = [
            {
                displayName: "Name",
                backingProperty: "Name",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true,
                padding: 'clamp(5px, 0.5vw, 12px)',
            },
            {
                displayName: "Type",
                backingProperty: "Type",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true,
            },
            {
                displayName: "Model",
                backingProperty: "Model",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true
            },
            {
                displayName: "Version",
                backingProperty: "Version",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true
            }
        ];

        const deviceHeaders: SortableHeaderModel[] = createSortableHeaderModels<ClientDevice>(deviceActiveHeader, deviceHeaderDisplayFields,
            devices, pinnedDevices, setTableRows);

        deviceHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()])

        async function setTableRows()
        {
            const pendingRows = devices.calculatedValues.map(async (d) =>
            {
                d.id = await api.utilities.generator.uniqueId();
                const values: TextTableRowValue[] = [
                    { component: "TableRowTextValue", value: d.value.Name, copiable: false, width: 'clamp(75px, 8vw, 180px)', margin: true },
                    { component: "TableRowTextValue", value: d.value.Type, copiable: false, width: 'clamp(75px, 8vw, 180px)' },
                    { component: "TableRowTextValue", value: d.value.Model, copiable: false, width: 'clamp(75px, 8vw, 180px)' },
                    { component: "TableRowTextValue", value: d.value.Version, copiable: false, width: 'clamp(75px, 8vw, 180px)' }
                ]

                const id = await api.utilities.generator.uniqueId();
                let tableRow: TableRowData =
                {
                    id: id,
                    values: values,
                    onDelete: function ()
                    {
                        app.popups.showRequestAuthentication(color.value, (key: string) =>
                        {
                            app.devices.deleteDevice(key, d.value.id.value);
                        }, () => { });
                    }
                }

                return tableRow;
            });

            Promise.all(pendingRows).then((rows) =>
            {
                tableRowModels.value.setValues(rows);
                setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);

                if (tableRef.value)
                {
                    // @ts-ignore
                    tableRef.value.scrollToTop();
                }
            });
        }

        watch(() => deviceSearchText.value, (newValue) =>
        {
            devices.search(newValue);
            setTableRows();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        return {
            tableRef,
            activeTable,
            color,
            deviceHeaders,
            tableRowModels,
            deviceSearchText,
            headerTabs,
            emptyTableMessage,
        }
    }
})
</script>

<style>
#devicesTable {
    height: 55%;
    width: 43%;
    min-width: 547px;
    left: 38%;
    top: max(252px, 42%);
}

@media (max-width: 1300px) {
    #devicesTable {
        left: max(324px, 28.5%);
    }
}
</style>
