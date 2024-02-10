<template>
	<div ref="container" :key="refreshKey" class="dropDownContainer" tabindex="1" @click="onSelectorClick"
		@focusout="opened = false" :class="{ active: active, opened: opened, shouldFadeIn: fadeIn }">
		<div class="dropDownTitle">
			<label class="dropDownLabel">{{ label }}</label>
			<div class="dropDownIcon" :class="{ opened: opened }">
				<ion-icon :style="{ visibility: 'unset' }" :class="{ active: active }"
					name="chevron-down-circle-outline"></ion-icon>
				<!-- <ion-icon v-else :class="{ active: active }" name="chevron-up-circle-outline"></ion-icon> -->
			</div>
			<label class="selectedItemText" :class="{ hasValue: selectedValue != '' }"> {{ selectedValue }}</label>
		</div>
		<div class="dropDownSelect" :class="{ opened: opened }">
			<option class="dropDownSelectOption" @click="onOptionClick('')"></option>
			<option class="dropDownSelectOption" v-for="(item, index) in optionsEnum" :key="index"
				@click="onOptionClick(item)" :style="{ animationDelay: index + 's' }">
				{{ item }}</option>
		</div>
		<input class="dropDownInput" type="text" />
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, onUnmounted, ref, watch } from 'vue';

import { appHexColor, widgetInputLabelBackgroundHexColor } from '@renderer/Constants/Colors';
import { ValidationFunctionsKey } from '@renderer/Types/Keys';
import tippy from 'tippy.js';

export default defineComponent({
	name: "EnumInputField",
	emits: ["update:modelValue"],
	props: ["modelValue", "optionsEnum", "label", "color", 'fadeIn', 'isOnWidget'],
	setup(props, ctx)
	{
		const container: Ref<HTMLElement | null> = ref(null);
		const refreshKey: Ref<string> = ref('');
		let selectedValue: Ref<string> = ref(props.modelValue);
		let opened: Ref<boolean> = ref(false);
		let active: ComputedRef<boolean> = computed(() => !!selectedValue.value || opened.value);
		const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		let tippyInstance: any = null;

		function onSelectorClick()
		{
			opened.value = !opened.value;
			tippyInstance.hide();
		}

		function onOptionClick(value: string)
		{
			selectedValue.value = value;
			ctx.emit('update:modelValue', value)
		}

		function validate()
		{
			if (selectedValue.value == '' || selectedValue.value == undefined)
			{
				invalidate("Please select a value");
				return false;
			}

			return true;
		}

		function invalidate(message: string)
		{
			tippyInstance.setContent(message);
			tippyInstance.show();
		}

		watch(() => props.modelValue, (newValue) =>
		{
			if (newValue === undefined)
			{
				onOptionClick('');
				refreshKey.value = Date.now().toString();
			}
		});

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
			refreshKey,
			opened,
			active,
			selectedValue,
			backgroundColor,
			container,
			onSelectorClick,
			onOptionClick
		}
	}
})
</script>

<style scoped>
.dropDownContainer {
	position: relative;
	height: 50px;
	width: 200px;

	border: solid 1.5px #9e9e9e;
	border-radius: 1rem;
	background: none;
	font-size: 1rem;
	color: white;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);

	cursor: pointer;
}

.dropDownContainer.shouldFadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}

.dropDownContainer.active {
	border: 1.5px solid v-bind(color);
}

.dropDownContainer.opened {
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
}

.dropDownContainer .dropDownTitle .dropDownLabel {
	position: absolute;
	top: 30%;
	left: 5%;
	transition: 150ms cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
}

.dropDownContainer.active .dropDownTitle .dropDownLabel {
	transform: translateY(-150%) scale(0.8);
	background-color: v-bind(backgroundColor);
	padding: 0 .2em;
	color: v-bind(color);
}

.dropDownContainer .dropDownTitle .dropDownIcon {
	position: absolute;
	visibility: unset;
	top: 30%;
	right: 5%;
	font-size: 24px;
	color: white;
	transition: 0.3s;
	transform: rotate(0);
	display: flex;
	justify-content: center;
	align-items: center;
}

.dropDownContainer .dropDownTitle .dropDownIcon .active {
	color: v-bind(color);
}

.dropDownContainer .dropDownTitle .dropDownIcon.opened {
	transform: rotate(180deg);
}

.dropDownContainer .dropDownTitle .selectedItemText {
	display: none;
	color: white;
}

.dropDownContainer .dropDownTitle .selectedItemText.hasValue {
	display: block;
	position: absolute;
	top: 30%;
	left: 5%;
	transition: var(--input-label-transition);
}

.dropDownContainer .dropDownSelect {
	width: inherit;
	position: absolute;
	left: 0;
	bottom: -2%;
	background: none;
	font-size: 1rem;
	color: white;
	transform: translate(-1.5px, 100%);
	border-bottom-left-radius: 1rem;
	border-bottom-right-radius: 1rem;
	z-index: -1;
	transition: opacity 0.3s;
	opacity: 0;
}

.dropDownSelect.opened {
	border-left: 1.5px solid v-bind(color);
	border-right: 1.5px solid v-bind(color);
	border-bottom: 1.5px solid v-bind(color);
	opacity: 1;
}

.dropDownContainer .dropDownSelect:focus,
.dropDownContainer .dropDownSelect:active {
	outline: none;
}

.dropDownSelect .dropDownSelectOption {
	display: none;
	background-color: v-bind(backgroundColor);
	transition: opacity 0.3s;
	opacity: 0;
}

.dropDownSelect.opened .dropDownSelectOption {
	display: block;
	text-align: left;
	padding-left: 10px;
	transition: 0.15s;
	opacity: 1;
}

.dropDownSelect.opened .dropDownSelectOption:last-child {
	border-bottom-left-radius: 1rem;
	border-bottom-right-radius: 1rem;
}

.dropDownSelect.opened .dropDownSelectOption:hover {
	background-color: grey;
}

.dropDownInput {
	position: absolute;
	display: none;
}
</style>
