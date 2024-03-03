<template>
	<div class="authPopupContainer">
		<div class="authenticationPopup"
			:class="{ unlocked: unlocked, unlockFailed: unlockFailed, rubberband: rubberbandOnUnlock }">
			<div class="authenticationPopupContent">
				<div class="title">{{ authTitle }}</div>
				<EncryptedInputField ref="encryptedInputField" class="key" :label="'Key'" :colorModel="colorModel"
					v-model="key" :required="true" :width="'75%'" />
				<div class="keyRequirements" v-if="needsToSetupKey">
					<CheckboxInputField class="greaterThanTwentyCharacters" :label="'At Least 20 Characters'"
						:color="primaryColor" v-model="greaterThanTwentyCharacters" :fadeIn="true" :width="'100%'"
						:height="'auto'" :disabled="true" />
					<CheckboxInputField class="containsUpperAndLowerCaseLetters"
						:label="'Contains an Upper and Lower Case Letter'" :color="primaryColor"
						v-model="containesUpperAndLowerCase" :fadeIn="true" :width="'100%'" :height="'auto'"
						:disabled="true" />
					<CheckboxInputField class="containsNumber" :label="'Contains a Number'" :color="primaryColor"
						v-model="hasNumber" :fadeIn="true" :width="'100%'" :height="'auto'" :disabled="true" />
					<CheckboxInputField class="containsSpecialCharacter" :label="'Contains a Special Character'"
						:color="primaryColor" v-model="hasSpecialCharacter" :fadeIn="true" :width="'100%'" :height="'auto'"
						:disabled="true" />
				</div>
				<!-- <div class="helpCreateStrongKey">
                </div> -->
				<EncryptedInputField v-if="needsToSetupKey" ref="confirmEncryptedInputField" :label="'Confirm Key'"
					:colorModel="colorModel" v-model="reEnterKey" :width="'75%'" />
				<CheckboxInputField v-if="needsToSetupKey" class="matchesKey" :label="'Matches Key'" :color="primaryColor"
					v-model="matchesKey" :fadeIn="true" :width="'100%'" :height="'auto'" :disabled="true" />
			</div>
			<Transition name="fade">
				<!-- TODO: Move this down when setting up key -->
				<LoadingIndicator v-if="disabled && !unlocked" :color="primaryColor" />
			</Transition>
			<div class="authenticationPopupButtons">
				<PopupButton :color="color" :text="'Enter'" :disabled="disabled" :width="'100px'" :height="'35px'"
					:fontSize="'20px'" @onClick="onEnter"></PopupButton>
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
import { computed, ComputedRef, defineComponent, onMounted, onUnmounted, Ref, ref, watch } from 'vue';

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
	props: ["title", "allowCancel", "rubberbandOnUnlock", "showPulsing", "setupKey", "color", "beforeEntry", "focusOnShow"],
	setup(props, ctx)
	{
		const encryptedInputField: Ref<null> = ref(null);
		const confirmEncryptedInputField: Ref<null> = ref(null);
		const loadingIndicator: Ref<null> = ref(null);

		const key: Ref<string> = ref("");
		const reEnterKey: Ref<string> = ref("");
		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.settingsStore.currentColorPalette);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const authTitle: ComputedRef<string> = computed(() => props.title ? props.title : "Please enter your Key");
		const unlocked: Ref<boolean> = ref(false);
		const unlockFailed: Ref<boolean> = ref(false);
		const unlockAnimDelay: Ref<string> = ref(props.rubberbandOnUnlock ? '0.7s' : '0s');
		const startPulsing: Ref<boolean> = ref(false);
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(primaryColor.value));
		const disabled: Ref<boolean> = ref(false);

		const needsToSetupKey: ComputedRef<boolean> = computed(() => props.setupKey ?? false);
		const computedWidth: ComputedRef<string> = computed(() => props.setupKey ? "25%" : "15%");
		const computedHeight: ComputedRef<string> = computed(() => props.setupKey ? "35%" : "25%");
		const buttonBottom: ComputedRef<string> = computed(() => props.setupKey ? "5%" : "10%");
		const contentTop: ComputedRef<string> = computed(() => props.setupKey ? "10%" : "20%");

		const greaterThanTwentyCharacters: Ref<boolean> = ref(false);
		const containesUpperAndLowerCase: Ref<boolean> = ref(false);
		const hasNumber: Ref<boolean> = ref(false);
		const hasSpecialCharacter: Ref<boolean> = ref(false);
		const matchesKey: Ref<boolean> = ref(false);

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

			if (needsToSetupKey.value && (!greaterThanTwentyCharacters.value ||
				!containesUpperAndLowerCase.value ||
				!hasNumber.value ||
				!hasSpecialCharacter.value))
			{
				disabled.value = false;
				jiggleContainer();
				return;
			}

			if (props.beforeEntry === true)
			{
				stores.checkKeyBeforeEntry(key.value).then((isValid: boolean) =>
				{
					handleKeyIsValid(isValid);
				});
			}
			else
			{
				handleKeyIsValid(stores.checkKeyAfterEntry(key.value));
			}
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

		function onkeyUp(e: KeyboardEvent)
		{
			if (e.key === 'Enter')
			{
				e.stopPropagation();
				onEnter();
			}
		}

		function jiggleContainer()
		{
			unlockFailed.value = true;
			setTimeout(() => unlockFailed.value = false, 1000);
		}

		function enforceStringKey(key: string): [boolean, string]
		{
			const [valueIsWeak, isWeakMessage] = window.api.helpers.validation.isWeak(key, "Key");
			return [!valueIsWeak, isWeakMessage];
		}

		function enforceKeysMatch(confirmKey: string)
		{
			return [confirmKey == key.value, "Keys do not match"];
		}

		watch(() => key.value, (newValue) =>
		{
			if (!needsToSetupKey.value)
			{
				return;
			}

			greaterThanTwentyCharacters.value = newValue.length >= 20;
			containesUpperAndLowerCase.value = window.api.helpers.validation.containsUppercaseAndLowercaseNumber(newValue);
			hasNumber.value = window.api.helpers.validation.containsNumber(newValue);
			hasSpecialCharacter.value = window.api.helpers.validation.containsSpecialCharacter(newValue);
		});

		watch(() => reEnterKey.value, (newValue) =>
		{
			if (!greaterThanTwentyCharacters.value ||
				!containesUpperAndLowerCase.value ||
				!hasNumber.value ||
				!hasSpecialCharacter.value)
			{
				return;
			}

			matchesKey.value = newValue == key.value;
		});

		onMounted(() =>
		{
			setTimeout(() => startPulsing.value = true, 5000);
			window.addEventListener("keyup", onkeyUp);

			if (props.focusOnShow == true && encryptedInputField.value)
			{
				// @ts-ignore
				encryptedInputField.value.focus();
			}
		});

		onUnmounted(() =>
		{
			window.removeEventListener("keyup", onkeyUp);
		});

		return {
			loadingIndicator,
			encryptedInputField,
			confirmEncryptedInputField,
			key,
			reEnterKey,
			authTitle,
			currentColorPalette,
			unlocked,
			unlockFailed,
			unlockAnimDelay,
			startPulsing,
			primaryColor,
			greaterThanTwentyCharacters,
			containesUpperAndLowerCase,
			matchesKey,
			hasNumber,
			hasSpecialCharacter,
			needsToSetupKey,
			computedWidth,
			computedHeight,
			buttonBottom,
			contentTop,
			colorModel,
			disabled,
			onEnter,
			onCancel,
			enforceStringKey,
			enforceKeysMatch,
			playUnlockAnimation
		}
	}
})
</script>

