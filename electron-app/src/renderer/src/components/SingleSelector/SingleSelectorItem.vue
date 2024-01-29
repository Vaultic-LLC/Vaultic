<template>
	<div class="tableSelectorButton" @click="selectorItem.onClick()"
		:class="{ active: selectorItem.isActive.value, first: isFirst, last: isLast }">
		<Transition name="fade" mode="out-in">
			<div :key="key" class="tableSelectorButtonText">
				{{ selectorItem.title.value }}
			</div>
		</Transition>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import { SingleSelectorItemModel } from '../../Types/Models'
import { getLinearGradientFromColor, getLinearGradientFromColorAndPercent, hexToRgb } from '@renderer/Helpers/ColorHelper';
import { widgetBackgroundHexString, widgetBackgroundRGBA } from '@renderer/Constants/Colors';
import { RGBColor } from '@renderer/Types/Colors';
import { tween } from '@renderer/Helpers/TweenHelper';

export default defineComponent({
	name: "TableSelector",
	props: ["item", "isFirst", "isLast"],
	setup(props)
	{
		const key: Ref<string> = ref('');
		const selectorItem: ComputedRef<SingleSelectorItemModel> = computed(() => props.item);
		const background: Ref<string> = ref('');

		watch(() => selectorItem.value.isActive.value, (newValue) =>
		{
			let tweenTo: RGBColor | null = null;
			let tweenFrom: RGBColor | null = null;

			if (newValue)
			{
				tweenTo = hexToRgb(selectorItem.value.color.value);
				tweenFrom = widgetBackgroundRGBA();
				tween<RGBColor>(tweenFrom!, tweenTo!, 500, updateGradient);
			}
			else
			{
				tweenTo = widgetBackgroundRGBA();
				tweenFrom = hexToRgb(selectorItem.value.color.value);
				tween({ ...tweenFrom!, x: 30 }, { ...tweenTo!, x: 0 }, 500, updateToWidgetColor);
			}

			function updateGradient(clr: RGBColor)
			{
				background.value = getLinearGradientFromColor(`rgba(${Math.round(clr.r)}, ${Math.round(clr.g)}, ${Math.round(clr.b)}, ${clr.alpha})`);
			}

			function updateToWidgetColor(clr: any)
			{
				background.value = getLinearGradientFromColorAndPercent(
					`rgba(${Math.round(clr.r)}, ${Math.round(clr.g)}, ${Math.round(clr.b)}, ${clr.alpha})`, clr.x);
			}
		});

		onMounted(() =>
		{
			background.value = selectorItem.value.isActive.value ?
				getLinearGradientFromColor(selectorItem.value.color.value) :
				widgetBackgroundHexString()
		});

		watch(() => selectorItem.value.title.value, () =>
		{
			key.value = Date.now().toString();
		});

		return {
			selectorItem,
			background,
			key
		}
	}
})
</script>

<style>
.tableSelectorButton {
	width: 50%;
	display: flex;
	position: relative;
	overflow: hidden;
	animation: tableSelectorOneNotHover .2s linear forwards;
	background: v-bind(background);
	display: flex;
	justify-content: center;
	align-items: center;
}

.tableSelectorButton.first {
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.tableSelectorButton.last {
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
}

.tableSelectorButton .tableSelectorButtonText {
	transition: 0.3s;
	color: white;
	font-size: 20px;
	padding: 10px;
	cursor: pointer;
	text-align: center;
}

.tableSelectorButton:hover {
	animation: tableSelectorOneHover .2s linear forwards;
}

@keyframes tableSelectorOneHover {

	0% {
		/* border: 5px solid transparent; */
		box-shadow: 0 0 0 v-bind('selectorItem.color.value');
	}

	100% {
		/* border: 5px solid v-bind('selectorItem.color.value'); */
		box-shadow: 0 0 25px v-bind('selectorItem.color.value');
	}
}

@keyframes tableSelectorOneNotHover {
	0% {
		/* border: 5px solid v-bind('selectorItem.color.value'); */
		box-shadow: 0 0 25px v-bind('selectorItem.color.value');
	}

	100% {
		/* border: 5px solid transparent; */
		box-shadow: 0 0 0 v-bind('selectorItem.color.value');
	}
}
</style>
