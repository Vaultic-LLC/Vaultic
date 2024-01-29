<template>
	<TableRowValue :model="model" :color="color">
		<div class="tableRowColorValue">
		</div>
	</TableRowValue>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import TableRowValue from './TableRowValue.vue';

import { ColorTableRowValue } from '../../../Types/Models';

export default defineComponent({
	name: "TableRowColorValue",
	components:
	{
		TableRowValue
	},
	props: ["model", "color"],
	setup(props)
	{
		const rowValue: ComputedRef<ColorTableRowValue> = computed(() => props.model);

		return {
			rowValue,
		};
	},
})
</script>
<style>
.tableRowColorValue {
	background-color: v-bind('rowValue.color');
	box-shadow: 0 0 10px v-bind('rowValue.color');
	border-radius: 50%;
	width: 30px;
	height: 30px;
}
</style>
