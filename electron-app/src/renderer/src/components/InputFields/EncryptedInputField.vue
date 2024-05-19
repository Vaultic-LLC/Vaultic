<template>
	<div ref="container" class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
		<div class="textInuptContainer">
			<input tabindex="0" ref="input" required="false" class="textInputFieldInput" :type="inputType" name="text"
				autocomplete="off" :value="inputText" @input="onInput(($event.target as HTMLInputElement).value)"
				:disabled="isDisabled" :maxlength="200" />
			<label class="textInputFieldLable">{{ label }}</label>
			<div class="icons">
				<div v-if="isLocked && showUnlock">
					<ion-icon class="encryptedInputIcon" name="lock-open-outline" @click="unlock"></ion-icon>
				</div>
				<div v-if="!isLocked && showButtonsUnderneath != true" class="unlockedIcons">
					<ion-icon class="encryptedInputIcon" v-if="isHidden" name="eye-outline"
						@click="toggleHidden(false)"></ion-icon>
					<ion-icon class="encryptedInputIcon" v-else name="eye-off-outline"
						@click="toggleHidden(true)"></ion-icon>
					<ion-icon class="encryptedInputIcon" v-if="showCopy" name="clipboard-outline"
						@click="copyValue"></ion-icon>
				</div>
			</div>
			<Transition name="fade">
				<div v-if="!isLocked && !disabled && showRandom" class="randomize" @click="generateRandomValue">
					Random
				</div>
			</Transition>
			<div v-if="!isLocked && showButtonsUnderneath == true"
				class="encryptedInputContainer__unlockIconsUnderneath">
				<ion-icon class="encryptedInputIcon" v-if="isHidden" name="eye-outline"
					@click="toggleHidden(false)"></ion-icon>
				<ion-icon class="encryptedInputIcon" v-else name="eye-off-outline"
					@click="toggleHidden(true)"></ion-icon>
				<ion-icon class="encryptedInputIcon" v-if="showCopy" name="clipboard-outline"
					@click="copyValue"></ion-icon>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch } from 'vue';

import { DecryptFunctionsKey, RequestAuthorizationKey, ValidationFunctionsKey } from '../../Types/Keys';
import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import clipboard from 'clipboardy';
import { appHexColor, widgetInputLabelBackgroundHexColor } from '@renderer/Constants/Colors';
import tippy from 'tippy.js';
import { InputColorModel } from '@renderer/Types/Models';
import { stores } from '@renderer/Objects/Stores';
import cryptHelper from '@renderer/Helpers/cryptHelper';
import { defaultHandleFailedResponse } from '@renderer/Helpers/ResponseHelper';

export default defineComponent({
	name: "EncryptedInputField",
	emits: ["update:modelValue", "onDirty"],
	props: ["modelValue", "label", "colorModel", "fadeIn", "disabled", "initialLength", "isInitiallyEncrypted",
		"showRandom", "showUnlock", "showCopy", "additionalValidationFunction", "required", "width", "minWidth", "maxWidth", "height",
		"minHeight", "maxHeight", 'isOnWidget', 'showButtonsUnderneath', 'randomValueType'],
	setup(props, ctx)
	{
		const container: Ref<HTMLElement | null> = ref(null);
		const input: Ref<HTMLElement | null> = ref(null);
		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		const decryptFunctions: Ref<{ (key: string): void }[]> | undefined = inject(DecryptFunctionsKey, ref([]));
		const requestAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));

		const computedHeight: ComputedRef<string> = computed(() => props.height ?? "50px");
		const computedMinHeight: ComputedRef<string> = computed(() => props.minHeight ?? "50px");
		const computedMaxHeight: ComputedRef<string> = computed(() => props.maxHeight ?? "50px");

		const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : "200px");
		const computedMinWidth: ComputedRef<string> = computed(() => props.minWidth ?? "125px");
		const computedMaxWidth: ComputedRef<string> = computed(() => props.maxWidth ?? '200px');
		const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);
		const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		let inputType: Ref<string> = ref("password");
		let isHidden: Ref<boolean> = ref(true);

		let isDisabled: Ref<boolean> = ref(props.isInitiallyEncrypted || props.disabled);
		let isLocked: Ref<boolean> = ref(props.isInitiallyEncrypted);

		let inputText: Ref<string> = ref(props.initialLength > 0 ? "*".repeat(props.initialLength) : props.modelValue);

		const additionalValidationFunction: Ref<{ (input: string): [boolean, string] }> = ref(props.additionalValidationFunction);

		let tippyInstance: any = null;

		function unlock()
		{
			requestAuthorization.value = true;
		}

		function validate(): boolean
		{
			if (!props.modelValue && props.required)
			{
				invalidate("Please enter a value");
				return false;
			}

			if (additionalValidationFunction.value)
			{
				const [valid, invalidMessage] = additionalValidationFunction.value(inputText.value);
				if (!valid)
				{
					invalidate(invalidMessage);
					return false;
				}
			}

			return true;
		}

		async function onAuthenticationSuccessful(key: string)
		{
			const result = await cryptHelper.decrypt(key, props.modelValue);
			if (!result.success)
			{
				return;
			}

			inputText.value = result.value ?? "";
			isLocked.value = false;
			isDisabled.value = false;
		}

		function onInput(value: string)
		{
			tippyInstance.hide();
			inputText.value = value;

			ctx.emit("update:modelValue", value);
			ctx.emit("onDirty");
		}

		function toggleHidden(hide: boolean)
		{
			if (hide)
			{
				isHidden.value = true;
				inputType.value = "password";
			}
			else
			{
				isHidden.value = false;
				inputType.value = "text"
			}
		}

		async function generateRandomValue()
		{
			if (props.randomValueType == 0)
			{
				stores.popupStore.showLoadingIndicator(colorModel.value.color, "Generating Phrase");
				const response = await window.api.server.value.generateRandomPhrase(stores.settingsStore.randomPhraseLength);
				stores.popupStore.hideLoadingIndicator();

				if (response.Success)
				{
					onInput(response.Phrase!);
				}
				else
				{
					defaultHandleFailedResponse(response);
				}

				return;
			}

			onInput(await window.api.utilities.generator.randomPassword(stores.settingsStore.randomValueLength));
		}

		function copyValue()
		{
			clipboard.write(inputText.value);
			stores.popupStore.showToast(colorModel.value.color, "Copied to Clipboard", true);
		}

		function focus()
		{
			if (input.value)
			{
				input.value.focus();
			}
		}

		function invalidate(message: string)
		{
			tippyInstance.setContent(message);
			tippyInstance.show();
		}

		onMounted(() =>
		{
			if (!container.value)
			{
				return;
			}

			validationFunction?.value.push(validate);
			decryptFunctions?.value.push(onAuthenticationSuccessful);

			tippyInstance = tippy(container.value, {
				inertia: true,
				animation: 'scale',
				theme: 'material',
				placement: "bottom-start",
				trigger: 'manual',
				hideOnClick: false
			});
		});

		onUnmounted(() =>
		{
			tippyInstance.hide();
			validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
		});

		watch(() => props.modelValue, (newValue) =>
		{
			inputText.value = newValue;
		})

		return {
			input,
			isDisabled,
			isHidden,
			isLocked,
			inputType,
			inputText,
			shouldFadeIn,
			defaultInputColor,
			defaultInputTextColor,
			computedHeight,
			computedMinHeight,
			computedMaxHeight,
			computedWidth,
			computedMinWidth,
			computedMaxWidth,
			backgroundColor,
			container,
			colorModel,
			onAuthenticationSuccessful,
			onInput,
			unlock,
			toggleHidden,
			generateRandomValue,
			copyValue,
			focus,
			validate,
			invalidate
		}
	}
})
</script>

