<template>
	<div id="loginHistoryTable">
		<TableTemplate ref="tableRef" :rowGap="10" class="shadow scrollbar" :color="color" :scrollbar-size="1"
			:style="{ height: '25%', width: '25%', left: '5%', top: '72%' }"
			@scrolledToBottom="tableRowDatas.loadNextChunk()">
			<template #header>
				<TableHeaderRow :model="headerModel" :backgroundColor="'#121a20'" />
			</template>
			<template #body>
				<TableRow class="shadow hover" v-for="(lr, index) in tableRowDatas.visualValues" :key="lr.id"
					:rowNumber="index" :model="lr" :editable="false" :color="color" :style="{ 'height': '70px' }" />
			</template>
		</TableTemplate>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import TableTemplate from './TableTemplate.vue';
import TableHeaderRow from './Header/TableHeaderRow.vue';
import TableRow from './Rows/TableRow.vue';

import { DataType } from '../../Types/Table';
import { SortableHeaderModel, TableRowData } from '../../Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { LoginRecord } from '../../Types/EncryptedData';
import { stores } from '../../Objects/Stores';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';

export default defineComponent({
	name: 'LoginHistoryTable',
	components:
	{
		TableTemplate,
		TableHeaderRow,
		TableRow
	},
	setup()
	{
		const tableRef: Ref<null> = ref(null);
		const color: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.Passwords:
					return stores.settingsStore.currentColorPalette.passwordsColor.primaryColor;
				case DataType.NameValuePairs:
				default:
					return stores.settingsStore.currentColorPalette.valuesColor.primaryColor;
			}
		})

		const tableRowDatas: Ref<InfiniteScrollCollection<TableRowData>> = ref(new InfiniteScrollCollection<TableRowData>());
		const loginRecords: SortedCollection<LoginRecord> = new SortedCollection(stores.appStore.loginHistory, "datetime");
		const headerModel: SortableHeaderModel[] = [
			{
				id: uuidv4(),
				isActive: ref(true),
				name: "Recent Logins",
				descending: true,
				clickable: true,
				width: '200px',
				onClick: function ()
				{
					loginRecords.updateSort("datetime", this.descending == true)
					setLoginRecords();
				}
			}
		]

		onMounted(() =>
		{
			setLoginRecords();
		});

		function setLoginRecords()
		{
			const temp: TableRowData[] = loginRecords.values.map(lr =>
			{
				return {
					id: uuidv4(),
					values: [{ value: lr.displayTime, copiable: false, width: '200px' }]
				}
			});

			tableRowDatas.value.setValues(temp);
			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		return {
			tableRef,
			headerModel,
			tableRowDatas,
			color
		}
	}
});
</script>

<style></style>
