<template>
	<div class="editColorPaletteHeader">
		<h2>Edit Color Palette</h2>
	</div>
	<div class="cloneFromColorPalettesContainer">
		<div class="cloneFromHeader">Clone From</div>
		<div class="existingColorPalettes">
			<div class="colorPalette" v-for="cp in currentColorPalettes" :key="cp.id" @click="cloneColorPalette(cp)">
				<div class="passwordColor" :style="{ backgroundColor: cp.passwordsColor.primaryColor }">
				</div>
				<div class="valueColor" :style="{ backgroundColor: cp.valuesColor.primaryColor }">
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
		// copy the object so that we don't edit the original one
		const colorPaletteModel: Ref<ColorPalette> = ref(JSON.parse(JSON.stringify(props.model)));
		const currentColorPalettes: ComputedRef<ColorPalette[]> = computed(() => stores.settingsStore.colorPalettes.filter(cp => cp.isCreated));

		function cloneColorPalette(colorPalette: ColorPalette)
		{
			colorPaletteModel.value = JSON.parse(JSON.stringify(colorPalette));
			colorPaletteModel.value.id = props.model.id;
		}

		return {
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
	font-size: 25px;
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
	width: 25%;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	flex-wrap: wrap;
	color: white;
	border: 1px solid white;
	border-radius: 20px;
	z-index: 20;
}

.cloneFromColorPalettesContainer .cloneFromHeader {
	position: absolute;
	top: 0;
	left: 10%;
	transform: translateY(-100%);
	background-color: var(--app-color);
	padding: 0 .2em;
}

.cloneFromColorPalettesContainer .existingColorPalettes {
	display: flex;
	justify-content: flex-start;
	align-items: center;
	flex-wrap: wrap;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette {
	width: 100px;
	height: 50px;
	display: flex;
	justify-content: center;
	align-items: center;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette .passwordColor {
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
	height: 30px;
	width: 30px;
}

.cloneFromColorPalettesContainer .existingColorPalettes .colorPalette .valueColor {
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
	height: 30px;
	width: 30px;
}
</style>
