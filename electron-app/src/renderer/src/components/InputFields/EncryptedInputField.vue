<template>
	<div class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
		<div class="textInuptContainer">
			<input tabindex="0" ref="input" required="false" class="textInputFieldInput" :type="inputType" name="text"
				autocomplete="off" :value="inputText" @input="onInput(($event.target as HTMLInputElement).value)"
				:disabled="isDisabled" :maxlength="200" />
			<label class="textInputFieldLable">{{ label }}</label>
			<label class="validationMessage" :class="{ show: invalid }">{{ invalidMessage }}</label>
			<div class="icons">
				<div v-if="isLocked && showUnlock">
					<ion-icon class="encryptedInputIcon" name="lock-open-outline" @click="unlock"></ion-icon>
				</div>
				<div v-if="!isLocked" class="unlockedIcons">
					<ion-icon class="encryptedInputIcon" v-if="isHidden" name="eye-outline"
						@click="toggleHidden(false)"></ion-icon>
					<ion-icon class="encryptedInputIcon" v-else name="eye-off-outline"
						@click="toggleHidden(true)"></ion-icon>
					<ion-icon class="encryptedInputIcon" v-if="showCopy" name="clipboard-outline"
						@click="copyValue"></ion-icon>
				</div>
			</div>
			<div v-if="!isLocked && !disabled && showRandom" class="randomize" @click="generateRandomValue">
				<a>
					<span>Random</span>
				</a>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, ref, watch } from 'vue';

import { DecryptFunctionsKey, RequestAuthorizationKey, ShowToastFunctionKey, ValidationFunctionsKey } from '../../Types/Keys';
import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import cryptUtility from '../../Utilities/CryptUtility';
import { stores } from '../../Objects/Stores';
import clipboard from 'clipboardy';

export default defineComponent({
	name: "EncryptedInputField",
	emits: ["update:modelValue", "onDirty"],
	props: ["modelValue", "label", "color", "fadeIn", "disabled", "initialLength", "isInitiallyEncrypted",
		"showRandom", "showUnlock", "showCopy", "additionalValidationFunction", "required", "width"],
	setup(props, ctx)
	{
		const input: Ref<HTMLElement | null> = ref(null);
		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		const decryptFunctions: Ref<{ (key: string): void }[]> | undefined = inject(DecryptFunctionsKey, ref([]));
		const requestAuthorization: Ref<boolean> = inject(RequestAuthorizationKey, ref(false));

		const height: ComputedRef<string> = computed(() => props.showRandom ? "100px" : "50px");
		const computedWidth: ComputedRef<string> = computed(() => props.width ? props.width : "200px");

		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		let invalid: Ref<boolean> = ref(false);
		const invalidMessage: Ref<string> = ref('');
		let inputType: Ref<string> = ref("password");
		let isHidden: Ref<boolean> = ref(true);

		let isDisabled: Ref<boolean> = ref(props.isInitiallyEncrypted || props.disabled);
		let isLocked: Ref<boolean> = ref(props.isInitiallyEncrypted);

		let inputText: Ref<string> = ref(props.initialLength > 0 ? "*".repeat(props.initialLength) : props.modelValue);

		const showToastFunction: { (toastText: string, success: boolean): void } = inject(ShowToastFunctionKey, () => { });

		const additionalValidationFunction: Ref<{ (input: string): [boolean, string] }> = ref(props.additionalValidationFunction);

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

			invalid.value = false;
			return true;
		}

		function onAuthenticationSuccessful(key: string)
		{
			inputText.value = cryptUtility.decrypt(key, props.modelValue);
			isLocked.value = false;
			isDisabled.value = false;
		}

		function onInput(value: string)
		{
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

		function generateRandomValue()
		{
			let validRandomPassword: boolean = false;
			let validPasswordTest = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
			let randomPassword: string = "";

			const possibleCharacters: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+\\-=[\\]{};':\"\\|,.<>/?"
			const possibleCharactersLength: number = possibleCharacters.length;

			while (!validRandomPassword)
			{
				randomPassword = "";

				let randomValues: Uint8Array = new Uint8Array(stores.settingsStore.randomValueLength);
				crypto.getRandomValues(randomValues);

				randomValues.forEach(v => randomPassword += possibleCharacters[v % possibleCharactersLength]);
				validRandomPassword = validPasswordTest.test(randomPassword);
			}

			onInput(randomPassword);
		}

		function copyValue()
		{
			clipboard.write(inputText.value);
			showToastFunction("Copied to Clipboard", true);
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
			invalid.value = true;
			invalidMessage.value = message;
		}

		onMounted(() =>
		{
			validationFunction?.value.push(validate);
			decryptFunctions?.value.push(onAuthenticationSuccessful);
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
			invalid,
			invalidMessage,
			defaultInputColor,
			defaultInputTextColor,
			height,
			computedWidth,
			onAuthenticationSuccessful,
			onInput,
			unlock,
			toggleHidden,
			generateRandomValue,
			copyValue,
			focus,
			validate
		}
	}
})
</script>

<style scoped>
.textInputFieldContainer {
	position: relative;
	height: v-bind(height);
	width: v-bind(computedWidth);
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
	width: inherit;
	height: 50px;
	left: 0;
	border: solid 1.5px v-bind(defaultInputColor);
	color: white;
	border-radius: 1rem;
	background: none;
	font-size: 1rem;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.textInputFieldContainer .textInputFieldLable {
	position: absolute;
	left: 5%;
	top: 0;
	color: v-bind(defaultInputTextColor);
	pointer-events: none;
	transform: translateY(1rem);
	transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.textInputFieldContainer .textInputFieldInput:focus,
.textInputFieldContainer .textInputFieldInput:valid,
.textInputFieldContainer .textInputFieldInput:disabled {
	outline: none;
	border: 1.5px solid v-bind(color);
}

.textInputFieldContainer .textInputFieldInput:focus~label:not(.validationMessage),
.textInputFieldContainer .textInputFieldInput:valid~label:not(.validationMessage),
.textInputFieldContainer .textInputFieldInput:disabled~label:not(.validationMessage) {
	transform: translateY(-80%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind(color);
}

.textInputFieldContainer .icons {
	position: absolute;
	width: 50px;
	height: 50px;
	top: 0;
	right: -10px;
	display: flex;
	justify-content: flex-start;
	align-items: center;
	transform: translateX(100%);
}

.textInputFieldContainer .icons .unlockedIcons {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 5px;
}

.textInputFieldContainer .randomize {
	position: absolute;
	top: 100%;
	left: 0;
	margin-top: 10px;
	margin-left: 5px;
	border: solid 1.5px v-bind(defaultInputColor);
	border-radius: 0.5rem;
	padding: 5px 10px 5px 10px;
	transition: 0.2s;
	cursor: pointer;
}

.textInputFieldContainer .randomize:hover {
	border: solid 1.5px v-bind(color);
	transform: scale(1.05);
}

.textInputFieldContainer .randomize span {
	transition: 0.2s;
	color: white;
	font-size: 13px;
}


.textInputFieldContainer .randomize:hover span {
	color: v-bind(color);
}

.encryptedInputIcon {
	color: white;
	font-size: 24px;
	transition: 0.3s;
}

.encryptedInputIcon:hover {
	color: v-bind(color);
	transform: scale(1.05);
}

.validationMessage {
	color: red;
	opacity: 0;
	position: absolute;
	width: 100%;
	height: 25%;
	bottom: 0;
	left: 5%;
	text-align: left;
	transform: translateY(150%);
	transition: 0.3s;
}

.validationMessage.show {
	opacity: 1;
}
</style>
