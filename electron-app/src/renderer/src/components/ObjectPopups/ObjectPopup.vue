<template>
	<div class="objectPopupContainer">
		<div class="objectPopupGlass" @click.stop="closePopup">
		</div>
		<div ref="objectPopup" class="objectyPopup">
			<div v-if="!doPreventClose" class="closeIconContainer" @click.stop="closePopup">
				<ion-icon class="closeIcon" name="close-circle-outline"></ion-icon>
			</div>
			<div class="objectyPopupContent">
				<slot></slot>
			</div>
		</div>
		<div v-if="showPulsing" class="pulsingCircles">
			<div class="circle circleOne">
			</div>
			<div class="circle circleTwo">
			</div>
			<div class="circle circleThree">
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, provide, watch, Ref, ref, onMounted } from 'vue';

import { DataType } from '../../Types/Table';
import { ClosePopupFuncctionKey } from '../../Types/Keys';
import * as TWEEN from '@tweenjs/tween.js'
import { RGBColor } from '@renderer/Types/Colors';
import { hexToRgb } from '@renderer/Helpers/ColorHelper';
import { hideAll } from 'tippy.js';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "ObjectPopup",
	props: ["show", "closePopup", "height", "width", 'minHeight', 'minWidth', 'preventClose', 'glassOpacity', "showPulsing"],
	setup(props)
	{
		const objectPopup: Ref<HTMLElement | null> = ref(null);
		const resizeObserver: ResizeObserver = new ResizeObserver(() => checkWidthToHeightRatio());

		const showPopup: ComputedRef<boolean> = computed(() => props.show);

		const computedHeight: ComputedRef<string> = computed(() => props.height ? props.height : '80%');
		const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : '70%');

		const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ? props.minHeight : '0px');
		const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ? props.minWidth : '0px');

		const computedBeforeHeight: Ref<string> = ref(props.height);
		const computedBeforeWidth: Ref<string> = ref(props.width);

		const pulsingWidth: Ref<string> = ref(props.width);

		const computedGlassOpacity: ComputedRef<number> = computed(() => props.glassOpacity ? props.glassOpacity : 0.92);
		const doPreventClose: ComputedRef<boolean> = computed(() => props.preventClose === true);

		const closePopupFunc: ComputedRef<(saved: boolean) => void> = computed(() => props.closePopup);
		provide(ClosePopupFuncctionKey, closePopupFunc);

		const previousPrimaryColor: Ref<string> = ref('');
		const primaryColor: Ref<string> = ref('');

		const previousSecondaryColorOne: Ref<string> = ref('');
		const secondaryColorOne: Ref<string> = ref('');

		const previousSecondaryColorTwo: Ref<string> = ref('');
		const secondaryColorTwo: Ref<string> = ref('');

		function transitionColors()
		{
			let startColorTransitionTime: number;

			let currentPrimaryColor: string = '';
			let currentSecondaryColorOne: string = '';
			let currentSecondaryColorTwo: string = '';

			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				currentPrimaryColor = stores.settingsStore.currentColorPalette.passwordsColor.primaryColor;
				currentSecondaryColorOne = stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorOne;
				currentSecondaryColorTwo = stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorTwo;
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				currentPrimaryColor = stores.settingsStore.currentColorPalette.valuesColor.primaryColor;
				currentSecondaryColorOne = stores.settingsStore.currentColorPalette.valuesColor.secondaryColorOne;
				currentSecondaryColorTwo = stores.settingsStore.currentColorPalette.valuesColor.secondaryColorTwo;
			}

			let primaryColorTween = getColorTween(previousPrimaryColor.value, currentPrimaryColor, primaryColor)
			let secondaryColorOneTween = getColorTween(previousSecondaryColorOne.value, currentSecondaryColorOne, secondaryColorOne);
			let secondaryColorTwoTween = getColorTween(previousSecondaryColorTwo.value, currentSecondaryColorTwo, secondaryColorTwo);

			function animate(time)
			{
				if (!startColorTransitionTime)
				{
					startColorTransitionTime = time;
				}

				const elapsedTime = time - startColorTransitionTime;
				if (elapsedTime < 1100)
				{
					primaryColorTween?.update(time)
					secondaryColorOneTween?.update(time);
					secondaryColorTwoTween?.update(time);

					requestAnimationFrame(animate);
				}
			}

			requestAnimationFrame(animate);

			previousPrimaryColor.value = currentPrimaryColor;
			previousSecondaryColorOne.value = currentSecondaryColorOne;
			previousSecondaryColorTwo.value = currentSecondaryColorTwo;
		}

		function getColorTween(prevHex: string, newHex: string, localColorVariable: Ref<string>)
		{
			const previousColor: RGBColor | null = hexToRgb(prevHex);
			const newColor: RGBColor | null = hexToRgb(newHex);

			if (!previousColor || !newColor)
			{
				return null;
			}

			return new TWEEN.Tween(previousColor).to(newColor, 1000).onUpdate((object) =>
			{
				localColorVariable.value = `rgb(${Math.round(object.r)}, ${Math.round(object.g)}, ${Math.round(object.b)})`;
			}).start();
		}

		function closePopup()
		{
			if (doPreventClose.value)
			{
				return;
			}

			hideAll();
			closePopupFunc.value(false);
		}

		function checkWidthToHeightRatio()
		{
			const info = objectPopup.value?.getBoundingClientRect();
			if (!info)
			{
				return;
			}

			if (info.height > info.width)
			{
				pulsingWidth.value = `${info.height}px`;
				computedBeforeHeight.value = `${info.height * ((info.height / info.width) + 1)}px`;
				computedBeforeWidth.value = `${info.width * ((info.height / info.width) + 1)}px`;
			}
			else
			{
				pulsingWidth.value = `${info.width}px`;
				computedBeforeHeight.value = `${info.height * ((info.width / info.height) + 1)}px`;
				computedBeforeWidth.value = `${info.width * ((info.width / info.height) + 1)}px`;
			}
		}

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
			transitionColors();
		});

		onMounted(() =>
		{
			if (objectPopup.value)
			{
				resizeObserver.observe(objectPopup.value);
				checkWidthToHeightRatio();
			}

			previousPrimaryColor.value = stores.settingsStore.currentPrimaryColor.value;
			primaryColor.value = stores.settingsStore.currentPrimaryColor.value;

			if (stores.appStore.activePasswordValuesTable == DataType.Passwords)
			{
				previousSecondaryColorOne.value = stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorOne;
				secondaryColorOne.value = stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorOne;

				previousSecondaryColorTwo.value = stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorTwo;
				secondaryColorTwo.value = stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorTwo;
			}
			else if (stores.appStore.activePasswordValuesTable == DataType.NameValuePairs)
			{
				previousSecondaryColorOne.value = stores.settingsStore.currentColorPalette.valuesColor.secondaryColorOne;
				secondaryColorOne.value = stores.settingsStore.currentColorPalette.valuesColor.secondaryColorOne;

				previousSecondaryColorTwo.value = stores.settingsStore.currentColorPalette.valuesColor.secondaryColorTwo;
				secondaryColorTwo.value = stores.settingsStore.currentColorPalette.valuesColor.secondaryColorTwo;
			}

			transitionColors();
		});

		return {
			objectPopup,
			primaryColor,
			secondaryColorOne,
			secondaryColorTwo,
			showPopup,
			computedHeight,
			computedWidth,
			computedGlassOpacity,
			doPreventClose,
			computedBeforeHeight,
			computedBeforeWidth,
			computedMinHeight,
			computedMinWidth,
			pulsingWidth,
			closePopup,
		};
	}
})
</script>

