<template>
	<ObjectInputField :border="border" :color="color" :title="title" :maxHeight="maxHeight" :allowAdd="false"
		:loadNextChunk="loadNextChunk">
		<template #header>
			<TableHeaderRow :model="headerModels" :defaultActiveHeader="initialHeader" :backgroundColor="'#0f111d'" />
		</template>
		<template #body>
			<SelectableTableRow v-for="(trd, index) in tableRowDatas.visualValues" :key="trd.id" :rowNumber="index"
				:selectableTableRowData="trd" :preventDeselect="false" :style="{ width: '5%', 'height': '75px' }"
				:color="color" />
		</template>
	</ObjectInputField>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import SelectableTableRow from '../Table/SelectableTableRow.vue';
import ObjectInputField from './ObjectInputField.vue';

import { SelectableTableRowData, SortableHeaderModel } from '../../Types/Models';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';

export default defineComponent({
	name: "GroupsInputField",
	components:
	{
		SelectableTableRow,
		ObjectInputField,
		TableHeaderRow
	},
	props: ['models', 'title', 'color', 'maxHeight', 'border', 'headerModels', 'initalSelectedHeader'],
	setup(props)
	{
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		// @ts-ignore
		const tableRowDatas: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
		const tableHeaderModels: ComputedRef<SortableHeaderModel[]> = computed(() => props.headerModels);
		const initialHeader: ComputedRef<number> = computed(() => props.initalSelectedHeader);

		function loadNextChunk()
		{
			tableRowDatas.value.loadNextChunk();
		}

		watch(() => props.models, (newValue) =>
		{
			tableRowDatas.value.setValues(newValue);
		});

		onMounted(() =>
		{
			tableRowDatas.value.setValues(props.models);
		});

		return {
			primaryColor,
			tableRowDatas,
			tableHeaderModels,
			initialHeader,
			loadNextChunk
		}
	}
})
</script>
