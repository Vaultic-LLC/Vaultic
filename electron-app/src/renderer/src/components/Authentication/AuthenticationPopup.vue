<template>
	<div class="authPopupContainer">
		<div ref="authenticationPopup" class="authenticationPopup"
			:class="{ unlocked: unlocked, unlockFailed: unlockFailed, rubberband: rubberbandOnUnlock }">
			<div v-if="iconOnly" class="authenticationPopupIcon">
				<div class="authenticationPopupIcon__circle"></div>
				<div class="authenticationPopupIcon__triangle"></div>
			</div>
			<div v-if="!iconOnly" class="authenticationPopupContent">
				<div class="title">{{ authTitle }}</div>
				<EncryptedInputField ref="encryptedInputField" class="key" :label="'Key'" :colorModel="colorModel"
					v-model="key" :required="true" :width="'75%'" />
			</div>
			<Transition name="fade">
				<LoadingIndicator v-if="disabled && !unlocked" :color="primaryColor" />
			</Transition>
			<div v-if="!iconOnly" class="authenticationPopupButtons">
				<PopupButton :color="color" :text="'Enter'" :disabled="disabled" :width="'100px'" :height="'35px'"
					:fontSize="'20px'" :isSubmit="true" @onClick="onEnter"></PopupButton>
				<PopupButton v-if="allowCancel" :color="color" :text="'Cancel'" :disabled="disabled" :width="'100px'"
					:height="'35px'" :fontSize="'20px'" @onClick="onCancel"></PopupButton>
			</div>
		</div>
		<div v-if="showPulsing" class="pulsingCircles" :class="{ unlocked: unlocked }">
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
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';

import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import LoadingIndicator from '../Loading/LoadingIndicator.vue';
import PopupButton from '../InputFields/PopupButton.vue';

import { ColorPalette } from '../../Types/Colors';
import { defaultInputColorModel, InputColorModel } from '@renderer/Types/Models';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "AuthenticationPopup",
	components:
	{
		EncryptedInputField,
		CheckboxInputField,
		LoadingIndicator,
		PopupButton
	},
	emits: ["onAuthenticationSuccessful", "onCanceled"],
	props: ["title", "allowCancel", "rubberbandOnUnlock", "showPulsing", "color", "beforeEntry",
		"focusOnShow", "iconOnly"],
	setup(props, ctx)
	{
		const authenticationPopup: Ref<HTMLElement | null> = ref(null);
		const resizeObserver: ResizeObserver = new ResizeObserver(() => onResize());

		const encryptedInputField: Ref<null> = ref(null);
		const loadingIndicator: Ref<null> = ref(null);

		const key: Ref<string> = ref("");
		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.currentColorPalette);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const authTitle: ComputedRef<string> = computed(() => props.title ? props.title : "Please enter your Key");
		const unlocked: Ref<boolean> = ref(false);
		const unlockFailed: Ref<boolean> = ref(false);
		const unlockAnimDelay: Ref<string> = ref(props.rubberbandOnUnlock ? '0.7s' : '0s');
		const startPulsing: Ref<boolean> = ref(false);
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(primaryColor.value));
		const disabled: Ref<boolean> = ref(false);

		const computedWidth: ComputedRef<string> = computed(() => props.iconOnly ? "9%" : "15%");
		const computedHeight: ComputedRef<string> = computed(() => props.iconOnly ? "15%" : "25%");
		const buttonBottom: ComputedRef<string> = computed(() => "10%");
		const contentTop: ComputedRef<string> = computed(() => "20%");

		const pulsingWidth: Ref<string> = ref('75%');

		let lastAuthAttempt: number = 0;
		function onEnter()
		{
			if (unlocked.value || disabled.value)
			{
				return;
			}

			disabled.value = true;
			if (Date.now() - lastAuthAttempt < 1000)
			{
				disabled.value = false;
				jiggleContainer();
				return;
			}

			lastAuthAttempt = Date.now();

			stores.appStore.authenticateKey(key.value).then((isValid: boolean) =>
			{
				handleKeyIsValid(isValid);
			});
		}

		function handleKeyIsValid(isValid: boolean)
		{
			if (!isValid)
			{
				disabled.value = false;
				jiggleContainer();
				if (encryptedInputField.value)
				{
					// @ts-ignore
					encryptedInputField.value.focus();
				}
			}
			else
			{
				ctx.emit("onAuthenticationSuccessful", key.value);
			}
		}

		function onCancel()
		{
			ctx.emit("onCanceled");
		}

		function playUnlockAnimation()
		{
			unlocked.value = true;
		}

		function jiggleContainer()
		{
			unlockFailed.value = true;
			setTimeout(() => unlockFailed.value = false, 1000);
		}

		function onResize()
		{
			const info = authenticationPopup.value?.getBoundingClientRect();
			if (!info)
			{
				return;
			}

			if (info.height > info.width)
			{
				pulsingWidth.value = `${info.height}px`;
			}
			else
			{
				pulsingWidth.value = `${info.width}px`;
			}
		}

		onMounted(() =>
		{
			if (authenticationPopup.value)
			{
				resizeObserver.observe(authenticationPopup.value);
			}

			setTimeout(() => startPulsing.value = true, 5000);

			if (props.focusOnShow == true && encryptedInputField.value)
			{
				// @ts-ignore
				encryptedInputField.value.focus();
			}
		});

		return {
			authenticationPopup,
			loadingIndicator,
			encryptedInputField,
			key,
			authTitle,
			currentColorPalette,
			unlocked,
			unlockFailed,
			unlockAnimDelay,
			startPulsing,
			primaryColor,
			computedWidth,
			computedHeight,
			buttonBottom,
			contentTop,
			colorModel,
			disabled,
			pulsingWidth,
			onEnter,
			onCancel,
			playUnlockAnimation
		}
	}
})
</script>

