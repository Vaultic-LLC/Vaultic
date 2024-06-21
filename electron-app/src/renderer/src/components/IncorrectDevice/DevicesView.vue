<template>
	<div class="deviceView">
		<div class="deviceView__deviceUpdateInfo" v-if="hasDesktopDeviceUpdates">
			<div class="deviceView__deviceUpdatesLeft">
				<label class="deviceView__deviceUpdatesLeftTitle">Automatic Device Updates Left</label>
				<div class="deviceView__desktopDeviceUpdatesLeft" v-if="hasDesktopDeviceUpdates">
					Desktop: {{ responseObj?.DesktopDeviceUpdatesLeft }}
				</div>
				<!-- <div class="deviceView__mobileDeviceUpdatesLeft" v-if="responseObj?.MobileDeviceUpdatesLeft">
					Mobile: {{ responseObj?.MobileDeviceUpdatesLeft }}
				</div> -->
			</div>
			<ToolTip :color="color" :size="'clamp(18px, 2vw, 30px)'" :message="`Devices are automatically registered if you have an open device spot on your account.
				Deleting a device uses up 1 automatic update. Once you run out of automatic updates, you'll have to pay for any
				additional updates or reach out to customer service.`" />
		</div>
		<div class="deviceTable">
			<TableTemplate ref="tableRef" id="devicesTable" :rowGap="0" class="border scrollbar" :color="color"
				:headerModels="headers" :border="true" :scrollbar-size="1" :emptyMessage="''" :showEmptyMessage="false"
				:headerTabs="headerTabs" @scrolledToBottom="tableRows.loadNextChunk()">
				<template #body>
					<TableRow class="shadow hover" v-for="(row, index) in tableRows.visualValues" :key="row.id"
						:rowNumber="index" :model="row" :preventDeselect="false" :color="color" :allowPin="false"
						:allowEdit="false" :allowDelete="true" />
				</template>
			</TableTemplate>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import TableRow from '../Table/Rows/TableRow.vue';
import ToolTip from '../ToolTip.vue';

import { Device, IncorrectDeviceResponse } from '@renderer/Types/SharedTypes';
import { ButtonModel, HeaderTabModel, SortableHeaderModel, TableRowData, TextTableRowValue } from '@renderer/Types/Models';
import { createSortableHeaderModels } from '@renderer/Helpers/ModelHelper';
import { SortedCollection } from '@renderer/Objects/DataStructures/SortedCollections';
import { HeaderDisplayField } from '@renderer/Types/EncryptedData';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';
import { stores } from '@renderer/Objects/Stores';
import { defaultHandleFailedResponse } from '@renderer/Helpers/ResponseHelper';
import { TableTemplateComponent } from '@renderer/Types/Components';

export default defineComponent({
	name: "DevicesView",
	components:
	{
		TableTemplate,
		TableHeaderRow,
		TableRow,
		ToolTip
	},
	emits: ['onSave', 'onClose'],
	props: ['response', 'color'],
	setup(props)
	{
		const tableRef: Ref<TableTemplateComponent | null> = ref(null);
		const responseObj: Ref<IncorrectDeviceResponse> = ref(props.response);
		const devices: ComputedRef<SortedCollection<Device>> = computed(() => new SortedCollection([], "Name"));
		const activeHeader: Ref<number> = ref(0);
		const tableRows: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection<TableRowData>());

		const hasDesktopDeviceUpdates: ComputedRef<boolean> = computed(() => responseObj.value?.DesktopDeviceUpdatesLeft != undefined);

		const headerDisplayFields: HeaderDisplayField[] = [
			{
				displayName: "Name",
				backingProperty: "Name",
				width: 'clamp(75px, 8vw, 180px)',
				clickable: true,
				padding: '10px'
			},
			{
				displayName: "Type",
				backingProperty: "Type",
				width: 'clamp(75px, 8vw, 180px)',
				clickable: true
			},
			{
				displayName: "Model",
				backingProperty: "Model",
				width: 'clamp(75px, 8vw, 180px)',
				clickable: true
			},
			{
				displayName: "Version",
				backingProperty: "Version",
				width: 'clamp(75px, 8vw, 180px)',
				clickable: true
			}];

		const headerTabs: HeaderTabModel[] = [
			{
				name: 'Devices',
				active: computed(() => true),
				color: computed(() => props.color),
				onClick: () => { }
			}
		];

		const headers: SortableHeaderModel[] = createSortableHeaderModels<Device>(activeHeader, headerDisplayFields,
			devices.value, undefined, setTableRows);

		async function setTableRows()
		{
			const pendingRows = devices.value.calculatedValues.map(async (d) =>
			{
				d.id = await window.api.utilities.generator.uniqueId();
				const values: TextTableRowValue[] = [
					{ component: "TableRowTextValue", value: d.Name, copiable: false, width: 'clamp(75px, 8vw, 180px)', margin: true },
					{ component: "TableRowTextValue", value: d.Type, copiable: false, width: 'clamp(75px, 8vw, 180px)' },
					{ component: "TableRowTextValue", value: d.Model, copiable: false, width: 'clamp(75px, 8vw, 180px)' },
					{ component: "TableRowTextValue", value: d.Version, copiable: false, width: 'clamp(75px, 8vw, 180px)' }
				]

				const id = await window.api.utilities.generator.uniqueId();
				let tableRow: TableRowData =
				{
					id: id,
					values: values,
					onDelete: function ()
					{
						stores.popupStore.showRequestAuthentication(props.color, (key: string) =>
						{
							doDelete(key, d);
						}, () => { });
					}
				}

				return tableRow;
			});

			Promise.all(pendingRows).then((rows) =>
			{
				tableRows.value.setValues(rows);
				setTimeout(() => tableRef.value?.calcScrollbarColor(), 1);
			});
		}

		async function doDelete(masterKey: string, device: Device)
		{
			stores.popupStore.showLoadingIndicator(props.color, "Deleting Device");
			const response = await window.api.server.user.deleteDevice(masterKey, device.UserDesktopDeviceID, device.UserMobileDeviceID);

			stores.popupStore.hideLoadingIndicator();
			if (response.Success)
			{
				if (response.Url)
				{
					const purchaseButtonModel: ButtonModel = { text: "Purchase", onClick: () => { window.open(response.Url); } }
					const cancelButtonModel: ButtonModel = { text: "Cancel", onClick: () => { } };
					stores.popupStore.showAlert("Unable to delete device",
						"You do not have any more automatic device updates left. Please purchase more in order to remove this device",
						false, purchaseButtonModel, cancelButtonModel);

					return;
				}

				if (responseObj.value.DesktopDeviceUpdatesLeft)
				{
					responseObj.value.DesktopDeviceUpdatesLeft -= 1;
				}

				devices.value.remove(device.id);
				setTableRows();

				stores.popupStore.showToast(props.color, "Deleted Device", true);
			}
			else
			{
				defaultHandleFailedResponse(response);
			}
		}

		function setDeviceType(devices: Device[] | undefined, desktop: boolean): Device[]
		{
			if (!devices)
			{
				return [];
			}

			return devices.map((d) =>
			{
				d.Type = desktop ? "Desktop" : "Mobile"
				return d;
			});
		}

		onMounted(async () =>
		{
			if (!responseObj.value)
			{
				const response = await window.api.server.user.getDevices();
				if (response.Success)
				{
					responseObj.value = response;

					const d: Device[] = [...setDeviceType(responseObj.value.DesktopDevices!, true),
					...setDeviceType(responseObj.value.MobileDevices!, false)];

					devices.value.updateValues(d);
				}
				else
				{
					// shouldn't ever be able to hit another incorrect device response here
					defaultHandleFailedResponse(response);
				}
			}
			else
			{
				const d: Device[] = [...setDeviceType(responseObj.value.DesktopDevices!, true),
				...setDeviceType(responseObj.value.MobileDevices!, false)];

				devices.value.updateValues(d);
			}

			setTableRows();
		});

		return {
			tableRef,
			devices,
			headers,
			tableRows,
			responseObj,
			headerTabs,
			hasDesktopDeviceUpdates
		}
	}
})
</script>

<style>
.deviceView {
	width: 80%;
	height: 100%;
	min-height: 340px;
	margin: auto;
	position: relative;
}

.deviceView__deviceUpdateInfo {
	color: white;
	width: max(30%, 220px);
	height: clamp(40px, 7vh, 75px);
	position: absolute;
	right: 10%;
	display: flex;
	column-gap: clamp(5px, 1vw, 20px);
}

.deviceView__deviceUpdatesLeft {
	border: 2px solid white;
	border-radius: var(--responsive-border-radius);
	width: 100%;
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	row-gap: 10px;
}

.deviceView__deviceUpdatesLeftTitle {
	position: absolute;
	bottom: 98%;
	left: 5%;
	background: var(--app-color);
	padding: 0 .2em;
	font-size: clamp(11px, 0.8vw, 20px);
}

.deviceView__desktopDeviceUpdatesLeft {
	margin-top: 10px;
	margin-left: 10px;
	font-size: clamp(11px, 0.8vw, 25px);
}

.deviceView__mobileDeviceUpdatesLeft {
	margin-left: 10px;
	font-size: clamp(11px, 0.8vw, 25px);
}

#devicesTable {
	height: 60%;
	width: 70%;
	min-width: 410px;
	min-height: 182px;
	top: 20%;
	left: 50%;
	transform: translateX(-50%);
}
</style>
