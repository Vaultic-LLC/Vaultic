<template>
	<div class="toolTipContainer" :class="{ fadeIn: fadeIn }">
		<div class="toolTipIcon" ref="toolTipIcon">
			<ion-icon name="alert-circle-outline"></ion-icon>
		</div>
	</div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';

import { ColorPalette } from '../Types/Colors';
import tippy, { Placement } from 'tippy.js';
import 'tippy.js/dist/tippy.css'; // optional for styling
import 'tippy.js/animations/scale.css';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "ToolTip",
	props: ["message", "placement", "color", "size", "fadeIn"],
	setup(props)
	{
		const toolTipIcon: Ref<HTMLElement | null> = ref(null);
		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.userPreferenceStore.currentColorPalette);
		const placement: ComputedRef<Placement> = computed(() => props.placement ? props.placement : "top");
		const iconSize: ComputedRef<string> = computed(() => props.size ?? "28px");

		onMounted(() =>
		{
			if (props.message && toolTipIcon.value)
			{
				tippy(toolTipIcon.value, {
					content: props.message,
					inertia: true,
					animation: 'scale',
					theme: 'material',
					placement: placement.value
				});
			}
		});

		return {
			currentColorPalette,
			toolTipIcon,
			iconSize
		};
	}
})
</script>
<style>
.tippy-box[data-theme~='material'] {
	text-align: center;
	font-size: clamp(11px, 1vh, 25px);
}

.toolTipContainer {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
}

.toolTipContainer.fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}

.toolTipContainer .toolTipIcon {
	width: v-bind(iconSize);
	height: v-bind(iconSize);
	font-size: v-bind(iconSize);
	color: white;
	transition: 0.3s;
	will-change: transform;
}

.toolTipContainer .toolTipIcon:hover {
	transform: scale(1.1);
	color: v-bind(color);
}

@keyframes fadeIn {
	0% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}
</style>
