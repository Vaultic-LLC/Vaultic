<template>
	<div class="addRowButtonContainer">
		<div class="addRowButtonContainer__button">
			<ion-icon class="addTableItemButtonIcon" name="add-outline"></ion-icon>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

export default defineComponent({
	name: "AddButton",
	props: ['color', 'minSize', 'preferredSize', 'maxSize'],
	setup(props)
	{
		const computedMinSize: ComputedRef<string> = computed(() => props.minSize ?? '20px');
		const computedPreferredSize: ComputedRef<string> = computed(() => props.preferredSize ?? '1.8vw');
		const computedMaxSize: ComputedRef<string> = computed(() => props.maxSize ?? '35px');
		const transition: Ref<string> = ref('0');

		onMounted(() =>
		{
			// used to fix bug where the icon will slowly grow when first rendered
			setTimeout(() => transition.value = '0.5s', 200);
		});

		return {
			computedMinSize,
			computedPreferredSize,
			computedMaxSize,
			transition
		}
	}
})
</script>

<style>
.addRowButtonContainer {
	cursor: pointer;
}

.addRowButtonContainer__button {
	height: clamp(v-bind(computedMinSize), v-bind(computedPreferredSize), v-bind(computedMaxSize));
	width: clamp(v-bind(computedMinSize), v-bind(computedPreferredSize), v-bind(computedMaxSize));
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: clamp(20px, 2vw, 35px);
	border-radius: 50%;
	color: white;
	transition: v-bind(transition);
	border: 2px solid v-bind(color);
}

.addRowButtonContainer__button:hover {
	box-shadow: 0 0 25px v-bind(color);
}
</style>
