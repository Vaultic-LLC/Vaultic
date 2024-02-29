<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<ColorPickerInputField :label="'Filter Color'" :color="color" v-model="colorPaletteState.filtersColor"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
		<ColorPickerInputField :label="'Group Color'" :color="color" v-model="colorPaletteState.groupsColor"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
		<div class="groupedColorPickers" :style="{ 'grid-row': '5 / span 3', 'grid-column': '2 / span 9' }">
			<label class="groupedColorPickerLabels">Password Colors</label>
			<ColorPickerInputField :label="'Primary'" :color="color"
				v-model="colorPaletteState.passwordsColor.primaryColor" />
			<ColorPickerInputField :label="'Secondary One'" :color="color"
				v-model="colorPaletteState.passwordsColor.secondaryColorOne" />
			<ColorPickerInputField :label="'Seconday Two'" :color="color"
				v-model="colorPaletteState.passwordsColor.secondaryColorTwo" />
			<ToolTip :color="color" :message="'Secondary Colors are used for the border of popups'" />
		</div>
		<div class="groupedColorPickers" :style="{ 'grid-row': '9 / span 3', 'grid-column': '2 / span 9' }">
			<label class="groupedColorPickerLabels">Value Colors</label>
			<ColorPickerInputField :label="'Primary'" :color="color" v-model="colorPaletteState.valuesColor.primaryColor" />
			<ColorPickerInputField :label="'Secondary One'" :color="color"
				v-model="colorPaletteState.valuesColor.secondaryColorOne" />
			<ColorPickerInputField :label="'Secondary Two'" :color="color"
				v-model="colorPaletteState.valuesColor.secondaryColorTwo" />
			<ToolTip :color="color" :message="'Secondary Colors are used for the border of popups'" />
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
import { useLoadingIndicator, useRequestAuthFunction } from '@renderer/Helpers/injectHelper';
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

		const requestAuthFunc = useRequestAuthFunction();
		const [showLoadingIndicator, hideLoadingIndicator] = useLoadingIndicator();

		const gridDefinition: GridDefinition =
		{
			rows: 12,
			rowHeight: '50px',
			columns: 11,
			columnWidth: '100px'
		};


		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(primaryColor.value, doSave, onAuthCancelled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFailed = reject;
				});
			}

			return Promise.reject();
		}

		async function doSave(key: string)
		{
			showLoadingIndicator(primaryColor.value, "Saving Color Palette");
			colorPaletteState.value.isCreated = true;
			colorPaletteState.value.editable = true;

			await stores.settingsStore.updateColorPalette(key, colorPaletteState.value);

			refreshKey.value = Date.now().toString();

			hideLoadingIndicator();
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
	border: 1px solid #d0d0d0;
	border-radius: 20px;
}

.groupedColorPickers .groupedColorPickerLabels {
	position: absolute;
	color: #d0d0d0;
	left: 10px;
	top: 0;
	transform: translateY(-80%);
	background: var(--app-color);
	padding: 0 .2em;
}
</style>
