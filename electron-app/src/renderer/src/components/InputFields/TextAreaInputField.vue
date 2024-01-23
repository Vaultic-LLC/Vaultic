<template>
	<div class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
		<textarea required="false" class="textInputFieldInput" name="text" autocomplete="off" :value="modelValue"
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" :disabled="disabled"
			:maxlength="600" />
		<label class="textInputFieldLable">{{ label }}</label>
		<label class="validationMessage" :class="{ show: invalid }">Please enter a value</label>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, ref } from 'vue';

import { ValidationFunctionsKey } from '../../Types/Keys';
import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"

export default defineComponent({
	name: "TextAreaInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", "height"],
	setup(props)
	{
		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		let invalid: Ref<boolean> = ref(false);

		const textAreaWidth: ComputedRef<string> = computed(() => (props.width ?? 400) + "px");
		const textAreaHeight: ComputedRef<string> = computed(() => (props.height ?? 200) + "px")

		function validate(): boolean
		{
			if (!props.modelValue)
			{
				invalid.value = true;
				return false;
			}

			invalid.value = false;
			return true;
		}

		onMounted(() => validationFunction?.value.push(validate));

		return {
			shouldFadeIn,
			invalid,
			defaultInputColor,
			defaultInputTextColor,
			textAreaWidth,
			textAreaHeight
		}
	}
})
</script>

<style scoped>
.textInputFieldContainer {
	position: relative;
	height: v-bind(textAreaHeight);
	width: v-bind(textAreaWidth);
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

.textInputFieldContainer .textInputFieldInput {
	position: absolute;
	width: inherit;
	height: inherit;
	left: 0;
	border: solid 1.5px v-bind(defaultInputColor);
	color: white;
	border-radius: 1rem;
	background: none;
	font-size: 1rem;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
	resize: none;
}

.textInputFieldContainer .textInputFieldLable {
	position: absolute;
	left: 10px;
	top: 0;
	color: v-bind(defaultInputTextColor);
	pointer-events: none;
	transform: translateY(1rem);
	transition: var(--input-label-transition);
}

.textInputFieldContainer .textInputFieldInput:focus,
.textInputFieldContainer .textInputFieldInput:valid {
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
	left: 0px;
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
}

.validationMessage.show {
	opacity: 1;
}
</style>
