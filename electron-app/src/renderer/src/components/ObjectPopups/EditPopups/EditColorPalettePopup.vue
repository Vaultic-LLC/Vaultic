<template>
	<div class="editColorPaletteHeader">
		<h2>Edit Color Palette</h2>
	</div>
	<div class="cloneFromColorPalettesContainer">
		<div class="cloneFromHeader">Clone From</div>
		<div class="existingColorPalettes">
			<div class="colorPalette" :class="{ hovering: hoveringColorPalette == index }"
				v-for="(cp, index) in currentColorPalettes" :key="cp.id" @click="cloneColorPalette(cp)"
				@mouseenter="hoveringColorPalette = index" @mouseleave="hoveringColorPalette = -1">
				<div class="passwordColor existingColorPalettes__colorPaletteCell"
					:style="{ '--colorPaletteColor': cp.passwordsColor.primaryColor }">
				</div>
				<div class="valueColor existingColorPalettes__colorPaletteCell"
					:style="{ '--colorPaletteColor': cp.valuesColor.primaryColor }">
				</div>
			</div>
		</div>
	</div>
	<div class="colorPaletteViewContainer">
		<ColorPaletteView :creating="false" :model="colorPaletteModel" />
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, ref, Ref } from 'vue';

import ColorPaletteView from '../../../components/ObjectViews/ColorPaletteView.vue';

import { ColorPalette } from '../../../Types/Colors';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "EditColorPalettePopup",
	components:
	{
		ColorPaletteView
	},
	props: ['model'],
	setup(props)
	{
		const hoveringColorPalette: Ref<number> = ref(-1);
		// copy the object so that we don't edit the original one
		const colorPaletteModel: Ref<ColorPalette> = ref(JSON.parse(JSON.stringify(props.model)));
		const currentColorPalettes: ComputedRef<ColorPalette[]> = computed(() => stores.settingsStore.colorPalettes.filter(cp => cp.isCreated));

		function cloneColorPalette(colorPalette: ColorPalette)
		{
			colorPaletteModel.value = JSON.parse(JSON.stringify(colorPalette));
			colorPaletteModel.value.id = props.model.id;
		}

		return {
			hoveringColorPalette,
			colorPaletteModel,
			currentColorPalettes,
			cloneColorPalette
		}
	}
})
</script>

<style>
.editColorPaletteHeader {
	display: flex;
	justify-content: flex-start;
	color: white;
	animation: fadeIn 1s linear forwards;
	margin: 5%;
	margin-left: 11%;
	margin-bottom: 0;
	font-size: clamp(15px, 1vw, 25px);
}

.colorPaletteViewContainer {
	position: absolute;
	top: 20%;
	width: 100%;
	height: 80%;
}

.cloneFromColorPalettesContainer {
	position: absolute;
	right: 15%;
	width: max(12vw, 150px);
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	flex-wrap: wrap;
	color: white;
	border: 1px solid white;
	border-radius: min(1vw, 1rem);
	z-index: 20;
}

.cloneFromColorPalettesContainer .cloneFromHeader {
	position: absolute;
	top: 0;
	left: 10%;
	transform: translateY(-95%);
	background-color: var(--app-color);
	padding: 0 .2em;
	font-size: clamp(11px, 1.2vh, 25px);
}

.cloneFromColorPalettesContainer .existingColorPalettes {
	display: flex;
	justify-content: flex-start;
	align-items: center;
	flex-wrap: wrap;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette {
	width: max(4vw, 50px);
	height: max(30px, 2vw);
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.3s;
	will-change: transform;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette:hover {
	transform: scale(1.1);
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette .passwordColor {
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
	height: clamp(15px, 1.5vw, 30px);
	width: clamp(15px, 1.5vw, 30px);
	cursor: pointer;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette .valueColor {
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
	height: clamp(15px, 1.5vw, 30px);
	width: clamp(15px, 1.5vw, 30px);
	cursor: pointer;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette.hovering .existingColorPalettes__colorPaletteCell {
	box-shadow: 0 0 25px var(--colorPaletteColor);
}

.existingColorPalettes__colorPaletteCell {
	background-color: var(--colorPaletteColor);
}
</style>