<style scoped>
.objectPopupContainer {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 7;
	top: 0;
	left: 0;
}

.objectPopupGlass {
	position: absolute;
	width: 105%;
	height: 105%;
	z-index: 5;
	top: 0;
	left: -3%;
	background: rgba(17, 15, 15, v-bind(computedGlassOpacity));
}

.objectyPopup {
	height: v-bind(computedHeight);
	width: v-bind(computedWidth);
	min-height: v-bind(computedMinHeight);
	min-width: v-bind(computedMinWidth);
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	aspect-ratio: 1.3 / 1.5;
	background: var(--app-color);
	border-radius: 0.5rem;
	position: fixed;
	margin: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	overflow: hidden;
	z-index: 7;
	transition: 0.3s;
}

.objectyPopup::before {
	content: "";
	position: absolute;
	height: v-bind(computedBeforeHeight);
	width: v-bind(computedBeforeWidth);
	border-radius: inherit;
	background-image: linear-gradient(0,
			v-bind(primaryColor),
			v-bind(secondaryColorOne),
			v-bind(secondaryColorTwo));
	animation: rotate 3s linear infinite;
	z-index: 7;
	transition: 0.3s;
}

.objectyPopup .closeIconContainer {
	position: absolute;
	top: 3%;
	right: 3%;
	transition: 0.3s;
	z-index: 9;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: pointer;
}

.objectyPopup .closeIconContainer:hover {
	transform: scale(1.05);
}

.objectyPopup .closeIconContainer .closeIcon {
	transition: 0.3s;
	color: white;
	font-size: 40px;
}

.objectyPopup .closeIconContainer:hover .closeIcon {
	color: v-bind(primaryColor);
}

.objectyPopup .objectyPopupContent {
	position: absolute;
	inset: 5px;
	background: var(--app-color);
	border-radius: 16px;
	z-index: 8;
}

.pulsingCircles {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: v-bind(pulsingWidth);
	max-width: 80%;
	max-height: 80%;
	aspect-ratio: 1 / 1;
	z-index: 6;
	transition: 0.3s;
}

.pulsingCircles.unlocked {
	opacity: 0;
}

.pulsingCircles .circle {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 20%;
	aspect-ratio: 1 / 1;
	border-radius: 50%;
	background-color: v-bind(primaryColor);
	animation: growAndFade 6s infinite ease-out;
}

.pulsingCircles .circle.circleOne {
	animation-delay: 0s;
}

.pulsingCircles .circle.circleTwo {
	animation-delay: 2s;
}

.pulsingCircles .circle.circleThree {
	animation-delay: 4s;
}
</style>
