<template>
	<div class="editSettingsHeader">
		<h2>Edit Settings</h2>
	</div>
	<div class="settingViewContainer">
		<SettingsView :creating="false" :model="currentSettings" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ref, Ref } from 'vue';

import { SettingsState } from '../../../Objects/Stores/SettingsStore';
import SettingsView from '../../../components/ObjectViews/SettingsView.vue';

export default defineComponent({
	name: "EditSettingsPopup",
	components:
	{
		SettingsView
	},
	props: ['model'],
	setup(props)
	{
		// copy the object so that we don't edit the original one
		const currentSettings: Ref<SettingsState> = ref(JSON.parse(JSON.stringify(props.model)));

		return {
			currentSettings
		}
	}
})
</script>

<style>
.editSettingsHeader {
	display: flex;
	justify-content: flex-start;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	margin-left: 11%;
	margin-bottom: 0;
	font-size: 25px;
}

.settingViewContainer {
	position: absolute;
	top: 20%;
	width: 100%;
	height: 80%;
}
</style>
