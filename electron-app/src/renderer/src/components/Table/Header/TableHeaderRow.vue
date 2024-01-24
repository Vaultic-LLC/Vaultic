<template>
	<div class="tableHeader">
		<div class="tableHeader__tableTabs">
			<!-- <div class="tableHeader__tableTabs__tab" v-for="(tab, index) in  headerTabs " :key="tab.id" :style="{
				background: tab.active?.value ? (tab.backgroundColor?.value ?? '') : '',
				boxShadow: hoveringTab == index ? `0 0 25px ${tab.color?.value}` : ''
			}" @click="onTabClick(index)" @mouseover="onTabHover(index)" @mouseleave="onTabUnhover">
				{{ tab.name }}
			</div> -->
			<TableHeaderTab v-for="(model, index) in headerTabs" :key="index" :model="model" />
		</div>
		<div class="tableHeader__tableHeaderRow" :class="{ 'tableHeader__tableHeaderRow--noTabs': headerTabs.length == 0 }">
			<div class="tableHeader__tableHeaderRow__headers">
				<TableHeaderCell v-for="( header ) in  headerModels " :key="header.id" :model="header"
					:backgroundColor="backgroundColor" />
			</div>
			<div class="tableHeader__tableHeaderRow__controls">
				<slot name="controls"></slot>
			</div>
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
	props: ["model", 'backgroundColor', 'tabs'],
	setup(props)
	{
		const headerModels: ComputedRef<SortableHeaderModel[]> = computed(() => props.model.filter(m => m.name !== ''));
		const headerTabs: ComputedRef<HeaderTabModel[]> = computed(() => props.tabs ?? []);
		const hoveringTab: Ref<number> = ref(-1);

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
	justify-content: space-between;
	width: 50%;
	border-top-left-radius: 20px;
}

.tableHeader__tableTabs__tab {
	transition: 0.3s;
	color: white;
	font-size: 20px;
	padding: 10px;
	flex-grow: 1;
	background: rgb(44 44 51 / 16%);
	cursor: pointer;
}

.tableHeader__tableTabs__tab:nth-child(1) {
	border-top-left-radius: 20px;
}

.tableHeader__tableTabs__tab:last-child {
	border-top-right-radius: 20px;
}

.tableHeader__tableHeaderRow {
	width: 100%;
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: rgb(44 44 51 / 16%);
	border-top-right-radius: 20px;
}

.tableHeader__tableHeaderRow--noTabs {
	border-top-left-radius: 20px;
}

.tableHeader__tableHeaderRow__headers {
	display: flex;
}

.tableHeader__tableHeaderRow__controls {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	column-gap: 30px;
	padding: 10px;
	padding-right: 2%;
}

.tableHeader__tableHeaderRow th:nth-child(1) {
	padding-left: 20px;
}
</style>
