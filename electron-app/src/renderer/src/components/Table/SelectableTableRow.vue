<template>
	<TableRow @click="onRowClicked" :rowNumber="rowNumber" :model="selectableTableRowData" :color="color" :clickable="true">
		<td class="indicatorRow" v-if="selectable">
			<SelectorButton :selectorButtonModel="selectorButtonModel" />
		</td>
	</TableRow>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, } from 'vue';

import TableRow from './Rows/TableRow.vue';
import SelectorButton from '../InputFields/SelectorButton.vue';

import { SelectorButtonModel } from '../../Types/Models';

export default defineComponent({
	name: 'SelectableTableRow',
	components:
	{
		TableRow,
		SelectorButton
	},
	props: ["selectableTableRowData", "preventDeselect", "color", "rowNumber", 'editable'],
	setup(props)
	{
		let values: ComputedRef<string[]> = computed(() => props.selectableTableRowData.values);
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		let active: Ref<boolean> = ref(props.selectableTableRowData.isActive ?? false);
		const selectable: Ref<boolean> = ref(props.selectableTableRowData.selectable);

		const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
		{
			return {
				isActive: active,
				color: primaryColor,
				onClick: onRowClicked
			}
		})

		function onRowClicked()
		{
			if (!props.preventDeselect || !active.value)
			{
				active.value = !active.value;
				if (props.selectableTableRowData.onClick)
				{
					props.selectableTableRowData.onClick();
				}
			}
		}

		return {
			values,
			primaryColor,
			active,
			selectable,
			selectorButtonModel,
			onRowClicked
		}
	}
});
</script>

<style></style>
