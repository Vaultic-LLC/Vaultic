<template>
	<div class="accountSetupViewContainer">
		<div class="accountSetupViewContainer__header">
			<h2 class="accountSetupViewContainer__title">{{ title }}</h2>
		</div>
		<div class="accountSetupViewContainer__content"
			:class="{ flex: displayGrid == false, grid: displayGrid == true }" :style="{
				'grid-template-rows': `repeat(${gridDef?.rows}, ${gridDef?.rowHeight})`,
				'grid-template-columns': `repeat(${gridDef?.columns}, ${gridDef?.columnWidth})`
			}">
			<slot></slot>
		</div>
		<div class="accountSetupViewContainer__footer">
			<PopupButton :color="color" :disabled="disabled" :text="buttonText" :width="'7vw'" :minWidth="'75px'"
				:maxWidth="'150px'" :height="'4vh'" :minHeight="'30px'" :maxHeight="'45px'" :fontSize="'1.2vw'"
				:minFontSize="'13px'" :maxFontSize="'20px'" @onClick="onSubmit">
			</PopupButton>
			<slot name="footer"></slot>
			<!-- <div class="accountSetupViewContainer__buttons">
			</div> -->
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, provide, ref } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';

import { GridDefinition } from '@renderer/Types/Models';
import { DisableBackButtonFunctionKey, EnableBackButtonFunctionKey, ValidationFunctionsKey } from '@renderer/Types/Keys';

export default defineComponent({
	name: "AccountSetupViewPopup",
	components:
	{
		PopupButton
	},
	emits: ['onSubmit'],
	props: ['color', 'title', 'buttonText', 'displayGrid', 'gridDefinition', 'titleMargin', 'titleMarginTop'],
	setup(props, ctx)
	{
		const disabled: Ref<boolean> = ref(false);
		const display: ComputedRef<string> = computed(() => props.displayGrid ? "grid" : "flex");
		const gridDef: ComputedRef<GridDefinition> = computed(() => props.gridDefinition);

		const computedTitleMargin: ComputedRef<string> = computed(() => props.titleMargin ? props.titleMargin : "3%");
		const computedTitleMarginTop: ComputedRef<string> = computed(() => props.titleMarginTop ? props.titleMarginTop : "5%");

		let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);

		const disableBackButton: { (): void } = inject(DisableBackButtonFunctionKey, () => { });
		const enableBackButton: { (): void } = inject(EnableBackButtonFunctionKey, () => { });

		provide(ValidationFunctionsKey, validationFunctions);

		function onSubmit()
		{
			disableBackButton();
			disabled.value = true;

			let allValid: boolean = true;
			validationFunctions.value.forEach(f => allValid = f() && allValid);

			if (allValid)
			{
				ctx.emit('onSubmit');
			}

			disabled.value = false;
			enableBackButton();
		}

		return {
			display,
			gridDef,
			disabled,
			computedTitleMargin,
			computedTitleMarginTop,
			onSubmit
		}
	}
})
</script>

<style>
.accountSetupViewContainer {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	height: 100%;
}

.accountSetupViewContainer__header {
	margin-top: v-bind(computedTitleMarginTop);
}

.accountSetupViewContainer__title {
	font-size: clamp(13px, 1.5vw, 30px);
	color: white;
}

.accountSetupViewContainer__content {
	height: 100%;
	width: 80%;
	margin-top: v-bind(computedTitleMargin);
	display: v-bind(display);
	position: relative;
	z-index: 3;
}

@media (max-width: 900px) {
	.accountSetupViewContainer__content {
		width: 90%;
	}
}

.accountSetupViewContainer__content.flex {
	flex-direction: column;
	row-gap: 50px;
	justify-content: flex-start;
	align-items: center;
}

.accountSetupViewContainer__content.grid {
	column-gap: 10px;
}

.accountSetupViewContainer__footer {
	width: 100%;
	/* height: 10%; */
	flex-grow: 1;
	margin-bottom: 2.5vh;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	row-gap: 20px;
	position: relative;
	z-index: 1;
}
</style>
