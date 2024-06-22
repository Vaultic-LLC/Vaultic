<template>
	<div class="selectorButton" :class="{ active: selectorButtonModel.isActive.value }"
		@click.stop="selectorButtonModel.onClick()">
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref } from "vue";

export default defineComponent({
	name: "SelectorButton",
	props: ['selectorButtonModel'],
	setup(props)
	{
		const primaryColor: Ref<string> = ref(props.selectorButtonModel.color);
		return {
			primaryColor,
		}
	}
})
</script>

<style>
.selectorButton {
	border-radius: 50%;
	width: clamp(14px, 1.1vw, 30px);
	aspect-ratio: 1/ 1;
	margin: 5px;
	transition: 0.1s;
	position: relative;
	border: 0.12vw solid v-bind(primaryColor);
	background: #11181e;
	box-shadow: inset 5px 5px 10px #070a0c,
		inset -5px -5px 10px #1b2630;
}

.selectorButton.active {
	background-color: v-bind(primaryColor);
}

.selectorButton.active {
	transition: 0.6s;
	box-shadow: 0 0 10px v-bind(primaryColor);
}

.selectorButton.active::before {
	transition: 0.6s;
	background-color: v-bind(primaryColor);
	box-shadow: 0 0 0;
}
</style>
