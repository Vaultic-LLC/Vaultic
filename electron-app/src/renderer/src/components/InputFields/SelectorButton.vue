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
	background-color: v-bind(primaryColor);
	width: clamp(14px, 1.1vw, 30px);
	aspect-ratio: 1/ 1;
	margin: 5px;
	transition: 0.6s;
	position: relative;
	/* display: flex;
	justify-content: center;
	align-items: center; */
}

.selectorButton::before {
	content: '';
	border-radius: inherit;
	background-color: #121a20;
	width: clamp(12px, 0.9vw, 25px);
	aspect-ratio: 1 /1;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	position: absolute;
	transition: 0.6s;
	background: #11181e;
	box-shadow: inset 5px 5px 10px #070a0c,
		inset -5px -5px 10px #1b2630;
}

.selectorButton.active {
	transition: 0.6s;
	box-shadow: 0 0 10px v-bind(primaryColor);
}

.selectorButton.active::before {
	transition: 0.6s;
	background-color: v-bind(primaryColor);
	/* background: linear-gradient(145deg, #121a20, #0f161b);
    box-shadow: 2px 2px 10px #070a0c,
        -2px -2px 10px #1b2630; */
	box-shadow: 0 0 0;
}
</style>
