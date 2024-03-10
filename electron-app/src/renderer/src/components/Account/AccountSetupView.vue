<template>
	<div class="accountSetupViewContainer">
		<div class="accountSetupViewContainer__header">
			<h2 class="accountSetupViewContainer__title">{{ title }}</h2>
		</div>
		<Transition name="fade" mode="out-in">
			<div v-if="showErrorContainer" class="accountSetupViewContainer__errorContainer">
				<ion-icon name="alert-circle-outline"></ion-icon>
				{{ errorContainerMessage }}
			</div>
		</Transition>
		<div class="accountSetupViewContainer__content" :class="{ flex: displayGrid == false, grid: displayGrid == true }"
			:style="{
				'grid-template-rows': `repeat(${gridDef?.rows}, ${gridDef?.rowHeight})`,
				'grid-template-columns': `repeat(${gridDef?.columns}, ${gridDef?.columnWidth})`
			}">
			<slot></slot>
		</div>
		<div class="accountSetupViewContainer__buttons">
			<PopupButton :color="color" :disabled="disabled" :text="buttonText" :width="'150px'" :height="'40px'"
			 :fontSize="'18px'" @onClick="onSubmit">
			</PopupButton>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onUnmounted, provide, ref } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';

import { GridDefinition } from '@renderer/Types/Models';
import { ShowErrorContainerFunctionKey, ValidationFunctionsKey } from '@renderer/Types/Keys';

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
		const disabled: Ref<boolean> = ref(false);
		const display: ComputedRef<string> = computed(() => props.displayGrid ? "grid" : "flex");
		const gridDef: ComputedRef<GridDefinition> = computed(() => props.gridDefinition);

		let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);

		const showErrorContainer: Ref<boolean> = ref(false);
		const errorContainerMessage: Ref<string> = ref("");

		provide(ValidationFunctionsKey, validationFunctions);
		provide(ShowErrorContainerFunctionKey, showErrorContainerFunction);

		function onSubmit()
		{
			disabled.value = true;
			showErrorContainer.value = false;

			let allValid: boolean = true;
			validationFunctions.value.forEach(f => allValid = f() && allValid);

			if (allValid)
			{
				ctx.emit('onSubmit');
			}

			disabled.value = false;
		}

		function showErrorContainerFunction(message: string)
		{
			errorContainerMessage.value = message;
			showErrorContainer.value = true;
		}

		onUnmounted(() => showErrorContainer.value = false);

		return {
			display,
			gridDef,
			disabled,
			showErrorContainer,
			errorContainerMessage,
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
	margin-top: 5%;
}

.accountSetupViewContainer__title {
	color: white;
}

.accountSetupViewContainer__errorContainer {
	width: 5%;
	background-color: #ce4f36;
	border-radius: 5%;
	display: flex;
}

.accountSetupViewContainer__content {
	margin-top: 3%;
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
	flex-grow: 1;
	margin-bottom: 5%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
}
</style>

