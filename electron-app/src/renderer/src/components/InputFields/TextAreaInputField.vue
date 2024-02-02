<template>
	<div class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
		<textarea required="false" class="textInputFieldInput" name="text" autocomplete="off" :value="modelValue"
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" :disabled="disabled"
			:maxlength="600" />
		<label class="textInputFieldLable">{{ label }}</label>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { InputColorModel } from '@renderer/Types/Models';

export default defineComponent({

	name: "TextAreaInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "label", "colorModel", "fadeIn", "disabled", "width", "height"],
	setup(props)
	{
		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		const colorModel: ComputedRef<InputColorModel> = computed(() => props.colorModel);
		let invalid: Ref<boolean> = ref(false);

		const textAreaWidth: ComputedRef<string> = computed(() => (props.width ?? 400) + "px");
		const textAreaHeight: ComputedRef<string> = computed(() => (props.height ?? 200) + "px")

		return {
			shouldFadeIn,
			invalid,
			defaultInputColor,
			defaultInputTextColor,
			textAreaWidth,
			textAreaHeight,
			colorModel
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
	border: solid 1.5px v-bind('colorModel.borderColor');
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
	color: v-bind('colorModel.textColor');
	pointer-events: none;
	transform: translateY(1rem);
	transition: var(--input-label-transition);
}

.textInputFieldContainer .textInputFieldInput:focus,
.textInputFieldContainer .textInputFieldInput:valid {
	outline: none;
	border: 1.5px solid v-bind('colorModel.activeBorderColor');
}

.textInputFieldContainer .textInputFieldInput:focus~label,
.textInputFieldContainer .textInputFieldInput:valid~label,
.textInputFieldContainer .textInputFieldInput:disabled~label {
	transform: translateY(-80%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind('colorModel.activeTextColor');
	left: 0px;
}
</style>
