<template>
	<div class="editPasswordHeader">
		<h2>Edit Password</h2>
	</div>
	<div class="passwordViewContainer">
		<PasswordView :creating="false" :model="passwordModel" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, ref } from 'vue';

import PasswordView from "../../ObjectViews/PasswordView.vue";

import { Password } from '../../../Types/EncryptedData';
import { SingleSelectorItemModel } from '../../../Types/Models';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "EditPasswordPopup",
	components:
	{
		PasswordView
		// SingleSelectorItem
	},
	props: ['model'],
	setup(props)
	{
		// copy the object so that we don't edit the original one
		const passwordModel: ComputedRef<Password> = computed(() => JSON.parse(JSON.stringify(props.model)));
		const selectorItemModel: SingleSelectorItemModel = {
			isActive: ref(true),
			title: ref("Edit Password"),
			color: ref(stores.settingsStore.currentColorPalette.passwordsColor.primaryColor),
			onClick: () => { }
		}

		return {
			passwordModel,
			selectorItemModel
		}
	}
})
</script>

<style>
.passwordViewContainer {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}

.editPasswordHeader {
	display: flex;
	justify-content: flex-start;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	margin-left: 14.5%;
	font-size: clamp(15px, 1vw, 25px);
}
</style>
