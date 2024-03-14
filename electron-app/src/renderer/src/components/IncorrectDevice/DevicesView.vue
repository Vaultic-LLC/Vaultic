<template>
	<div class="deviceViewContainer">
		<div>
			<div>
				Automatic desktop device updates left: {{ responseObj.DesktopDeviceUpdatesLeft }}
			</div>
			<div>
				Automatic mobile device updates left: {{ responseObj.MobileDeviceUpdatesLeft }}
			</div>
			<ToolTip :color="color" :message="`Once you run out of automatic updates, you'll have to pay for any additional updates or reach out to customer service.`" />
		</div>
		<div class="deviceTable">
			<TableTemplate ref="tableRef" :rowGap="0" class="shadow scrollbar" id="filterTable" :color="color"
				:headerModels="headers" :scrollbar-size="1" :emptyMessage="''"
				:showEmptyMessage="false"
				:style="{ height: '43%', width: '25%', left: '3%', top: '42%' }"
				@scrolledToBottom="tableRows.loadNextChunk()">
				<template #header>
					<TableHeaderRow :model="headers">
					</TableHeaderRow>
				</template>
				<template #body>
					<TableRow class="shadow hover" v-for="(row, index) in tableRows.visualValues" :key="row.id"
						:rowNumber="index" :model="row" :preventDeselect="false"
						:style="{ width: '5%', 'height': '100px' }" :color="color" :allowPin="false" :allowEdit="false"
						:allowDelete="true" />
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

import { Device, IncorrectDeviceResponse } from '@renderer/Types/AccountSetup';
import { SortableHeaderModel, TableRowData, TextTableRowValue } from '@renderer/Types/Models';
import { createSortableHeaderModels } from '@renderer/Helpers/ModelHelper';
import { SortedCollection } from '@renderer/Objects/DataStructures/SortedCollections';
import { HeaderDisplayField } from '@renderer/Types/EncryptedData';
import { v4 as uuidv4 } from 'uuid';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';
import { stores } from '@renderer/Objects/Stores';

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
		const responseObj: Ref<IncorrectDeviceResponse> = ref(props.response);
		const devices: ComputedRef<SortedCollection<Device>> = computed(() => new SortedCollection([], "Name"));
        const activeHeader: Ref<number> = ref(1);
		const tableRows: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection<TableRowData>());

		const filterHeaderDisplayField: HeaderDisplayField[] = [
		{
			displayName: "Name",
			backingProperty: "Name",
			width: '75px',
			clickable: true
		},
		{
			displayName: "Type",
			backingProperty: "Type",
			width: '75px',
			clickable: true
		},
		{
			displayName: "Model",
			backingProperty: "Model",
			width: '75px',
			clickable: true
		},
		{
			displayName: "Version",
			backingProperty: "Version",
			width: '75px',
			clickable: true
		}];

		const headers: SortableHeaderModel[] = createSortableHeaderModels<Device>(activeHeader, filterHeaderDisplayField,
			devices.value, undefined, setTableRows);

		function setTableRows()
		{
			tableRows.value.setValues(devices.value.calculatedValues.map((d) =>
			{
				d.id = uuidv4();
				const values: TextTableRowValue[] = [
					{component: "TextTableRowValue", value: d.Name, copiable: false, width: '75px' },
					{component: "TestTableRowValue", value: d.Type, copiable: false, width: '75px'},
					{component: "TextTableRowValue", value: d.Model, copiable: false, width: '75px'},
					{component: "TextTableRowValue", value: d.Verison, copiable: false, width: '75px'}
				]

				let tableRow: TableRowData =
				{
					id: uuidv4(),
					values: values,
					onDelete: function()
					{
						// TODO: This should require master key
						doDelete(d.id, d.UserDesktopDeviceID, d.UserMobileDeviceID)
					}
				}

				return tableRow;
			}));
		}

		async function doDelete(deviceID: string, desktopDeviceID?: number, mobileDeviceID?: number)
		{
			// TODO: show loading indicator
			const response = await window.api.server.account.deleteDevice(desktopDeviceID, mobileDeviceID);
			if (response.success)
			{
				devices.value.remove(deviceID);
				setTableRows();
			}
			else
			{
				if (response.UnknownError)
				{
					stores.popupStore.showErrorResponse(response);
					return;
				}

				if (response.InvalidSession)
				{
					stores.popupStore.showSessionExpired();
				}
			}
		}

		onMounted(() =>
		{
			if (!responseObj.value)
			{
				// request devices from server
			}
			else
			{
				const d: Device[] = [...responseObj.value.DesktopDevices!, ...responseObj.value.MobileDevices!];
				devices.value.updateValues(d);
			}

			setTableRows();
		})

		return {
			devices,
			headers,
			tableRows,
			responseObj
		}
	}
})
</script>

<style></style>
