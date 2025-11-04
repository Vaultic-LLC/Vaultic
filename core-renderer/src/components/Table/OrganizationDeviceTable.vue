<template>
    <div class="organizationDevicesTableContainer">
        <VaulticTable ref="tableRef" id="organizationDevicesTable" :color="color" :columns="tableColumns" 
            :headerTabs="headerTabs" :dataSources="tableDataSources" :emptyMessage="emptyTableMessage" 
            :allowPinning="!devicesAreSelected && !readOnly" :searchBarSizeModel="searchBarSizeModel"
            :onPin="onPinOrganization" :onEdit="devicesAreSelected ? onEditDevice : onEditOrganization" 
            :onDelete="onDelete">
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

import { ComponentSizeModel, HeaderTabModel, TableColumnModel, TableDataSources, TableRowModel } from '../../Types/Models';
import { getEmptyTableMessage } from '../../Helpers/ModelHelper';
import app from "../../Objects/Stores/AppStore";
import { TableTemplateComponent } from '../../Types/Components';
import { ClientDevice } from '@vaultic/shared/Types/Device';
import { SortedCollection, VaultListSortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Organization } from '@vaultic/shared/Types/DataTypes';
import { DataType } from '../../Types/DataTypes';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

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
        const readOnly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);

        const devices: SortedCollection = new SortedCollection([], () => app.devices.devicesByID, "Name");
        
        const organizations: VaultListSortedCollection = new VaultListSortedCollection([], () => app.organizations.organizationsByID, "name");
        const pinnedOrganizations: VaultListSortedCollection = new VaultListSortedCollection([], () => app.organizations.organizationsByID, "name");
            
        const devicesAreSelected: ComputedRef<boolean> = computed(() => app.activeDeviceOrganizationsTable == DataType.Devices);
        const showAdd: ComputedRef<boolean> = computed(() => app.isOnline && (!devicesAreSelected.value || (devicesAreSelected.value && !app.devices.hasRegisteredCurrentDevice)));

        let doDeleteValue: ((key: string) => Promise<any>) | undefined;

        const emptyTableMessage: ComputedRef<string> = computed(() =>
        {
            if (devicesAreSelected.value)
            {
                if (!app.isOnline)
                {
                    return "Please log in to Online Mode to view and edit your Organizations";
                }

                if (app.devices.failedToGetDevices)
                {
                    return "Unable to retrieve Registered Devices at this moment. Please try again or contact support if the issue persists";
                }

                return "You currently don't have any Registered Devices. Click '+' to register this device";
            }
            else 
            {
                if (!app.isOnline)
                {
                    return "Please log in to Online Mode to view and edit your Registered Devices";
                }

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
                color: computed(() => app.userPreferences.currentColorPalette.p.p),
                onClick: () => 
                {
                    app.activeDeviceOrganizationsTable = DataType.Devices;
                }
            },
            {
                name: 'Organizations',
                active: computed(() => !devicesAreSelected.value),
                color: computed(() => app.userPreferences.currentColorPalette.v.p),
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
                models.push(new TableColumnModel("Name", "Name").setIsFielded(false));
                models.push(new TableColumnModel("Type", "type").setIsFielded(false));
                models.push(new TableColumnModel("Model", "Model").setIsFielded(false));
                models.push(new TableColumnModel("Version", "Version").setIsFielded(false));
            }
            else 
            {
                models.push(new TableColumnModel("Name", "name").setIsFielded(false));
                models.push(new TableColumnModel("Vaults", "vaultIDsByVaultID").setComponent("VaultListCell").setIsFielded(false));
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

        const searchBarSizeModel: Ref<ComponentSizeModel> = ref({
            width: '9vw',
            minWidth: '110px',
        });

        async function setTableRows(mounting: boolean)
        {
            if (mounting || app.activeDeviceOrganizationsTable == DataType.Devices)
            {
                const deviceRows: TableRowModel[] = [];
                app.devices.devicesByID.forEach((v, k, map) =>
                {
                    deviceRows.push(new TableRowModel(k));
                });
    
                devices.updateValues(deviceRows);
            }

            if (mounting || app.activeDeviceOrganizationsTable == DataType.Organizations)
            {
                const newOrganizationModels: TableRowModel[] = [];
                const newPinnedOrganizationModels: TableRowModel[] = [];

                app.organizations.organizationsByID.forEach((v, k, map) =>
                {
                    if (OH.has(app.userPreferences.pinnedOrganizations, k.toString()))
                    {
                        newPinnedOrganizationModels.push(new TableRowModel(k, true));
                    }
                    else
                    {
                        newOrganizationModels.push(new TableRowModel(k));
                    }
                });
    
                organizations.updateValues(newOrganizationModels);
                pinnedOrganizations.updateValues(newPinnedOrganizationModels);
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

        function onRegisterDevice()
        {
            app.popups.showDevicePopup();
        }

        function onEditDevice(device: ClientDevice)
        {
            app.popups.showDevicePopup(device);
        }

        function onDelete(obj: ClientDevice | Organization)
        {
            if (devicesAreSelected.value)
            {
                doDeleteValue = async (key: string) =>
                {
                    if (await app.runAsAsyncProcess(() => app.devices.deleteDevice((obj as ClientDevice).id)))
                    {
                        app.popups.showToast("Device Unregistered", true);
                    }
                    else
                    {
                        app.popups.showToast("Unregister Failed", false);
                    }
                };
            }
            else
            {
                doDeleteValue = async (key: string) =>
                {
                    app.popups.showLoadingIndicator(app.userPreferences.currentPrimaryColor.value, "Deleting Organization");
                    if (await app.runAsAsyncProcess(() => app.organizations.deleteOrganization((obj as Organization).organizationID)))
                    {
                        app.popups.showToast("Organization Deleted", true);
                    }
                    else
                    {
                        app.popups.showToast("Delete Failed", false);
                    }

                    app.popups.hideLoadingIndicator();
                };
            }

            app.popups.showRequestAuthentication(color.value, doDeleteValue, () => { }, true);
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
            searchBarSizeModel,
            readOnly,
            onAdd,
            onEditDevice,
            onPinOrganization,
            onEditOrganization,
            onDelete
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