<style scoped>
.textInputFieldContainer {
	position: relative;
	height: v-bind(computedHeight);
	min-height: v-bind(computedMinHeight);
	max-height: v-bind(computedMaxHeight);
	width: v-bind(computedWidth);
	min-width: v-bind(computedMinWidth);
	max-width: v-bind(computedMaxWidth);
}

.textInputFieldContainer.fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}

@keyframes fadeIn {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.textInputFieldContainer .textInuptContainer {
	position: relative;
	height: 100%;
	width: 100%;
}

.textInputFieldContainer .textInputFieldInput {
	position: absolute;
	width: 100%;
	height: 100%;
	left: 0;
	border: solid 1.5px v-bind('colorModel.borderColor');
	color: white;
	border-radius: var(--responsive-border-radius);
	background: none;
	font-size: clamp(13px, 1.2vh, 25px);
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.textInputFieldContainer .textInputFieldLable {
	position: absolute;
	left: var(--input-label-left);
	top: 50%;
	color: v-bind('colorModel.textColor');
	pointer-events: none;
	transform: translateY(-50%);
	transition: var(--input-label-transition);
	font-size: clamp(11px, 1.2vh, 25px);
	will-change: transform;
}

.textInputFieldContainer .textInputFieldInput:focus,
.textInputFieldContainer .textInputFieldInput:valid,
.textInputFieldContainer .textInputFieldInput:disabled {
	outline: none;
	border: 1.5px solid v-bind('colorModel.activeBorderColor');
}

.textInputFieldContainer .textInputFieldInput:focus~label,
.textInputFieldContainer .textInputFieldInput:valid~label,
.textInputFieldContainer .textInputFieldInput:disabled~label {
	top: 10%;
	transform-origin: left;
	transform: translateY(-80%) scale(0.8);
	background-color: v-bind(backgroundColor);
	padding: 0 .2em;
	color: v-bind('colorModel.activeTextColor');
}

.textInputFieldContainer .icons {
	position: absolute;
	/* width: 50px;
	height: 50px; */
	top: 0;
	right: -10px;
	display: flex;
	justify-content: flex-start;
	align-items: center;
	transform: translate(100%, 50%);
}

.textInputFieldContainer .icons .unlockedIcons {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 5px;
}

.encryptedInputContainer__unlockIconsUnderneath {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 10px;
	margin-left: 5px;
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 5px;
}

.textInputFieldContainer .randomize {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: clamp(7px, 0.3vw, 10px);
	margin-left: clamp(1px, 0.1vw, 5px);
	border: solid 1.5px v-bind('colorModel.borderColor');
	border-radius: min(0.6vw, 0.6rem);
	padding: clamp(2px, 0.4vw, 5px) clamp(5px, 0.4vw, 10px) clamp(2px, 0.4vw, 5px) clamp(5px, 0.4vw, 10px);
	transition: 0.2s;
	cursor: pointer;
	will-change: transform;
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.2s;
	color: white;
	font-size: clamp(7px, 0.7vw, 13px);
}

.textInputFieldContainer .randomize:hover {
	border: solid 1.5px v-bind('colorModel.activeBorderColor');
	transform: scale(1.05);
}

.textInputFieldContainer .randomize:hover {
	color: v-bind('colorModel.activeTextColor');
}

.encryptedInputIcon {
	color: white;
	font-size: clamp(17px, 2vh, 25px);
	transition: 0.3s;
	cursor: pointer;
}

.encryptedInputIcon:hover {
	color: v-bind('colorModel.activeBorderColor');
	transform: scale(1.05);
}
</style>
