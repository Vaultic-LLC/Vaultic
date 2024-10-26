<template>
	<div class="editGroupHeader">
		<h2>Edit Group</h2>
	</div>
	<div class="groupViewContainer">
		<GroupView :creating="false" :model="groupModel" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';

import GroupView from "../../ObjectViews/GroupView.vue";

import { Group } from '../../../Types/DataTypes';

export default defineComponent({
	name: "EditGroupPopup",
	components:
	{
		GroupView
	},
	props: ['model'],
	setup(props)
	{
		// copy the object so that we don't edit the original one
		const groupModel: ComputedRef<Group> = computed(() => JSON.vaulticParse(JSON.vaulticStringify(props.model)));

		return {
			groupModel,
		}
	}
})
</script>

<style>
.editGroupHeader {
	display: flex;
	justify-content: flex-start;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	margin-left: 22.3%;
	font-size: clamp(15px, 1vw, 25px);
}

.groupViewContainer {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