<style scoped>
.authPopupContainer {
	z-index: 100;
}

.authenticationPopup {
	width: v-bind('computedWidth');
	height: v-bind('computedHeight');
	background-color: var(--app-color);
	z-index: 100;
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	border: 2px solid v-bind('primaryColor');
	border-radius: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	transition: 0.3s linear;
}

.authenticationPopup.unlockFailed {
	animation: jiggle 0.5s linear;
}

@keyframes jiggle {
	0% {
		transform: translate(-50%, -50%);
	}

	15% {
		transform: translate(-40%, -50%);
	}

	30% {
		transform: translate(-60%, -50%);
	}

	45% {
		transform: translate(-45%, -50%);
	}

	60% {
		transform: translate(-55%, -50%);
	}

	75% {
		transform: translate(-45%, -50%);
	}

	90% {
		transform: translate(-55%, -50%);
	}

	100% {
		transform: translate(-50%, -50%);
	}
}

.authenticationPopup:before {
	content: "";
	display: block;
	width: 40%;
	height: 50%;
	bottom: 100%;
	position: absolute;
	left: 30%;
	margin-left: -8px;
	border: 3px solid v-bind('primaryColor');
	border-top-right-radius: 40%;
	border-top-left-radius: 40%;
	border-bottom: 0;
	transition: 0.3s linear;
}

.authenticationPopup .authenticationPopupContent {
	position: absolute;
	top: v-bind(contentTop);
	left: 0%;
	width: 100%;
	display: flex;
	justify-content: flex-start;
	align-items: center;
	flex-direction: column;
	/* row-gap: 30px; */
}

.authenticationPopup .authenticationPopupContent .title {
	color: white;
	font-size: 18px;
}

.authenticationPopupButtons {
	position: absolute;
	bottom: v-bind(buttonBottom);
	display: flex;
	align-items: center;
	justify-content: space-between;
	column-gap: 50px;
}

.authenticationPopup.unlocked.rubberband {
	animation: rubberband 0.8s alternate ease-out;
	transform: translate(-50%, -50%);
}

.authenticationPopup.unlocked:before {
	animation: unlock 0.5s v-bind(unlockAnimDelay) linear forwards;
	transform-origin: left;
	border-top-right-radius: 40%;
	border-top-left-radius: 40%;
	border-bottom: 0;
}

@keyframes rubberband {
	0% {
		transform: scale(1) translate(-50%, -50%);
	}

	90% {
		transform: scale(0.9) translate(-55%, -50%);
	}

	100% {
		transform: scale(1) translate(-50%, -50%);
	}
}

@keyframes unlock {
	0% {
		transform: rotateY(0deg);
	}

	100% {
		transform: rotateY(180deg);
	}
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
	z-index: 91;
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
	background-color: v-bind('primaryColor');
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

@keyframes growAndFade {
	0% {
		opacity: .25;
		transform: translate(-50%, -50%) scale(0);
	}

	100% {
		opacity: 0;
		transform: translate(-50%, -50%) scale(8);
	}
}

.authenticationPopupIcon {
	width: 100%;
	height: 100%;
	font-size: 20px;
	color: gray;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
}

.authenticationPopupIcon__circle {
	width: 20%;
	aspect-ratio: 1 /1;
	background: v-bind(color);
	border-radius: 50%;
	margin-bottom: -45px;
}

.authenticationPopupIcon__triangle {
	background: transparent;
	border-left: 25px solid transparent;
	border-right: 25px solid transparent;
	border-bottom: 100px solid v-bind(color);
	width: 0;
	aspect-ratio: 1/ 1;
}
</style>
