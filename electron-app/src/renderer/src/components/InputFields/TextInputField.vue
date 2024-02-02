<template>
	<div ref="container" class="textInputFieldContainer" :class="{ fadeIn: shouldFadeIn }">
		<input required="false" class="textInputFieldInput" type="text" name="text" autocomplete="off" :value="modelValue"
			@input="onInput(($event.target as HTMLInputElement).value)" @keypress="validateType" :disabled="disabled"
			:maxlength="200" />
		<label class="textInputFieldLable">{{ label }}</label>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

import { ValidationFunctionsKey } from '../../Types/Keys';
import { defaultInputColor, defaultInputTextColor } from "../../Types/Colors"
import { appHexColor, widgetInputLabelBackgroundHexColor } from '@renderer/Constants/Colors';
import tippy from 'tippy.js';

export default defineComponent({
	name: "TextInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "label", "color", "fadeIn", "disabled", "width", "inputType", "additionalValidationFunction", "isOnWidget"],
	setup(props, ctx)
	{
		const container: Ref<HTMLElement | null> = ref(null);
		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		const shouldFadeIn: ComputedRef<boolean> = computed(() => props.fadeIn ?? true);
		const computedWidth: ComputedRef<string> = computed(() => props.width ?? "200px");
		const type: ComputedRef<string> = computed(() => props.inputType ? props.inputType : "text");
		const additionalValidationFunction: Ref<{ (input: string): [boolean, string] } | undefined> = ref(props.additionalValidationFunction);
		const labelBackgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

		let tippyInstance: any = null;

		function validate(): boolean
		{
			if (!props.modelValue)
			{
				invalidate("Pleas enter a value");
				return false;
			}

			if (additionalValidationFunction.value)
			{
				const [isVaild, invalidMesage] = additionalValidationFunction.value(props.modelValue);
				if (!isVaild)
				{
					invalidate(invalidMesage);
					return false;
				}
			}

			return true;
		}

		function invalidate(message: string)
		{
			tippyInstance.setContent(message);
			tippyInstance.show();
		}

		function validateType(event: KeyboardEvent)
		{
			if (type.value === "number")
			{
				var charCode = event.key;
				if (!/\d/.test(charCode))
				{
					event.preventDefault();
					return false;
				}
			}

			return true;
		}

		function onInput(value: string)
		{
			tippyInstance.hide();
			ctx.emit("update:modelValue", value);
		}

		onMounted(() =>
		{
			if (!container.value)
			{
				return;
			}

			validationFunction?.value.push(validate);
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

		return {
			shouldFadeIn,
			container,
			defaultInputColor,
			defaultInputTextColor,
			computedWidth,
			type,
			labelBackgroundColor,
			validateType,
			onInput
		}
	}
})
</script>

<style scoped>
.textInputFieldContainer {
	position: relative;
	height: 50px;
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

.textInputFieldContainer .textInputFieldInput:focus~label,
.textInputFieldContainer .textInputFieldInput:valid~label,
.textInputFieldContainer .textInputFieldInput:disabled~label {
	transform: translateY(-80%) scale(0.8);
	background-color: v-bind(labelBackgroundColor);
	padding: 0 .2em;
	color: v-bind(color);
	left: 10px;
}
</style>
