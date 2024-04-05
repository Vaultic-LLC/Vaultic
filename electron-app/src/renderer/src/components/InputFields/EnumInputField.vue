<template>
	<div ref="container" :key="refreshKey" :tabindex="0" class="dropDownContainer" @click="onSelectorClick"
		@keyup.enter="onEnter" @keyup.up="onKeyUp" @keyup.down="onKeyDown" @focus="focused = true" @blur="unFocus"
		:class="{ active: active, opened: opened, shouldFadeIn: fadeIn }">
		<div class="dropDownTitle">
			<label class="dropDownLabel">{{ label }}</label>
			<div class="dropDownIcon" :class="{ opened: opened }">
				<ion-icon :style="{ visibility: 'unset' }" :class="{ active: active }"
					name="chevron-down-circle-outline"></ion-icon>
			</div>
			<label class="selectedItemText" :class="{ hasValue: selectedValue != '' }"> {{ selectedValue }}</label>
		</div>
		<div class="dropDownSelect" :class="{ opened: opened }">
			<option class="dropDownSelectOption" :class="{ active: '' == focusedItem }" @click="onOptionClick('')"
				@mouseover="focusedItem = ''"></option>
			<option class="dropDownSelectOption" v-for="( item, index ) in  optionsEnum " :key="index"
				@click="onOptionClick(item)" @mouseover="focusedItem = optionsEnum[item]"
				:class="{ active: item == focusedItem }" :style="{ animationDelay: index + 's' }">
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
	props: ["modelValue", "optionsEnum", "label", "color", 'fadeIn', 'isOnWidget', 'height', 'minHeight', 'maxHeight',
		'width', 'minWidth', 'maxWidth'],
	setup(props, ctx)
	{
		const container: Ref<HTMLElement | null> = ref(null);
		const refreshKey: Ref<string> = ref('');
		let selectedValue: Ref<string> = ref(props.modelValue);
		let opened: Ref<boolean> = ref(false);
		let focused: Ref<boolean> = ref(false);
		let active: ComputedRef<boolean> = computed(() => !!selectedValue.value || opened.value || focused.value);
		const backgroundColor: Ref<string> = ref(props.isOnWidget == true ? widgetInputLabelBackgroundHexColor() : appHexColor());

		const validationFunction: Ref<{ (): boolean }[]> | undefined = inject(ValidationFunctionsKey, ref([]));
		let tippyInstance: any = null;

		const enumOptionCount: Ref<number> = ref(-1);
		const focusedItem: Ref<string> = ref("");
		const focusedIndex: Ref<number> = ref(-1);

		function onSelectorClick()
		{
			opened.value = !opened.value;
			if (selectedValue.value == '')
			{
				focused.value = false;
			}

			tippyInstance.hide();
		}

		function onEnter()
		{
			if (!opened.value)
			{
				opened.value = true;
			}
			else
			{
				opened.value = false;
				onOptionClick(focusedItem.value);
				if (selectedValue.value == "")
				{
					focused.value = false;
				}
			}
		}

		function unFocus()
		{
			opened.value = false;
			focused.value = false;
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

		function onKeyUp()
		{
			focusedIndex.value = Math.max(-1, focusedIndex.value - 1);
			if (focusedIndex.value == -1)
			{
				focusedItem.value = "";
			}
			else
			{
				focusedItem.value = Object.values<string>(props.optionsEnum)[focusedIndex.value];
			}
		}

		function onKeyDown()
		{
			focusedIndex.value = Math.min(enumOptionCount.value, focusedIndex.value + 1);
			focusedItem.value = Object.values<string>(props.optionsEnum)[focusedIndex.value];
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

			for (let _ in props.optionsEnum)
			{
				enumOptionCount.value += 1;
			}
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
			focused,
			focusedItem,
			enumOptionCount,
			onSelectorClick,
			onOptionClick,
			unFocus,
			onKeyUp,
			onKeyDown,
			onEnter
		}
	}
})
</script>

<style scoped>
.dropDownContainer {
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
	color: white;
	transition: border 150ms cubic-bezier(0.4, 0, 0.2, 1);

	cursor: pointer;
	outline: none;
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
	font-size: clamp(11px, 1.2vh, 25px);
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
	font-size: clamp(15px, 2vh, 25px);
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
	font-size: clamp(11px, 1.2vh, 25px);
}

.dropDownContainer .dropDownTitle .selectedItemText.hasValue {
	display: block;
	position: absolute;
	top: 30%;
	left: 5%;
	transition: var(--input-label-transition);
}

.dropDownContainer .dropDownSelect {
	width: 100%;
	position: absolute;
	left: 0;
	bottom: -2%;
	background: none;
	font-size: clamp(11px, 1.2vh, 25px);
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
	font-size: clamp(11px, 1.2vh, 25px);
}

.dropDownSelect.opened .dropDownSelectOption:last-child {
	border-bottom-left-radius: 1rem;
	border-bottom-right-radius: 1rem;
}

.dropDownSelect.opened .dropDownSelectOption:hover,
.dropDownSelectOption.active {
	background-color: grey;
}

.dropDownInput {
	position: absolute;
	display: none;
}
</style>
