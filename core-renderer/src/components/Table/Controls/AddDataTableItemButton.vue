<template>
	<div class="addTableItem">
		<AddButton :color="primaryColor" @click="doShowEditControlsPopup" :minSize="minButtonSize" />
	</div>
</template>

<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';

import AddButton from './AddButton.vue';
import app from '../../../Objects/Stores/AppStore';

export default defineComponent({
	name: "AddDataTableItemButton",
	components:
	{
		AddButton
	},
	props: ['initalActiveContentOnClick', 'color', 'minButtonSize'],
	setup(props)
	{
		let primaryColor: ComputedRef<string> = computed(() => props.color);
		let initalActiveContent: ComputedRef<number> = computed(() => props.initalActiveContentOnClick);

		function doShowEditControlsPopup()
		{
            app.popups.showAddDataTypePopup(props.initalActiveContentOnClick);
		}

		return {
			primaryColor,
			initalActiveContent,
			doShowEditControlsPopup,
		}
	}
})
</script>

<style>
.addTableItemButtonContainer {
	cursor: pointer;
}
</style>
