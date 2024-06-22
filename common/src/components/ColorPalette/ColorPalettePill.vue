<template>
	<div class="colorPalettePill" :class="{ hovering, isHovering }">
		<div class="colorPalettePill__left">
		</div>
		<div class="colorPalettePill__right">
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed } from 'vue';


export default defineComponent({
	name: "ColorPalettePill",
	props: ['leftColor', 'rightColor', 'hovering'],
	setup(props)
	{
		const isHovering: ComputedRef<boolean> = computed(() => props.hovering == true);
		return {
			isHovering
		}
	}
})
</script>

<style scoped>
.colorPalettePill {
	width: max(4vw, 50px);
	height: max(30px, 2vw);
	display: flex;
	justify-content: center;
	align-items: center;
	transition: 0.3s;
	will-change: transform;
	cursor: pointer;
}

.colorPalettePill:hover {
	transform: scale(1.1);
}

.colorPalettePill__left {
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
	height: clamp(15px, 1.5vw, 30px);
	width: clamp(15px, 1.5vw, 30px);
	cursor: pointer;
	background-color: v-bind(leftColor);
}

.colorPalettePill__right {
	border-top-right-radius: 20px;
	border-bottom-right-radius: 20px;
	height: clamp(15px, 1.5vw, 30px);
	width: clamp(15px, 1.5vw, 30px);
	cursor: pointer;
	background-color: v-bind(rightColor);
}

.colorPalettePill.hovering .colorPalettePill__left {
	box-shadow: 0 0 25px v-bind(leftColor);
}

.colorPalettePill.hovering .colorPalettePill__right {
	box-shadow: 0 0 25px v-bind(rightColor);
}
</style>
