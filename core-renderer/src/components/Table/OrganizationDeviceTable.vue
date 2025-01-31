<template>
    <div class="organizationDevicesTableContainer">
        <VaulticTable ref="tableRef" id="organizationDevicesTable" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyTableMessage" :allowPinning="!devicesAreSelected"
            :onPin="devicesAreSelected ? undefined : onPin" :onEdit="devicesAreSelected ? onEditDevice : onEditOrganization" 
            :onDelete="devicesAreSelected ? onDeleteDevice : onDeleteOrganization">
            <template #tableControls>
                <AddButton v-if="showAdd" :color="color" @click="onAdd" />
            </template>
        </VaulticTable>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Reactive, Ref, computed, defineComponent, onMounted, reactive, ref, watch } from 'vue';

import VaulticTable from './VaulticTable.vue';
import AddButton from './Controls/AddButton.vue';

import { HeaderTabModel, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { ClientDevice } from '@vaultic/shared/Types/Device';
import { SortedCollection, VaultListSortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Organization } from '@vaultic/shared/Types/DataTypes';
import { DataType } from '../../Types/DataTypes';

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
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const devices: SortedCollection = new SortedCollection([]);
        const pinnedDevices: SortedCollection = new SortedCollection([]);
        
        const organizations: VaultListSortedCollection = new VaultListSortedCollection([]);
        const pinnedOrganizations: VaultListSortedCollection = new VaultListSortedCollection([]);
            
        const devicesAreSelected: ComputedRef<boolean> = computed(() => app.activeDeviceOrganizationsTable == DataType.Devices);
        const showAdd: ComputedRef<boolean> = computed(() => !devicesAreSelected.value || (devicesAreSelected.value && !app.devices.hasRegisteredCurrentDevice));

        const emptyTableMessage: ComputedRef<string> = computed(() =>
        {
            if (devicesAreSelected.value)
            {
                if (app.devices.failedToGetDevices)
                {
                    return "Unable to retrieve Registered Devices at this moment. Please try again or contact support if the issue persists";
                }

                return "You currently don't have any Registered Devices. Click '+' to register this device";
            }
            else 
            {
                if (app.organizations.failedToRetrieveOrganizations)
                {
                    return "Unable to retrieve Organizations at this moment. Please try again or contact support if the issue persists";
                }

                return getEmptyTableMessage("Organizations")
            }
        });

        const headerTabs: HeaderTabModel[] = [
            {
                name: 'Registered Devices',
                active: devicesAreSelected,
                color: computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value),
                onClick: () => 
                {
                    app.activeDeviceOrganizationsTable = DataType.Devices;
                }
            },
            {
                name: 'Organizations',
                active: computed(() => !devicesAreSelected.value),
                color: computed(() => app.userPreferences.currentColorPalette.valuesColor.value.primaryColor.value),
                onClick: () => 
                {
                    app.activeDeviceOrganizationsTable = DataType.Organizations;
                }
            }
        ];

        const tableColumns: ComputedRef<TableColumnModel[]> = computed(() => 
        {
            const models: TableColumnModel[] = []
            if (devicesAreSelected.value)
            {
                models.push({ header: "Name", field: "Name", isFielded: false });
                models.push({ header: "Type", field: "type", isFielded: false });
                models.push({ header: "Model", field: "Model", isFielded: false });
                models.push({ header: "Version", field: "Version", isFielded: false });
            }
            else 
            {
                models.push({ header: "Name", field: "name", isFielded: false });
                models.push({ header: "Vaults", field: "vaultIDsByVaultID", component: "VaultListCell", isFielded: false});
            }

            return models;
        });

        const tableDataSources: Reactive<TableDataSources> = reactive(
        {
            activeIndex: () => app.activeDeviceOrganizationsTable == DataType.Devices ? 0 : 1,
            dataSources: 
            [
                {
                    friendlyDataTypeName: "Device",
                    collection: devices
                },
                {
                    friendlyDataTypeName: "Organization",
                    collection: organizations,
                    pinnedCollection: pinnedOrganizations
                }
            ]
        });

        async function setTableRows(mounting: boolean)
        {
            if (mounting || app.activeDeviceOrganizationsTable == DataType.Devices)
            {
                const deviceRows = app.devices.devices.map((d) =>
                {
                    return new TableRowModel(d.id, (obj: ClientDevice) => obj.id, undefined, false, undefined, d);
                });
    
                // const pinnedDeviceRows = app.devices.pinnedDevices.map((d) => 
                // {
                //     return new TableRowModel(d.id, (obj: ClientDevice) => obj.id, undefined, true, undefined, d);
                // });
    
                devices.updateValues(deviceRows);
                // pinnedDevices.updateValues(pinnedDeviceRows)             
            }

            if (mounting || app.activeDeviceOrganizationsTable == DataType.Organizations)
            {
                const organizationRows = app.organizations.organizations.value.map(o => 
                {
                    return new TableRowModel(o.organizationID.toString(), (obj: Organization) => obj.organizationID, undefined, false, undefined, o);
                });
    
                const pinnedOrganizationRows = app.organizations.pinnedOrganizations.map(o => 
                {
                    return new TableRowModel(o.organizationID.toString(), (obj: Organization) => obj.organizationID, undefined, true, undefined, o);
                });
    
                organizations.updateValues(organizationRows);
                pinnedOrganizations.updateValues(pinnedOrganizationRows);
            }
        }

        function onPin(isPinned: boolean, value: any)
        {
            if (app.activeDeviceOrganizationsTable == DataType.Devices)
            {
                onPinDevice(isPinned, value);
            }
            else 
            {
                onPinOrganization(isPinned, value);
            }
        }

        function onAdd()
        {
            if (devicesAreSelected.value)
            {
                onRegisterDevice();
            }
            else
            {
                onAddOrganization();
            }
        }

        function onPinDevice(isPinned: boolean, device: ClientDevice)
        {

        }

        function onRegisterDevice()
        {
            app.popups.showDevicePopup();
        }

        function onEditDevice(device: ClientDevice)
        {
            app.popups.showDevicePopup(device);
        }

        function onDeleteDevice(device: ClientDevice)
        {
            app.devices.deleteDevice(device.id);
        }

        function onPinOrganization(isPinned: boolean, org: Organization)
        {
            if (isPinned)
            {
                app.userPreferences.removePinnedOrganization(org.organizationID);
            }
            else 
            {
                app.userPreferences.addPinnedOrganization(org.organizationID);
            }
        }

        function onAddOrganization()
        {
            app.popups.showOrganizationPopup(() => {});
        }

        function onEditOrganization(organization: Organization)
        {
            app.popups.showOrganizationPopup(() => {}, organization);
        }

        async function onDeleteOrganization(organization: Organization)
        {
            app.popups.showLoadingIndicator(app.userPreferences.currentPrimaryColor.value, "Deleting Organization");
            if (await app.organizations.deleteOrganization(organization.organizationID))
            {
                app.popups.showToast(app.userPreferences.currentPrimaryColor.value, "Organization Deleted", true);
            }
            else
            {
                app.popups.showToast(app.userPreferences.currentPrimaryColor.value, "Delete Failed", false);
            }

            app.popups.hideLoadingIndicator();
        }

        watch(() => app.devices.devices.length, (_, __) => 
        {
            setTableRows(false);
        });

        watch(() => app.organizations.organizations.value.length, (_, __) => 
        {
            setTableRows(false);
        });

        watch(() => app.activeDeviceOrganizationsTable, () => 
        {
            setTableRows(false);
        });

        onMounted(() => 
        {
            setTableRows(true);
        });

        return {
            devicesAreSelected,
            tableRef,
            color,
            tableColumns,
            headerTabs,
            emptyTableMessage,
            tableDataSources,
            showAdd,
            onPin,
            onAdd,
            onEditDevice,
            onDeleteDevice,
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
</style>