<style>
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

@keyframes hide {
	0% {
		opacity: 1;
	}

	100% {
		opacity: 0;
	}
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
	width: 75%;
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
	width: 10%;
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

.authenticationPopupContent .key {
	margin-top: 5%;
}

.authenticationPopupContent .lockIcon {
	color: grey;
	font-size: 80px;
	margin-top: 10%;

}

.authenticationPopupContent .matchesKey {
	margin-top: 2.5%;
}

.authenticationPopupContent .keyRequirements {
	display: grid;
	width: 80%;
	row-gap: 5px;
	margin-left: 10%;
	margin-top: 2.5%;
	margin-bottom: 5%;
}

.authenticationPopupContent .keyRequirements .greaterThanTwentyCharacters {
	grid-column: 1;
	grid-row: 1;
}

.authenticationPopupContent .keyRequirements .containsUpperAndLowerCaseLetters {
	grid-column: 1;
	grid-row: 2;
}

.authenticationPopupContent .keyRequirements .containsNumber {
	grid-column: 1;
	grid-row: 3;
}

.authenticationPopupContent .keyRequirements .containsSpecialCharacter {
	grid-column: 1;
	grid-row: 4;
}

.authenticationPopupContent .matchesKey {
	width: 80%;
	margin-left: 10%;
}
</style>
