<template>
	<div class="editGroupHeader">
		<h2>Edit Group</h2>
	</div>
	<div class="groupViewContainer">
		<GroupView :creating="false" :model="groupModel" :currentPrimaryDataType="currentPrimaryDataType" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';

import GroupView from "../../ObjectViews/GroupView.vue";

import { DataType, Group } from '../../../Types/DataTypes';
import app from '../../../Objects/Stores/AppStore';

export default defineComponent({
	name: "EditGroupPopup",
	components:
	{
		GroupView
	},
	props: ['model'],
	setup(props)
	{
        // copy the object so that we don't edit the original one. Also needed for change tracking
		const groupModel: ComputedRef<Group> = computed(() => JSON.parse(JSON.stringify(props.model)));
        const currentPrimaryDataType: ComputedRef<DataType> = computed(() => app.activePasswordValuesTable);

		return {
			groupModel,
            currentPrimaryDataType
		}
	}
})
</script>

<style>
.editGroupHeader {
	display: flex;
	justify-content: center;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	font-size: clamp(15px, 1vw, 25px);
}

.groupViewContainer {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
