<template>
	<div class="objectPopupContainer">
		<div class="objectPopupGlass" @click.stop="closePopupFunc(false)">
		</div>
		<div class="objectyPopup">
			<div class="closeIconContainer" @click.stop="closePopupFunc(false)">
				<ion-icon class="closeIcon" name="close-circle-outline"></ion-icon>
			</div>
			<div class="objectyPopupContent">
				<slot></slot>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, provide } from 'vue';

import { DataType } from '../../Types/Table';
import { ClosePopupFuncctionKey } from '../../Types/Keys';
import { stores } from '../../Objects/Stores';

export default defineComponent({
	name: "ObjectPopup",
	props: ["show", "closePopup"],
	setup(props)
	{
		const showPopup: ComputedRef<boolean> = computed(() => props.show);

		const closePopupFunc: ComputedRef<(saved: boolean) => void> = computed(() => props.closePopup);
		provide(ClosePopupFuncctionKey, closePopupFunc);

		const primaryColor: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					return stores.settingsStore.currentColorPalette.valuesColor.primaryColor;
				case DataType.Passwords:
				default:
					return stores.settingsStore.currentColorPalette.passwordsColor.primaryColor;
			}
		});

		const secondaryColorOne: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					return stores.settingsStore.currentColorPalette.valuesColor.secondaryColorOne;
				case DataType.Passwords:
				default:
					return stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorOne;
			}
		});

		const secondaryColorTwo: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					return stores.settingsStore.currentColorPalette.valuesColor.secondaryColorTwo;
				case DataType.Passwords:
				default:
					return stores.settingsStore.currentColorPalette.passwordsColor.secondaryColorTwo;
			}
		});

		return {
			primaryColor,
			secondaryColorOne,
			secondaryColorTwo,
			closePopupFunc,
			showPopup
		};
	}
})
</script>

<style>
.objectPopupContainer {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 6;
	top: 0;
	left: 0;
}

.objectPopupGlass {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 6;
	top: 0;
	left: 0;
	background: rgba(17, 15, 15, 0.92);
}

.objectyPopup {
	height: 80%;
	width: 70%;
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
	z-index: 6;
	transition: 0.3s;
}

.objectyPopup::before {
	content: "";
	position: absolute;
	width: 200%;
	height: 200%;
	border-radius: inherit;
	background-image: linear-gradient(0,
			v-bind(primaryColor),
			v-bind(secondaryColorOne),
			v-bind(secondaryColorTwo));
	animation: rotate 5s linear infinite;
	z-index: 6;
	transition: 0.3s;
}

.objectyPopup::after {
	content: "";
	position: absolute;
	width: 200%;
	height: 200%;
	border-radius: inherit;
	background-image: linear-gradient(0,
			v-bind(primaryColor),
			v-bind(secondaryColorOne),
			v-bind(secondaryColorTwo));
	animation: rotate 5s linear infinite;
	animation-delay: -1s;
	z-index: 6;
	transition: 0.3s;
}

.objectyPopup .closeIconContainer {
	position: absolute;
	top: 3%;
	right: 3%;
	transition: 0.3s;
	z-index: 8;
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
	z-index: 7;
}

@keyframes rotate {
	0% {
		transform: rotate(0deg);
	}

	100% {
		transform: rotate(360deg);
	}
}
</style>
