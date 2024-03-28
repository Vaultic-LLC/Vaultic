<template>
	<div class="colorPaletteOuterContainer" :class="{ editable: editable, hover: hoveringDisplay }">
		<div class="slideOutButtonContainer" v-if="editable" @mouseenter="hoveringDisplay = true"
			@mouseleave="hoveringDisplay = false">
			<div ref="editButton" class="editButton" :class="{ hoverDisplay: hoveringDisplay }" @click.stop="onEdit"
				@mouseenter="hoveringIcon = true" @mouseleave="hoveringIcon = false">
				<ion-icon class="editIcon" name="create-outline"></ion-icon>
			</div>
		</div>
		<div class="colorPaletteContainer" @click.stop="onPaletteSelected" @mouseenter="hoveringDisplay = true"
			@mouseleave="hoveringDisplay = false"
			:class="{ notCreated: !created, hover: hoveringDisplay || hoveringIcon }">
			<SelectorButton v-if="created" :selectorButtonModel="selectorButtonModel" class="selectorButton" />
			<div v-else class="addColorIconContainer">
				<ion-icon class="addColorIcon" name="add-outline"></ion-icon>
			</div>
			<div class="colorPaletteColorContainer">
				<div class="colorPaletteColor passwordColor">
				</div>
				<div class="colorPaletteColor valuesColor">
				</div>
			</div>
		</div>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditColorPalettePopup" :closePopup="onEditColorPalettePopupClosed">
					<EditColorPalettePopup :model="colorPalette" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, watch } from "vue";

import SelectorButton from "../InputFields/SelectorButton.vue";

import { ColorPalette } from "../../Types/Colors";
import { SelectorButtonModel } from "../../Types/Models";
import ObjectPopup from "../ObjectPopups/ObjectPopup.vue";
import EditColorPalettePopup from "../ObjectPopups/EditPopups/EditColorPalettePopup.vue";
import { getLinearGradientFromColor } from "@renderer/Helpers/ColorHelper";
import * as TWEEN from '@tweenjs/tween.js'
import { RGBColor } from '@renderer/Types/Colors';
import { hexToRgb } from '@renderer/Helpers/ColorHelper';
import { stores } from "@renderer/Objects/Stores";

export default defineComponent({
	name: "ColorPaletteDisplay",
	components:
	{
		SelectorButton,
		ObjectPopup,
		EditColorPalettePopup
	},
	props: ['colorPalette', 'index'],
	setup(props)
	{
		const editButton: Ref<HTMLElement | null> = ref(null);
		const colorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.colorPalettes[props.index]);

		const primaryColor: ComputedRef<string> = computed(() => colorPalette.value.passwordsColor.primaryColor);
		const valuesColor: ComputedRef<string> = computed(() => colorPalette.value.valuesColor.primaryColor);

		const editIconBackgroundColor: ComputedRef<string> = computed(() => getLinearGradientFromColor(primaryColor.value));
		const valueBackgroundColor: ComputedRef<string> = computed(() => getLinearGradientFromColor(valuesColor.value));

		const created: ComputedRef<boolean> = computed(() => colorPalette.value.isCreated);
		const editable: ComputedRef<boolean> = computed(() => colorPalette.value.editable);

		const addColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);
		const addColorGradient: Ref<string> = ref(getLinearGradientFromColor(stores.settingsStore.currentPrimaryColor.value));

		const hoveringDisplay: Ref<boolean> = ref(false);
		const hoveringIcon: Ref<boolean> = ref(false);

		const showEditColorPalettePopup: Ref<boolean> = ref(false);

		const selectorButtonModel: ComputedRef<SelectorButtonModel> = computed(() =>
		{
			return {
				isActive: computed(() => colorPalette.value.id == stores.settingsStore.currentColorPalette.id),
				color: computed(() => colorPalette.value.passwordsColor.primaryColor),
				onClick: onPaletteSelected
			}
		});

		function onPaletteSelected()
		{
			if (!created.value)
			{
				showEditColorPalettePopup.value = true;
				return;
			}

			colorPalette.value.active = true;
			stores.settingsStore.currentColorPalette = colorPalette.value;
		}

		function onEditColorPalettePopupClosed()
		{
			showEditColorPalettePopup.value = false;
		}

		function onEdit()
		{
			showEditColorPalettePopup.value = true;
		}

		watch(() => stores.settingsStore.currentPrimaryColor.value, (newValue, oldValue): void =>
		{
			const previousColor: RGBColor | null = hexToRgb(oldValue);
			const newColor: RGBColor | null = hexToRgb(newValue);

			if (!previousColor || !newColor)
			{
				return;
			}

			const tween = new TWEEN.Tween(previousColor).to(newColor, 1000).onUpdate((object) =>
			{
				const rgb: string = `rgba(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)}, ${object.alpha})`;
				addColorGradient.value = getLinearGradientFromColor(rgb);
			}).start();

			let startColorTransitionTime: number;
			function animate(time)
			{
				if (!startColorTransitionTime)
				{
					startColorTransitionTime = time;
				}

				const elapsedTime = time - startColorTransitionTime;
				if (elapsedTime < 1100)
				{
					tween?.update(time)
					requestAnimationFrame(animate);
				}
			}

			requestAnimationFrame(animate);
		});

		return {
			editButton,
			selectorButtonModel,
			created,
			editable,
			primaryColor,
			valuesColor,
			addColor,
			addColorGradient,
			showEditColorPalettePopup,
			hoveringDisplay,
			hoveringIcon,
			editIconBackgroundColor,
			valueBackgroundColor,
			onPaletteSelected,
			onEditColorPalettePopupClosed,
			onEdit
		}
	}
})
</script>

