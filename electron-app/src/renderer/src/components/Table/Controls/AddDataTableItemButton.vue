<template>
	<div class="addTableItem">
		<AddButton :color="primaryColor" @click="doShowEditControlsPopup" />
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditControlsPopup" :closePopup="closePopup">
					<AddObjectPopup :initalActiveContent="initalActiveContent" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, ComputedRef, computed } from 'vue';

import AddButton from './AddButton.vue';
import ObjectPopup from '../../../components/ObjectPopups/ObjectPopup.vue';
import AddObjectPopup from "../../../components/ObjectPopups/AddObjectPopup.vue"

export default defineComponent({
	name: "AddDataTableItemButton",
	components:
	{
		ObjectPopup,
		AddObjectPopup,
		AddButton
	},
	props: ['initalActiveContentOnClick', 'color'],
	setup(props)
	{
		let primaryColor: ComputedRef<string> = computed(() => props.color);
		let initalActiveContent: ComputedRef<number> = computed(() => props.initalActiveContentOnClick);

		let showEditControlsPopup: Ref<boolean> = ref(false);

		function doShowEditControlsPopup()
		{
			showEditControlsPopup.value = true;
		}

		function closePopup()
		{
			showEditControlsPopup.value = false;
		}

		return {
			primaryColor,
			initalActiveContent,
			showEditControlsPopup,
			doShowEditControlsPopup,
			closePopup
		}
	}
})
</script>

<style>
.addTableItemButtonContainer {
	cursor: pointer;
}
</style>
