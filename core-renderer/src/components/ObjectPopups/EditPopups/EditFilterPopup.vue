<template>
	<div class="editFilterHeader">
		<h2>Edit Filter</h2>
	</div>
	<div class="filterViewContainer">
		<FilterView :creating="false" :model="filterModel" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';

import FilterView from "../../ObjectViews/FilterView.vue";

import { Filter } from '../../../Types/Table';

export default defineComponent({
	name: "EditGroupPopup",
	components:
	{
		FilterView
	},
	props: ['model'],
	setup(props)
	{
		// copy the object so that we don't edit the original one
		const filterModel: ComputedRef<Filter> = computed(() => JSON.parse(JSON.stringify(props.model)));

		return {
			filterModel,
		}
	}
})
</script>

<style>
.editFilterHeader {
	display: flex;
	justify-content: flex-start;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	margin-left: 22.3%;
	font-size: clamp(15px, 1vw, 25px);
}

.filterViewContainer {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
