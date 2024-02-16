<template>
	<div class="loadingPopupContainer">
		<div class="loadingPopupContainer__glass"></div>
		<div class="loadingPopupContainer__popup">
			<div class="loadingPopupContainer__text"> {{ text }}</div>
			<LoadingIndicator :color="color" />
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import LoadingIndicator from './LoadingIndicator.vue';

export default defineComponent({
	name: "LoadingPopup",
	components:
	{
		LoadingIndicator
	},
	props: ['color', 'text'],
	setup()
	{
		return {

		}
	}
})
</script>
<style>
.loadingPopupContainer {
	position: fixed;
	width: 100%;
	left: 100%;
	top: 0;
	left: 0;
	z-index: 90;
}

.loadingPopupContainer__popup {
	background-color: var(--app-color);
	border: 2px solid v-bind(color);
	position: fixed;
	width: 10%;
	aspect-ratio: 1 / 0.75;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	row-gap: 10px;
	z-index: 90;
	border-radius: 20px;
}

.loadingPopupContainer__text {
	color: white;
	font-size: 18px;
}

.loadingPopupContainer__glass {
	position: fixed;
	width: 100%;
	height: 100%;
	background: rgba(17, 15, 15, 0.92);
	z-index: 90;
	top: 0;
	left: 0;
}
</style>
