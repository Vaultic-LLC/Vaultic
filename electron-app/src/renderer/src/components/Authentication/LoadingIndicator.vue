<template>
	<div class="loadingIndicator">
		<div ref="dotOne" class="loadingIndicator__dot"></div>
		<div ref="dotTwo" class="loadingIndicator__dot"></div>
		<div ref="dotThree" class="loadingIndicator__dot"></div>
		<div ref="dotFour" class="loadingIndicator__dot"></div>
		<div ref="dotFive" class="loadingIndicator__dot"></div>
		<!-- <div ref="progressBar" class="loadingIndicator__progress"></div> -->
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, ref, watch } from 'vue';

import { getLinearGradientFromColor, hexToRgb } from '@renderer/Helpers/ColorHelper';
import { tween, tweenInfinite } from '@renderer/Helpers/TweenHelper';
import { RGBColor } from '@renderer/Types/Colors';
import * as TWEEN from '@tweenjs/tween.js'

export default defineComponent({
	name: "LoadingIndicator",
	props: ['color', 'fill'],
	setup(props)
	{
		let tweenGroup = new TWEEN.Group();

		let dots: any[];
		const dotOne: Ref<HTMLElement | null> = ref(null);
		const dotTwo: Ref<HTMLElement | null> = ref(null);
		const dotThree: Ref<HTMLElement | null> = ref(null);
		const dotFour: Ref<HTMLElement | null> = ref(null);
		const dotFive: Ref<HTMLElement | null> = ref(null);

		const loadingShadowColor: ComputedRef<RGBColor | null> = computed(() => hexToRgb(props.color));

		const progressBar: Ref<HTMLElement | null> = ref(null);
		let fill: number = 0;
		const gradient: ComputedRef<string> = computed(() => getLinearGradientFromColor(props.color));

		function getShadowColor(opacity: number)
		{
			if (loadingShadowColor.value != null)
			{
				return `rgba(${loadingShadowColor.value.r}, ${loadingShadowColor.value.g}, ${loadingShadowColor.value.b}, ${opacity})`;
			}

			return props.color;
		}

		function updateSize(dot: Ref<HTMLElement | null>, obj: any)
		{
			if (dot.value)
			{
				dot.value.style.transform = `scale(${obj.x})`;
			}
		}

		function updateOpacity(dot: Ref<HTMLElement | null>, obj: any)
		{
			if (dot.value)
			{
				//dot.value.style.boxShadow = `0 0 0 ${obj.y}px ${getShadowColor(obj.x)}`
			}
		}

		function updateFill(amount: number)
		{
			const from = { x: fill };
			const to = { x: amount };

			tween(from, to, 200, (obj) =>
			{
				if (progressBar.value)
				{
					progressBar.value.style.width = obj.x + '%';
				}
			});

			fill = amount;
		}

		watch(() => props.fill, (newValue) =>
		{
			updateFill(newValue);
		});

		onMounted(() =>
		{
			dots = [];
			dots.push(dotOne);
			dots.push(dotTwo);
			dots.push(dotThree);
			dots.push(dotFour);
			dots.push(dotFive);

			const sizeTweenFrom: any = { x: 0.5 };
			const sizeTweenTo: any = { x: 1 };

			const opacityTweenFrom: any = { x: 0.7, y: 10 };
			const opacityTweenTo: any = { x: 0, y: 0 };

			dots.forEach((d, i) =>
			{
				setTimeout(() =>
				{
					tweenInfinite(sizeTweenFrom, sizeTweenTo, 1000, tweenGroup, (obj: any) =>
					{
						updateSize(d, obj);
					});

					tweenInfinite(opacityTweenFrom, opacityTweenTo, 1000, tweenGroup, (obj: any) =>
					{
						updateOpacity(d, obj);
					});

				}, i * 200)
			});

		});

		onUnmounted(() =>
		{
			tweenGroup.removeAll();
		});

		return {
			loadingShadowColor,
			dotOne,
			dotTwo,
			dotThree,
			dotFour,
			dotFive,
			gradient,
			progressBar,
			updateFill
		}
	}
})
</script>
<style>
/* .loadingIndicator {
	width: 100%;
	height: 100%;
	border-radius: 20px;
}

.loadingIndicator__progress {
	height: 100%;
	width: 0%;
	background: v-bind(gradient);
	border-radius: 20px;
} */

.loadingIndicator {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 20%;
	width: 50%;
	margin-top: 50px;
}

.loadingIndicator__dot {
	height: 20px;
	width: 20px;
	margin-right: 10px;
	border-radius: 10px;
	background-color: v-bind(color);
	/* animation: loadingPulse 2s infinite ease-in-out; */
}

/* .loadingIndicator__dot:last-child {
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
		transform: scale(0.8);
		background-color: v-bind(color);
		box-shadow: 0 0 0 0 v-bind(loadingShadowColor);
	}

	50% {
		transform: scale(1);
		background-color: v-bind(color);
		box-shadow: 0 0 0 10px rgba(178, 212, 252, 0);
	}

	100% {
		transform: scale(0.8);
		background-color: v-bind(color);
		box-shadow: 0 0 0 0 v-bind(loadingShadowColor);
	}
} */
</style>
