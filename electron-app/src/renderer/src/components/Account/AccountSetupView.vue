<template>
	<div class="accountSetupViewContainer">
		<div class="accountSetupViewContainer__header">
			<h2 class="accountSetupViewContainer__title">{{ title }}</h2>
		</div>
		<Transition name="fade" mode="out-in">
			<div v-if="showAlertContainer" class="accountSetupViewContainer__alertContainer" :class="{info : alertIsInfo}">
				<ion-icon name="alert-circle-outline"></ion-icon>
				{{ alertMessage }}
			</div>
		</Transition>
		<div class="accountSetupViewContainer__content" :class="{ flex: displayGrid == false, grid: displayGrid == true }"
			:style="{
				'grid-template-rows': `repeat(${gridDef?.rows}, ${gridDef?.rowHeight})`,
				'grid-template-columns': `repeat(${gridDef?.columns}, ${gridDef?.columnWidth})`
			}">
			<slot></slot>
		</div>
		<div class="accountSetupViewContainer__footer">
			<slot name="footer"></slot>
			<PopupButton :color="color" :disabled="disabled" :text="buttonText" :width="'150px'" :height="'40px'"
			 :fontSize="'18px'" @onClick="onSubmit">
			</PopupButton>
			<!-- <div class="accountSetupViewContainer__buttons">
			</div> -->
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onUnmounted, provide, ref } from 'vue';

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
	props: ['color', 'title', 'buttonText', 'displayGrid', 'gridDefinition', 'titleMargin'],
	setup(props, ctx)
	{
		const disabled: Ref<boolean> = ref(false);
		const display: ComputedRef<string> = computed(() => props.displayGrid ? "grid" : "flex");
		const gridDef: ComputedRef<GridDefinition> = computed(() => props.gridDefinition);
		const computedTitleMargin: ComputedRef<string> = computed(() => props.titleMargin ? props.titleMargin : "3%");

		let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);

		const showAlertContainer: Ref<boolean> = ref(false);
		const alertIsInfo: Ref<boolean> = ref(false);
		const alertMessage: Ref<string> = ref('');

		const disableBackButton: { (): void } = inject(DisableBackButtonFunctionKey, () => {});
		const enableBackButton: { (): void } = inject(EnableBackButtonFunctionKey, () => {});

		provide(ValidationFunctionsKey, validationFunctions);

		function onSubmit()
		{
			disableBackButton();
			disabled.value = true;
			showAlertContainer.value = false;

			let allValid: boolean = true;
			validationFunctions.value.forEach(f => allValid = f() && allValid);

			if (allValid)
			{
				ctx.emit('onSubmit');
			}

			disabled.value = false;
			enableBackButton();
		}

		function showErrorMessage(isInfo: boolean, message: string)
		{
			alertIsInfo.value = isInfo;
			alertMessage.value = message;
			showAlertContainer.value = true;
		}

		onUnmounted(() => showAlertContainer.value = false);

		return {
			display,
			gridDef,
			disabled,
			showAlertContainer,
			alertMessage,
			alertIsInfo,
			computedTitleMargin,
			onSubmit,
			showErrorMessage
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
	margin-top: 5%;
}

.accountSetupViewContainer__title {
	color: white;
}

.accountSetupViewContainer__alertContainer {
	width: 5%;
	background-color: #ce4f36;
	border-radius: 5%;
	display: flex;
}

.accountSetupViewContainer__alertContainer.info{
	background-color: #3784d6;
}

.accountSetupViewContainer__content {
	margin-top: v-bind(computedTitleMargin);
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

.accountSetupViewContainer__footer {
	flex-grow: 1;
	margin-bottom: 5%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	row-gap: 20px;
}
</style>

