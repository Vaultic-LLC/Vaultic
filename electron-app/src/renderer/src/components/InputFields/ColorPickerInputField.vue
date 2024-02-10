<template>
	<div ref="container" class="colorPickerInputFieldContainer" :class="{ active: active }">
		<input class="colorPicker" type="text" data-coloris v-model="pickedColor"
			@input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" @open="onOpen"
			@close="opened = false" />
		<label class="colorPickerLabel">{{ label }}</label>
		<div class="pickedColor"></div>
	</div>
</template>
<script lang="ts">
import { Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref } from 'vue';

import { ValidationFunctionsKey } from '@renderer/Types/Keys';
import tippy from 'tippy.js';

export default defineComponent({
	name: "ColorPickerInputField",
	emits: ["update:modelValue"],
	props: ['modelValue', 'color', 'label'],
	setup(props)
	{
		const container: Ref<HTMLElement | null> = ref(null);
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
			opened,
			onOpen
		}
	}
})
</script>

<style>
.colorPickerInputFieldContainer {
	position: relative;
	width: 200px;
	height: 50px;

	border: solid 1.5px #9e9e9e;
	border-radius: 1rem;
	background: none;
	font-size: 1rem;
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
	transform: translateY(-80%) scale(0.8);
	background-color: var(--app-color);
	padding: 0 .2em;
	color: v-bind(color);
}

.colorPickerLabel {
	position: absolute;
	color: white;
	left: 5%;
	top: 0;
	color: #e8e8e8;
	pointer-events: none;
	transform: translateY(1rem);
	transition: var(--input-label-transition);
}

.colorPicker {
	opacity: 0;
	width: inherit;
	height: inherit;
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
