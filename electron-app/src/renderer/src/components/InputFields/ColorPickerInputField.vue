<template>
	<div ref="container" class="colorPickerInputFieldContainer" :class="{ active: active }">
		<input ref="input" class="colorPicker" :tabindex="0" type="text" data-coloris v-model="pickedColor"
			@input="onColorSelected(($event.target as HTMLInputElement).value)" @open="onOpen"
			@close="opened = false" />
		<label class="colorPickerLabel">{{ label }}</label>
		<div class="pickedColor"></div>
	</div>
</template>
<script lang="ts">
import { Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

import { ValidationFunctionsKey } from '@renderer/Types/Keys';
import tippy from 'tippy.js';
import Coloris from '@melloware/coloris';

export default defineComponent({
	name: "ColorPickerInputField",
	emits: ["update:modelValue"],
	props: ['modelValue', 'color', 'label', "width", 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight'],
	setup(props, ctx)
	{
		const container: Ref<HTMLElement | null> = ref(null);
		const input: Ref<HTMLElement | null> = ref(null);

		const defaultColor: string = "";
		let pickedColor: Ref<string> = ref(props.modelValue);
		let opened: Ref<boolean> = ref(false);
		let active: Ref<boolean> = computed(() => opened.value || pickedColor.value != defaultColor);

		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		let tippyInstance: any = null;

		function validate()
		{
			if (pickedColor.value == '' || pickedColor.value == undefined)
			{
				invalidate("Please pick a color");
				return false;
			}

			return true;
		}

		function invalidate(message: string)
		{
			tippyInstance.setContent(message);
			tippyInstance.show();
		}

		function onOpen()
		{
			tippyInstance.hide();
			opened.value = true;
		}

		function onFocus()
		{
			input.value?.click();
		}

		function onUnFocus()
		{
			//Coloris.close();
		}

		function onColorSelected(color: string)
		{
			ctx.emit('update:modelValue', color);
			Coloris.close();
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
			pickedColor,
			active,
			container,
			input,
			opened,
			onOpen,
			onFocus,
			onUnFocus,
			onColorSelected
		}
	}
})
</script>

<style>
.colorPickerInputFieldContainer {
	position: relative;
	height: v-bind(height);
	width: v-bind(width);
	max-height: v-bind(maxHeight);
	max-width: v-bind(maxWidth);
	min-height: v-bind(minHeight);
	min-width: v-bind(minWidth);

	border: solid 1.5px #9e9e9e;
	border-radius: min(1vw, 1rem);
	background: none;
	font-size: clamp(13px, 1.2vh, 25px);
	color: white;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);
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

.colorPickerInputFieldContainer.active {
	outline: none;
	border: 1.5px solid v-bind(color);
}

.colorPickerInputFieldContainer.active .colorPickerLabel {
	top: 0;
	transform: translateY(-80%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind(color);
}

.colorPickerLabel {
	position: absolute;
	color: white;
	left: 10px;
	top: 50%;
	color: #e8e8e8;
	pointer-events: none;
	transform: translateY(-50%);
	transition: var(--input-label-transition);
	font-size: clamp(12px, 1.2vh, 25px);
}

.colorPicker {
	opacity: 0;
	width: 100%;
	height: 100%;
	z-index: 2;
	position: relative;
}

.pickedColor {
	position: absolute;
	border-radius: 0.75rem;
	width: 95%;
	height: 90%;
	top: 5%;
	left: 2.5%;
	z-index: 1;

	background-color: v-bind(pickedColor);
}
</style>
