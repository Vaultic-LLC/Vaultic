<template>
	<TableRowValue :model="model" :color="color">
		<div class="tableRowTextValueValue">
			{{ rowValue.value }}
		</div>
	</TableRowValue>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import TableRowValue from './TableRowValue.vue';

import { TextTableRowValue } from '../../../Types/Models';

export default defineComponent({
	name: "TableRowTextValue",
	components:
	{
		TableRowValue
	},
	props: ["model", "color"],
	setup(props)
	{
		const rowValue: ComputedRef<TextTableRowValue> = computed(() => props.model);
		const margin: ComputedRef<string> = computed(() => rowValue.value.margin == true ? '10px' : '0px');

		return {
			rowValue,
			margin
		};
	},
})
</script>
<style>
.tableRowTextValueValue {
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: clamp(10px, 0.6vw, 16px);
	margin-left: v-bind(margin);
}
</style>
