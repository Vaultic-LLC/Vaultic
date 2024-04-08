<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<ColorPickerInputField :label="'Filter Color'" :color="color" v-model="colorPaletteState.filtersColor"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" :width="'8vw'" :height="'4vh'"
			:minHeight="'30px'" :minWidth="'125px'" />
		<ColorPickerInputField :label="'Group Color'" :color="color" v-model="colorPaletteState.groupsColor"
			:style="{ 'grid-row': '4 / span 2', 'grid-column': '2 / span 2' }" :width="'8vw'" :height="'4vh'"
			:minHeight="'30px'" :minWidth="'125px'" />
		<div class="groupedColorPickers" :style="{ 'grid-row': '7 / span 3', 'grid-column': '2 / span 9' }">
			<label class="groupedColorPickerLabels">Password Colors</label>
			<ColorPickerInputField :label="'Primary'" :color="color"
				v-model="colorPaletteState.passwordsColor.primaryColor" :width="'8vw'" :height="'4vh'"
				:minHeight="'30px'" :minWidth="'125px'" />
			<ColorPickerInputField :label="'Secondary One'" :color="color"
				v-model="colorPaletteState.passwordsColor.secondaryColorOne" :width="'8vw'" :height="'4vh'"
				:minHeight="'30px'" :minWidth="'125px'" />
			<ColorPickerInputField :label="'Seconday Two'" :color="color"
				v-model="colorPaletteState.passwordsColor.secondaryColorTwo" :width="'8vw'" :height="'4vh'"
				:minHeight="'30px'" :minWidth="'125px'" />
			<ToolTip :color="color" :message="'Secondary Colors are used for the border of popups'"
				:size="'clamp(18px, 1.7vw, 28px)'" />
		</div>
		<div class="groupedColorPickers" :style="{ 'grid-row': '12 / span 3', 'grid-column': '2 / span 9' }">
			<label class="groupedColorPickerLabels">Value Colors</label>
			<ColorPickerInputField :label="'Primary'" :color="color"
				v-model="colorPaletteState.valuesColor.primaryColor" :width="'8vw'" :height="'4vh'" :minHeight="'30px'"
				:minWidth="'125px'" />
			<ColorPickerInputField :label="'Secondary One'" :color="color"
				v-model="colorPaletteState.valuesColor.secondaryColorOne" :width="'8vw'" :height="'4vh'"
				:minHeight="'30px'" :minWidth="'125px'" />
			<ColorPickerInputField :label="'Secondary Two'" :color="color"
				v-model="colorPaletteState.valuesColor.secondaryColorTwo" :width="'8vw'" :height="'4vh'"
				:minHeight="'30px'" :minWidth="'125px'" />
			<ToolTip :color="color" :message="'Secondary Colors are used for the border of popups'"
				:size="'clamp(18px, 1.7vw, 28px)'" />
		</div>
	</ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ToolTip from '../ToolTip.vue';

import { GridDefinition } from '../../Types/Models';
import { ColorPalette } from '../../Types/Colors';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "ColorPaletteView",
	components: {
		ObjectView,
		ColorPickerInputField,
		ToolTip
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const refreshKey: Ref<string> = ref("");
		const colorPaletteState: Ref<ColorPalette> = ref(props.model);
		const color: ComputedRef<string> = computed(() => '#d0d0d0');
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		let saveSucceeded: (value: boolean) => void;
		let saveFailed: (value: boolean) => void;

		const gridDefinition: GridDefinition =
		{
			rows: 15,
			rowHeight: 'clamp(10px, 3vh, 50px)',
			columns: 11,
			columnWidth: 'clamp(20px, 4vw, 100px)'
		};

		function onSave()
		{
			stores.popupStore.showRequestAuthentication(primaryColor.value, doSave, onAuthCancelled);
			return new Promise((resolve, reject) =>
			{
				saveSucceeded = resolve;
				saveFailed = reject;
			});
		}

		async function doSave(key: string)
		{
			stores.popupStore.showLoadingIndicator(primaryColor.value, "Saving Color Palette");
			colorPaletteState.value.isCreated = true;
			colorPaletteState.value.editable = true;

			await stores.settingsStore.updateColorPalette(key, colorPaletteState.value);

			refreshKey.value = Date.now().toString();

			stores.popupStore.hideLoadingIndicator();
			saveSucceeded(true);
		}

		function onAuthCancelled()
		{
			saveFailed(false);
		}

		watch(() => props.model, (newValue) =>
		{
			colorPaletteState.value = newValue;
			refreshKey.value = Date.now().toString();
		});

		return {
			colorPaletteState,
			color,
			refreshKey,
			gridDefinition,
			onSave
		};
	},
})
</script>

<style>
.groupedColorPickers {
	position: relative;
	display: flex;
	justify-content: space-around;
	align-items: center;
	border: 1.5px solid #d0d0d0;
	border-radius: min(1vw, 1rem);
	min-width: 493px;
	min-height: 60px;
}

.groupedColorPickers .groupedColorPickerLabels {
	position: absolute;
	color: #d0d0d0;
	left: 10px;
	top: 0;
	transform: translateY(-80%);
	background: var(--app-color);
	padding: 0 .2em;
	font-size: clamp(11px, 1.2vh, 25px);
}
</style>
