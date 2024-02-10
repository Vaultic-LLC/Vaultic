<template>
	<td>
		<div class="slideInContainer" :class="{
			openContainer: openContainer, keepStylesWhileMoving: keepStylesWhileMoving,
			noAnimation: noAnimation
		}">
			<div :style="{ 'display': showInputs ? 'grid' : 'none' }">
				<slot></slot>
			</div>
		</div>
	</td>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

export default defineComponent({
	name: "SlideInRow",
	props: ['isShowing', "defaultHeight"],
	setup(props)
	{
		const textColor: string = "white";

		const rowHeight: ComputedRef<string> = computed(() => props.defaultHeight + "px");
		const openContainer: Ref<boolean> = ref(props.isShowing);
		const showInputs: Ref<boolean> = ref(false);
		let keepStylesWhileMoving: Ref<boolean> = ref(false);
		let noAnimation: Ref<boolean> = ref(true);

		watch(() => props.isShowing, (newValue) =>
		{
			if (newValue)
			{
				keepStylesWhileMoving.value = true;
				openContainer.value = true;
				noAnimation.value = false;
				setTimeout(() => showInputs.value = true, 800)
			}
			else
			{
				showInputs.value = false;
				openContainer.value = false;
				setTimeout(() => keepStylesWhileMoving.value = false, 1000);
			}
		});

		return {
			textColor,
			openContainer,
			showInputs,
			keepStylesWhileMoving,
			noAnimation,
			rowHeight
		}
	}
})
</script>

<style>
.slideInContainer.noAnimation {
	animation: none;
	height: 10px;
	max-height: 10px;
}

.slideInContainer {
	display: grid;
	row-gap: 10px;
	border-bottom-right-radius: 20px;

	height: v-bind(rowHeight);
	max-height: v-bind(rowHeight);
	animation: 1s slideIn ease forwards;
	opacity: 0;
	box-shadow: -5px 5px 10px #070a0c,
		5px 5px 10px #1b2630;
	transform: translateY(-10px);
}

.slideInContainer.openContainer {
	display: grid;
	max-height: v-bind(rowHeight);
	animation: 1s slideOut ease;

	transition: opacity 2s linear forwards;
	opacity: 1;
	padding: 30px 20px 0px 20px;
	transform: translateY(-10px);
	box-shadow: -5px 5px 10px #070a0c,
		5px 5px 10px #1b2630;
}

.slideInContainer.keepStylesWhileMoving {
	display: grid;
	opacity: 1;
	box-shadow: -5px 5px 10px #070a0c,
		5px 5px 10px #1b2630;
}

@keyframes slideOut {
	0% {
		max-height: 10px;
	}

	100% {
		max-height: v-bind(rowHeight);
	}
}

@keyframes slideIn {
	0% {
		max-height: v-bind(rowHeight);
	}

	100% {
		max-height: 10px;
	}
}
</style>
