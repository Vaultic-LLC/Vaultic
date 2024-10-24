<template>
	<TableRow @click="onRowClicked" :rowNumber="rowNumber" :model="selectableTableRowData" :color="color"
		:clickable="selectable">
		<td class="indicatorRow" v-if="selectable">
			<SelectorButton class="selectableTableRow__button" :selectorButtonModel="selectorButtonModel" />
		</td>
	</TableRow>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, } from 'vue';

import TableRow from './TableRow.vue';
import SelectorButton from '../../InputFields/SelectorButton.vue';

import { SelectableTableRowData, SelectorButtonModel } from '../../../Types/Models';

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
        const model: ComputedRef<SelectableTableRowData> = computed(() => props.selectableTableRowData);
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		let active: Ref<boolean> = ref(model.value.isActive ?? false);
		const selectable: Ref<boolean> = ref(model.value.selectable);

		const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
		{
			return {
				isActive: active,
				color: primaryColor,
				onClick: onRowClicked
			}
		})

		async function onRowClicked()
		{
			if (!props.preventDeselect || !active.value)
			{
				active.value = !active.value;
				if (model.value.onClick)
				{
					await model.value.onClick();
				}
			}
		}

		return {
			primaryColor,
			active,
			selectable,
			selectorButtonModel,
			onRowClicked
		}
	}
});
</script>

<style>
.selectableTableRow__button {
	margin-left: clamp(5px, 0.5vw, 12px);
}
</style>
