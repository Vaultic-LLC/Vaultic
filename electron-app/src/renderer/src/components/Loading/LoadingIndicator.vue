<template>
	<div class="loadingIndicator">
		<div ref="dotOne" class="loadingIndicator__dot"></div>
		<div ref="dotTwo" class="loadingIndicator__dot"></div>
		<div ref="dotThree" class="loadingIndicator__dot"></div>
		<div ref="dotFour" class="loadingIndicator__dot"></div>
		<div ref="dotFive" class="loadingIndicator__dot"></div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { hexToRgb } from '@renderer/Helpers/ColorHelper';
import { RGBColor } from '@renderer/Types/Colors';

export default defineComponent({
	name: "LoadingIndicator",
	props: ['color'],
	setup(props)
	{
		const loadingShadowColor: ComputedRef<RGBColor | null> = computed(() => hexToRgb(props.color));

		return {
			loadingShadowColor
		}
	}
})
</script>
<style>
.loadingIndicator {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 20%;
	width: 50%;
	margin-top: 50px;
}

.loadingIndicator__dot {
	height: 12px;
	width: 12px;
	margin-right: 10px;
	border-radius: 10px;
	background-color: v-bind(color);
	transform: scale(0.5);
	animation: loadingPulse 2s infinite ease-in-out;
}

.loadingIndicator__dot:last-child {
	margin-right: 0;
}

.loadingIndicator__dot:nth-child(1) {
	animation-delay: .2s;
}

.loadingIndicator__dot:nth-child(2) {
	animation-delay: .4s;
}

.loadingIndicator__dot:nth-child(3) {
	animation-delay: .6s;
}

.loadingIndicator__dot:nth-child(4) {
	animation-delay: .8s;
}

.loadingIndicator__dot:nth-child(5) {
	animation-delay: 1s;
}

@keyframes loadingPulse {
	0% {
		transform: scale(0.5);
		background-color: v-bind(color);
		box-shadow: 0 0 0 0 v-bind(loadingShadowColor);
	}

	50% {
		transform: scale(1);
		background-color: v-bind(color);
		box-shadow: 0 0 0 10px rgba(178, 212, 252, 0);
	}

	100% {
		transform: scale(0.5);
		background-color: v-bind(color);
		box-shadow: 0 0 0 0 v-bind(loadingShadowColor);
	}
}
</style>