<style>
.t-enter-active,
.t-leave-active {
	transition: opacity 1s linear;
}

.t-enter-from,
.t-leave-to {
	opacity: 0;
}

.colorPaletteOuterContainer {
	position: relative;
	height: 100%;
	width: 100%;
	margin: 10px;
}

.colorPaletteContainer {
	position: relative;
	height: inherit;
	width: inherit;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 20px;
	/* background: linear-gradient(145deg, #121a20, #0f161b);
	box-shadow: 5px 5px 10px #070a0c,
		-5px -5px 10px #1b2630; */
	cursor: pointer;
	transition: 0.3s;
	z-index: 2;
	background: rgb(44 44 51 / 16%);
}

.colorPaletteContainer.hover {
	box-shadow: 0 0 25px v-bind(primaryColor);
}

.colorPaletteContainer.notCreated {
	border-radius: 20px;
	/* background: #11181e;
	box-shadow: inset 5px 5px 10px #070a0c,
		inset -5px -5px 10px #1b2630; */
}

.colorPaletteContainer .selectorButton {
	margin-right: 2vw;
}

.colorPaletteContainer .addColorIconContainer {
	margin-right: clamp(10px, 1.5vw, 30px);
	width: clamp(14px, 1.1vw, 30px);
	aspect-ratio: 1 /1;
	display: flex;
	justify-content: center;
	align-items: center;
	color: white;
	font-size: clamp(14px, 1.1vw, 35px);
	border-radius: 50%;
	background: v-bind(addColorGradient);
	transition: 0.6s;
}

.colorPaletteContainer.hover .addColorIconContainer {
	box-shadow: 0 0 25px v-bind(addColor);
}

.colorPaletteContainer .colorPaletteColorContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-right: 10px;
}

.colorPaletteContainer .passwordColor {
	background: v-bind(editIconBackgroundColor);
	width: clamp(12px, 1.2vw, 30px);
	aspect-ratio: 1/ 1;
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.colorPaletteContainer .valuesColor {
	background: v-bind(valueBackgroundColor);
	width: clamp(12px, 1.2vw, 30px);
	aspect-ratio: 1/ 1;
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
}

.colorPaletteOuterContainer .slideOutButtonContainer {
	width: 60%;
	height: inherit;
	position: absolute;
	right: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.3s;
	z-index: 1;
}

.colorPaletteOuterContainer.editable:hover .slideOutButtonContainer {
	transform: translateX(100%);
}

.colorPaletteOuterContainer.editable:hover .editButton {
	transform: translateY(-50%);
	opacity: 1;
	transition-delay: 0.1s;
}

.colorPaletteOuterContainer .editButton {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	justify-content: center;
	align-items: center;
	background: v-bind(editIconBackgroundColor);
	border-radius: 50%;
	transition: 0.3s;
	padding: 10%;
	opacity: 0;
	z-index: 1;
	height: clamp(5px, 1vw, 25px);
	width: clamp(5px, 1vw, 25px);
}

.colorPaletteOuterContainer .editButton .editIcon {
	color: white;
	font-size: clamp(14px, 1.1vw, 25px);
}

.colorPaletteOuterContainer .editButton:hover {
	box-shadow: 0 0 25px v-bind(primaryColor);
}
</style>
