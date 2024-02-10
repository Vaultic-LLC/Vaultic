<template>
	<div class="congratsRibbonContainer">
		<ion-icon name="checkmark-circle-outline"></ion-icon>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	name: "CongratsRibbon",
	props: ['color'],
	setup()
	{

		return {

		};
	},
})
</script>
<style>
.congratsRibbonContainer {
	color: v-bind(color);
	font-size: 80px;
}
</style>
