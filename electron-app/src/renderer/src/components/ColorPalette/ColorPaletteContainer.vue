<template>
	<div class="colorPalettesContainer">
		<ColorPaletteDisplay :colorPalette="cpOne" :index="0" :style="{ 'grid-row': 1, 'grid-column': 1 }" />
		<ColorPaletteDisplay :colorPalette="cpTwo" :index="1" :style="{ 'grid-row': 2, 'grid-column': 1 }" />
		<ColorPaletteDisplay :colorPalette="cpThree" :index="2" :style="{ 'grid-row': 3, 'grid-column': 1 }" />
		<ColorPaletteDisplay :colorPalette="cpFour" :index="3" :style="{ 'grid-row': 1, 'grid-column': 2 }" />
		<ColorPaletteDisplay :colorPalette="cpFive" :index="4" :style="{ 'grid-row': 2, 'grid-column': 2 }" />
		<ColorPaletteDisplay :colorPalette="cpSix" :index="5" :style="{ 'grid-row': 3, 'grid-column': 2 }" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from "vue";
import { ColorPalette } from '../../Types/Colors';
import ColorPaletteDisplay from "./ColorPaletteDisplay.vue";
import { stores } from "@renderer/Objects/Stores";

export default defineComponent({
	name: "ColorPaletteContainer",
	components: {
		ColorPaletteDisplay
	},
	setup()
	{
		const cpOne: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[0]);
		const cpTwo: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[1]);
		const cpThree: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[2]);
		const cpFour: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[3]);
		const cpFive: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[4]);
		const cpSix: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[5]);

		return {
			cpOne,
			cpTwo,
			cpThree,
			cpFour,
			cpFive,
			cpSix
		}
	}
})
</script>

<style>
.colorPalettesContainer {
	position: absolute;
	display: grid;
	flex-direction: column;
	width: 20%;
	min-width: 228px;
	min-height: 120px;
	height: 20%;
	top: max(30px, 5%);
	left: max(11px, 2%);
	column-gap: 10%;
	row-gap: 10%;
	z-index: 1;
	grid-template-rows: repeat(3, max(30px, 5vh));
	grid-template-columns: repeat(2, max(91px, 8vw));
	transition: 0.3s;
}

@media (max-width: 1300px) {
	.colorPalettesContainer {
		left: 1%;
	}
}
</style>
