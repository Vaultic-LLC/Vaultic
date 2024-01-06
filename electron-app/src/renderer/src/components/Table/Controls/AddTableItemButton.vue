<template>
	<div class="addTableItem">
		<div class="addTableItemButtonContainer">
			<div class="addTableItemButton" @click="doShowEditControlsPopup">
				<ion-icon class="addTableItemButtonIcon" name="add-outline"></ion-icon>
			</div>
		</div>
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

import ObjectPopup from '../../../components/ObjectPopups/ObjectPopup.vue';
import AddObjectPopup from "../../../components/ObjectPopups/AddObjectPopup.vue"

export default defineComponent({
	name: "TableControls",
	components:
	{
		ObjectPopup,
		AddObjectPopup
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

.addTableItemButton {
	height: 45px;
	width: 45px;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 35px;

	border-radius: 50%;
	background: v-bind(primaryColor);
	color: white;
	transition: 0.5s;
}

.addTableItemButton:hover {
	box-shadow: 0 0 25px v-bind(primaryColor);
}
</style>
