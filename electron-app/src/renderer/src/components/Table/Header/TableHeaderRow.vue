<template>
	<tr class="tableHeaderRow">
		<TableHeaderCell v-for="(header) in headerModels" :key="header.id" :model="header"
			:backgroundColor="backgroundColor" />
	</tr>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import TableHeaderCell from './TableHeaderCell.vue';

import { SortableHeaderModel } from '../../../Types/Models';

export default defineComponent({
	name: "TableHeaderRow",
	components:
	{
		TableHeaderCell
	},
	props: ["model", 'backgroundColor'],
	setup(props)
	{
		const headerModels: ComputedRef<SortableHeaderModel[]> = computed(() => props.model);
		return {
			headerModels,
		}
	}
})
</script>

<style>
.tableHeaderRow {
	width: 100%;
}

.tableHeaderRow th:nth-child(1) {
	padding-left: 20px;
}
</style>
