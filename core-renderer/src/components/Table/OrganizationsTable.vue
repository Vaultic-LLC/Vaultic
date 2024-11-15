<template>
    <div class="organizationsTableContainer">
        <TableTemplate  id="organizationsTable" ref="tableRef" :rowGap="0"
            class="shadow scrollbar" :color="color" :headerModels="organizationHeaders" :scrollbar-size="1"
            :emptyMessage="emptyTableMessage" :showEmptyMessage="tableRowModels.visualValues.length == 0"
            :headerTabs="headerTabs" @scrolledToBottom="tableRowModels.loadNextChunk()">
            <template #headerControls>
                <SearchBar v-model="organizationSearchText" :color="color" :labelBackground="'rgb(44 44 51 / 16%)'"
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
import { createSortableHeaderModels, getEmptyTableMessage } from '../../Helpers/ModelHelper';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { HeaderDisplayField } from '../../Types/Fields';
import { api } from '../../API';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Organization } from '../../Types/DataTypes';

export default defineComponent({
    name: "OrganizationsTable",
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
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.filtersColor.value);

        const organizations: SortedCollection<Organization> = new SortedCollection([], "name");
        const pinnedOrganizations: SortedCollection<Organization> = new SortedCollection(app.organizations.pinnedOrganizations, "name");

        let tableRowModels: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection<TableRowData>());

        const organizationSearchText: Ref<string> = ref('');
        const emptyTableMessage: ComputedRef<string> = computed(() =>
        {
            if (app.organizations.failedToRetrieveOrganizations)
            {
                return "Unable to retrieve organizations at this moment. Please try again or contact support if the issue persists";
            }

            return getEmptyTableMessage("Organizations");
        });

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Organizations',
                active: computed(() => true),
                color: computed(() => app.userPreferences.currentColorPalette.filtersColor.value),
                onClick: () => { }
            }
        ];

        const organizationActiveHeader: Ref<number> = ref(0);
        const organizationHeaderDisplayFields: HeaderDisplayField[] = [
            {
                displayName: "Name",
                backingProperty: "name",
                width: 'clamp(75px, 5vw, 150px)',
                clickable: true,
                padding: 'clamp(5px, 0.5vw, 12px)',
            }
        ];

        const organizationHeaders: SortableHeaderModel[] = createSortableHeaderModels<Organization>(organizationActiveHeader, organizationHeaderDisplayFields,
            organizations, pinnedOrganizations, setTableRows);

        organizationHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()])

        async function setTableRows()
        {
            const pendingRows = organizations.calculatedValues.map(async (o) =>
            {
                o.id = await api.utilities.generator.uniqueId();
                const values: TextTableRowValue[] = [
                    { component: "TableRowTextValue", value: o.value.name.value, copiable: false, width: 'clamp(75px, 8vw, 180px)', margin: true },
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
                            app.organizations.deleteOrganization(key, o.value.organizationID.value);
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

        watch(() => organizationSearchText.value, (newValue) =>
        {
            organizations.search(newValue);
            setTableRows();
            setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
        });

        return {
            tableRef,
            activeTable,
            color,
            organizationHeaders,
            tableRowModels,
            organizationSearchText,
            headerTabs,
            emptyTableMessage,
        }
    }
})
</script>

<style>
#organizationsTable {
    height: 43%;
    width: 24%;
    min-width: 285px;
    left: 11%;
    top: max(252px, 42%);
}

@media (max-width: 1300px) {
    #organizationsTable {
        left: max(11px, 1%);
    }
}
</style>
