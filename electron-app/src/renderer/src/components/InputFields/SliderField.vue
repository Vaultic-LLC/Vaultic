<template>
	<div class="sliderContainer">
		<input class="sliderContainer__slider" type="range" :min="min" :max="max" value="50">
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from "vue";

export default defineComponent({
	name: "SliderField",
	props: ['color', 'min', 'max', 'currentValue'],
	setup(props)
	{
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		return {
			primaryColor
		}
	}
})
</script>

<style>
.sliderContainer {
	width: 90%;
}

.sliderContainer__slider {
	-webkit-appearance: none;
	appearance: none;
	width: 100%;
	height: 25px;
	background: #d3d3d3;
	outline: none;
	opacity: 0.7;
	-webkit-transition: .2s;
	transition: opacity .2s;
}

.sliderContainer__slider:hover {
	opacity: 1;
}

.sliderContainer__slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 25px;
	height: 25px;
	background: #04AA6D;
	cursor: pointer;
}
</style>
