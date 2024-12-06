<template>
    <div class="organizationDevicesTableContainer">
        <VaulticTable ref="tableRef" id="organizationDevicesTable" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyTableMessage"
            :onPin="onPin" :onEdit="activeTab == 1 ? onEditOrganization : undefined" :onDelete="activeTab == 1 ? onDeleteOrganization : undefined">
            <template #tableControls>
                <AddButton :color="color" @click="onAddOrganization" />
            </template>
        </VaulticTable>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, reactive, ref } from 'vue';

import VaulticTable from './VaulticTable.vue';
import AddButton from './Controls/AddButton.vue';

import { HeaderTabModel, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { ClientDevice } from '@vaultic/shared/Types/Device';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Organization } from '../../Types/DataTypes';
import { Field } from '@vaultic/shared/Types/Fields';

export default defineComponent({
    name: "OrganizationDeviceTable",
    components:
    {
        VaulticTable,
        AddButton
    },
    setup()
    {
        const tableRef: Ref<TableTemplateComponent | null> = ref(null);
        const color: ComputedRef<string> = computed(() => activeTab.value == 0 ? app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value :
            app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value);

        const devices: SortedCollection = new SortedCollection([]);
        const pinnedDevices: SortedCollection = new SortedCollection([]);

        const organizations: SortedCollection = new SortedCollection([]);
        const pinnedOrganizations: SortedCollection = new SortedCollection([]);

        const activeTab: Ref<number> = ref(0);

        const emptyTableMessage: ComputedRef<string> = computed(() =>
        {
            if (activeTab.value == 0)
            {
                if (app.devices.failedToGetDevices)
                {
                    return "Unable to retrieve devices at this moment. Please try again or contact support if the issue persists";
                }

                return getEmptyTableMessage("Registered Devices")
            }
            else 
            {
                return getEmptyTableMessage("Organizations")
            }
        });

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Devices',
                active: computed(() => activeTab.value == 0),
                color: computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value),
                onClick: () => activeTab.value = 0
            },
            {
                name: 'Organizations',
                active: computed(() => activeTab.value == 1),
                color: computed(() => app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value),
                onClick: () => activeTab.value = 1
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            if (activeTab.value == 0)
            {
                models.push({ header: "Name", field: "name"});
                models.push({ header: "Type", field: "type" });
                models.push({ header: "Model", field: "model" });
                models.push({ header: "Version", field: "version" });
            }
            else 
            {
                models.push({ header: "Name", field: "name" });
            }

            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => activeTab.value,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Device",
                    collection: devices,
                    pinnedCollection: pinnedDevices
                },
                {
                    friendlyDataTypeName: "Organization",
                    collection: organizations,
                    pinnedCollection: pinnedOrganizations
                }
            ]
        });

        async function setTableRows()
        {
            const deviceRows = app.devices.devices.map((d) =>
            {
                const row: TableRowModel = 
                {
                    id: d.value.id.value,
                    backingObject: d,
                };

                return row;
            });

            const pinnedDeviceRows = app.devices.pinnedDevices.map((d) => 
            {
                const row: TableRowModel = 
                {
                    id: d.value.id.value,
                    backingObject: d,
                };

                return row;
            });

            devices.updateValues(deviceRows);
            pinnedDevices.updateValues(pinnedDeviceRows)

            const organizationRows = app.organizations.organizations.value.map(o => 
            {
                const row: TableRowModel = 
                {
                    id: o.value.id.value,
                    backingObject: o,
                };

                return row;
            });

            const pinnedOrganizationRows = app.organizations.pinnedOrganizations.map(o => 
            {
                const row: TableRowModel = 
                {
                    id: o.value.id.value,
                    backingObject: o,
                };

                return row;
            });

            organizations.updateValues(organizationRows);
            pinnedOrganizations.updateValues(pinnedOrganizationRows);
        }

        function onPin(value: Field<any>)
        {
            if (activeTab.value == 0)
            {
                onPinDevice(value);
            }
            else 
            {
                onPinOrganization(value);
            }
        }

        function onPinDevice(device: Field<ClientDevice>)
        {

        }

        function onPinOrganization(org: Field<Organization>)
        {

        }

        function onAddOrganization()
        {
            app.popups.showOrganizationPopup(() => {});
        }

        function onEditOrganization(organization: Field<Organization>)
        {
            
        }

        function onDeleteOrganization(organization: Field<Organization>)
        {
            
        }

        onMounted(setTableRows);

        return {
            activeTab,
            tableRef,
            color,
            tableColumns,
            headerTabs,
            emptyTableMessage,
            tableDataSources,
            onPin,
            onAddOrganization,
            onEditOrganization,
            onDeleteOrganization
        }
    }
})
</script>

<style>
#organizationDevicesTable {
    height: 50.5%;
    width: 43%;
    min-width: 547px;
    left: 38%;
    top: max(252px, 42%);
}

@media (max-width: 1300px) {
    #organizationDevicesTable {
        left: max(324px, 28.5%);
    }
}
</style>
