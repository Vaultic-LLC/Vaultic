<template>
	<div class="accountSetupViewContainer">
		<div class="accountSetupViewContainer__header">
			<h2 class="accountSetupViewContainer__title">{{ title }}</h2>
		</div>
		<div class="accountSetupViewContainer__content" :class="{ flex: displayGrid == false, grid: displayGrid == true }"
			:style="{
				'grid-template-rows': `repeat(${gridDef?.rows}, ${gridDef?.rowHeight})`,
				'grid-template-columns': `repeat(${gridDef?.columns}, ${gridDef?.columnWidth})`
			}">
			<slot></slot>
		</div>
		<div class="accountSetupViewContainer__buttons">
			<PopupButton :color="color" :text="buttonText" :width="'150px'" :height="'40px'" :fontSize="'18px'"
				@onClick="onSubmit">
			</PopupButton>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';

import { GridDefinition } from '@renderer/Types/Models';

export default defineComponent({
	name: "AccountSetupViewPopup",
	components:
	{
		PopupButton
	},
	emits: ['onSubmit'],
	props: ['color', 'title', 'buttonText', 'displayGrid', 'gridDefinition'],
	setup(props, ctx)
	{
		const display: ComputedRef<string> = computed(() => props.displayGrid ? "grid" : "flex");
		const gridDef: ComputedRef<GridDefinition> = computed(() => props.gridDefinition);

		function onSubmit()
		{
			ctx.emit('onSubmit');
		}

		return {
			display,
			gridDef,
			onSubmit
		}
	}
})
</script>

<style>
.accountSetupViewContainer__header {
	position: absolute;
	top: 5%;
	left: 50%;
	transform: translate(-50%);
}

.accountSetupViewContainer__title {
	color: white;
}

.accountSetupViewContainer__content {
	position: absolute;
	top: 20%;
	left: 50%;
	transform: translateX(-50%);
	width: 80%;
	display: v-bind(display);
}

.accountSetupViewContainer__content.flex {
	flex-direction: column;
	row-gap: 50px;
	justify-content: center;
	align-items: center;
}

.accountSetupViewContainer__content.grid {
	column-gap: 10px;
}

.accountSetupViewContainer__buttons {
	position: absolute;
	top: 80%;
	left: 50%;
	transform: translateX(-50%);
}
</style>
