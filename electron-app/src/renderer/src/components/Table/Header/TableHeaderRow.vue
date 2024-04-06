<template>
	<div class="tableHeader__tableHeaderRow">
		<div class="tableHeader__tableHeaderRow__headers">
			<TableHeaderCell v-for="( header, index ) in  headerModels " :key="index" :model="header"
				:backgroundColor="backgroundColor" :index="index" />
		</div>
		<div class="tableHeader__tableHeaderRow__controls">
			<slot name="controls"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import TableHeaderCell from './TableHeaderCell.vue';
import TableHeaderTab from './TableHeaderTab.vue';

import { HeaderTabModel, SortableHeaderModel } from '../../../Types/Models';

export default defineComponent({
	name: "TableHeaderRow",
	components:
	{
		TableHeaderCell,
		TableHeaderTab
	},
	props: ["model", 'backgroundColor', 'tabs', 'border', 'color', 'height'],
	setup(props)
	{
		const headerModels: ComputedRef<SortableHeaderModel[]> = computed(() => props.model?.filter(m => m.name !== '') || []);
		const headerTabs: ComputedRef<HeaderTabModel[]> = computed(() => props.tabs ?? []);
		const hoveringTab: Ref<number> = ref(-1);
		const applyBorder: ComputedRef<boolean> = computed(() => props.border == true);
		const computedHeight: ComputedRef<string> = computed(() => props.height ?? 'clamp(15px, 5.8vh, 80px)');

		function onTabClick(index: number)
		{
			if (headerTabs.value[index].onClick)
			{
				// @ts-ignore
				headerTabs.value[index].onClick();
			}
		}

		function onTabHover(index: number)
		{
			hoveringTab.value = index;
		}

		function onTabUnhover()
		{
			hoveringTab.value = -1;
		}

		return {
			headerModels,
			headerTabs,
			hoveringTab,
			applyBorder,
			computedHeight,
			onTabClick,
			onTabHover,
			onTabUnhover
		}
	}
})
</script>

<style>
.tableHeader {
	display: flex;
	flex-direction: column;
}

.tableHeader__tableTabs {
	display: flex;
	border-top-left-radius: 1vw;
	transform: translateY(0.5px);
}

.tableHeader__tableHeaderRow {
	width: calc(100% - 10px);
	height: v-bind(computedHeight);
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: rgb(44 44 51 / 16%);
	border-top-right-radius: 1vw;
}

.tableHeader__tableHeaderRow__headers {
	display: flex;
}

.tableHeader__tableHeaderRow__controls {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	column-gap: 1.2vw;
	/* padding: 10px; */
	padding-right: 2%;
}
</style>
