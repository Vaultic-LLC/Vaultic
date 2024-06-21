<template>
	<div class="toggleRadioButtonContainer">
		<div class="toggleRadioButtonContainer__tabs" :class="{ second: checkedIndex == 1 }">
			<input :checked="checkedIndex == 0" type="radio" class="input" @click="onButtonClick(0)"
				@keyup.enter="onInputEnter" />
			<label class="toggleRadioButtonContainer__label" @click="onButtonClick(0)">{{ model.buttonOne.text
				}}</label>
			<input :checked="checkedIndex == 1" type="radio" class="input" @click="onButtonClick(1)"
				@keyup.enter="onInputEnter" />
			<label class="toggleRadioButtonContainer__label toggleRadioButtonContainer__label--second"
				@click="onButtonClick(1)">{{ model.buttonTwo.text }}</label>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import { getLinearGradientFromColor } from '@renderer/Helpers/ColorHelper';
import { stores } from '@renderer/Objects/Stores';
import { ToggleRadioButtonModel } from '@renderer/Types/Models';

export default defineComponent({
	name: 'ToggleRadioButton',
	props: ['model', 'height'],
	emits: ['onButtonClicked'],
	setup(props, ctx)
	{
		const primaryColor: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);
		const linearGradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(primaryColor.value));

		const model: ComputedRef<ToggleRadioButtonModel> = computed(() => props.model);

		const checkedIndex: Ref<number> = ref(model.value.buttonTwo.active ? 1 : 0);

		function onButtonClick(index: number)
		{
			checkedIndex.value = index;
			ctx.emit('onButtonClicked', index);
		}

		function onInputEnter()
		{
			if (checkedIndex.value == 0)
			{
				onButtonClick(1);
				return;
			}

			onButtonClick(0);
		}

		return {
			model,
			checkedIndex,
			linearGradient,
			primaryColor,
			onButtonClick,
			onInputEnter,
		}
	}
});
</script>

<style>
.toggleRadioButtonContainer__tabs {
	height: v-bind(height);
	display: grid;
	grid-auto-flow: column;
	background: var(--app-color);
	grid-auto-columns: 1fr;
	position: relative;
	border: 1.5px solid v-bind(primaryColor);
	border-radius: clamp(5px, 0.4vw, 0.425rem);
	/* padding: clamp(2px, 0.2vw, 10px) */
}

.toggleRadioButtonContainer__tabs {
	--ease: linear(0,
			0.1641 3.52%,
			0.311 7.18%,
			0.4413 10.99%,
			0.5553 14.96%,
			0.6539 19.12%,
			0.738 23.5%,
			0.8086 28.15%,
			0.8662 33.12%,
			0.9078 37.92%,
			0.9405 43.12%,
			0.965 48.84%,
			0.9821 55.28%,
			0.992 61.97%,
			0.9976 70.09%,
			1);
}

.toggleRadioButtonContainer__tabs>.input,
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}

.toggleRadioButtonContainer__tabs:has(:checked:nth-of-type(1)) {
	--active: 0;
}

.toggleRadioButtonContainer__tabs:has(:checked:nth-of-type(2)) {
	--active: 1;
}

.toggleRadioButtonContainer__tabs:has(:checked:nth-of-type(3)) {
	--active: 2;
}

.toggleRadioButtonContainer__tabs:has(:checked:nth-of-type(4)) {
	--active: 3;
}

.toggleRadioButtonContainer__tabs :checked+.toggleRadioButtonContainer__label {
	--highlight: 1;
}

.toggleRadioButtonContainer__tabs:has(.input:nth-of-type(2)) {
	--count: 2;
}

.toggleRadioButtonContainer__tabs:has(.input:nth-of-type(3)) {
	--count: 3;
}

.toggleRadioButtonContainer__tabs:has(.input:nth-of-type(4)) {
	--count: 4;
}

.toggleRadioButtonContainer__tabs .toggleRadioButtonContainer__label {
	font-size: clamp(9px, 0.7vw, 15px);
	padding: 0 clamp(5px, 1vw, 20px);
	cursor: pointer;
	text-align: center;
	height: 100%;
	display: grid;
	background: transparent;
	z-index: 2;
	border-top-left-radius: clamp(3px, 0.3vw, 0.35rem);
	border-bottom-left-radius: clamp(3px, 0.3vw, 0.35rem);
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	place-items: center;
	color: hsl(0 0% 100% / calc(0.5 + var(--highlight, 0)));
	transition: background, color;
	transition-duration: 0.25s;
	transition-timing-function: var(--ease, ease);
}

.toggleRadioButtonContainer__label.toggleRadioButtonContainer__label--second {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-top-right-radius: clamp(3px, 0.3vw, 0.35rem);
	border-bottom-right-radius: clamp(3px, 0.3vw, 0.35rem);
}

.input:not(:checked)+.toggleRadioButtonContainer__label:hover {
	--highlight: 0.35;
	background: hsl(0 0% 20%);
}

.toggleRadioButtonContainer__tabs::after {
	pointer-events: none;
	content: "";
	width: calc(100% / var(--count));
	height: 100%;
	background: v-bind(linearGradient);
	position: absolute;
	/* border-radius: clamp(5px, 0.4vw, 0.425rem); */
	border-top-left-radius: clamp(3px, 0.3vw, 0.35rem);
	border-bottom-left-radius: clamp(3px, 0.3vw, 0.35rem);
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	/* mix-blend-mode: normal; */
	translate: calc(v-bind(checkedIndex) * 100%) 0;
	transition: translate, outline-color;
	transition-duration: 0.3s;
	transition-timing-function: var(--ease, ease);
	outline: 2px solid transparent;
}

.toggleRadioButtonContainer__tabs.second:after {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-top-right-radius: clamp(3px, 0.3vw, 0.35rem);
	border-bottom-right-radius: clamp(3px, 0.3vw, 0.35rem);
}

.toggleRadioButtonContainer__tabs:has(:focus-visible)::after {
	box-shadow: 0 0 10px v-bind(primaryColor);
}
</style>
