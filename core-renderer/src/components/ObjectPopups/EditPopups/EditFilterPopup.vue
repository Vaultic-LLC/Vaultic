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

import { Filter } from '../../../Types/DataTypes';

export default defineComponent({
	name: "EditGroupPopup",
	components:
	{
		FilterView
	},
	props: ['model'],
	setup(props)
	{
        // copy the object so that we don't edit the original one. Also needed for change tracking
		const filterModel: ComputedRef<Filter> = computed(() => JSON.vaulticParse(JSON.vaulticStringify(props.model)));

		return {
			filterModel,
		}
	}
})
</script>

<style>
.editFilterHeader {
	display: flex;
	justify-content: center;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	font-size: clamp(15px, 1vw, 25px);
}

.filterViewContainer {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
