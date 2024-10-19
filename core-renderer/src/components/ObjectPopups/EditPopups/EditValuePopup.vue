<template>
	<div class="editValueHeader">
		<h2>Edit Value</h2>
	</div>
	<div class="valueViewContainer">
		<ValueView :creating="false" :model="valueModel" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';

import ValueView from "../../ObjectViews/ValueView.vue";

import { Password } from '../../../Types/DataTypes';
import { reactifyFields } from '../../../Types/Fields';

export default defineComponent({
	name: "EditValuePopup",
	components:
	{
		ValueView
	},
	props: ['model'],
	setup(props)
	{
		// copy the object so that we don't edit the original one
		const valueModel: ComputedRef<Password> = computed(() => reactifyFields(JSON.parse(JSON.stringify(props.model))));

		return {
			valueModel,
		}
	}
})
</script>

<style>
.editValueHeader {
	display: flex;
	justify-content: flex-start;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	margin-left: 15%;
	font-size: clamp(15px, 1vw, 25px);
}

.valueViewContainer {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
