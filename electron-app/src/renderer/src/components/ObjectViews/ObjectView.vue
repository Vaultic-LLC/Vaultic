<template>
	<div class="objectViewContainer">
		<div class="objectViewForm" :style="{
			'grid-template-rows': `repeat(${gridDef.rows}, ${gridDef.rowHeight})`,
			'grid-template-columns': `repeat(${gridDef.columns}, ${gridDef.columnWidth})`
		}">
			<slot></slot>
		</div>
		<div class="createButtons">
			<button @click="onSave" :disabled="disabled" class="createButton" :style="buttonStyles">{{ buttonText
			}}</button>
			<button v-if="creating" @click="onSaveAndClose" :disabled="disabled" class="createButton"
				:style="buttonStyles">Create and Close</button>
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, provide, reactive, ref, watch } from 'vue';

import { ClosePopupFuncctionKey, ValidationFunctionsKey, DecryptFunctionsKey, RequestAuthorizationKey, ShowToastFunctionKey, RequestAuthenticationFunctionKey } from '../../Types/Keys';
import { GridDefinition } from '../../Types/Models';

export default defineComponent({
	name: "ObjectView",
	props: ['creating', 'title', 'color', 'defaultSave', 'gridDefinition'],
	setup(props)
	{
		const objectViewForm: Ref<HTMLElement | null> = ref(null);
		const primaryColor: ComputedRef<string> = computed(() => props.color);
		const buttonText: Ref<string> = ref(props.creating ? "Create" : "Save and Close");
		const closePopupFunction: ComputedRef<(saved: boolean) => void> | undefined = inject(ClosePopupFuncctionKey);
		const onSaveFunc: ComputedRef<() => Promise<boolean>> = computed(() => props.defaultSave);
		const disabled: Ref<boolean> = ref(false);

		const gridDef: ComputedRef<GridDefinition> = computed(() => props.gridDefinition);
		const showAuthPopup: Ref<boolean> = ref(false);

		let validationFunctions: Ref<{ (): boolean }[]> = ref([]);
		let decryptFunctions: Ref<{ (key: string): void }[]> = ref([]);
		const requestAuthorization: Ref<boolean> = ref(false);

		provide(ValidationFunctionsKey, validationFunctions);
		provide(DecryptFunctionsKey, decryptFunctions);
		provide(RequestAuthorizationKey, requestAuthorization);

		const requestAuthFunc: { (color: string, onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);
		const showToastFunction: { (color: string, toastText: string, success: boolean): void } = inject(ShowToastFunctionKey, () => { });

		const buttonStyles = reactive({
			border: `2px solid ${props.color}`,
			'--hover-color': props.color
		});

		function onSave()
		{
			disabled.value = true;
			let allValid: boolean = true;
			validationFunctions.value.forEach(f => allValid = f() && allValid);

			if (allValid)
			{
				onSaveFunc.value().then(() =>
				{
					if (!props.creating && closePopupFunction?.value)
					{
						closePopupFunction.value(true);
					}

					showToastFunction(primaryColor.value, "Saved Successfully", true);
				}).catch(() =>
				{
					// cancelled
				});
			}

			disabled.value = false;
		}

		function onSaveAndClose()
		{
			disabled.value = true;
			let allValid: boolean = true;
			validationFunctions.value.forEach(f => allValid = f() && allValid);

			if (allValid)
			{
				onSaveFunc.value().then(() =>
				{
					if (closePopupFunction?.value)
					{
						closePopupFunction.value(true);
					}

					showToastFunction(primaryColor.value, "Saved Successfully", true);
				}).catch(() =>
				{
					// cancelled
				});
			}

			disabled.value = false;
		}

		function onAuthenticationSuccessful(key: string)
		{
			showAuthPopup.value = false;
			decryptFunctions.value.forEach(f => f(key));
		}

		function authenticationCancelled()
		{
			showAuthPopup.value = false;
		}

		watch(() => requestAuthorization.value, (newValue) =>
		{
			if (!newValue)
			{
				return;
			}

			if (requestAuthFunc)
			{
				requestAuthFunc(primaryColor.value, onAuthenticationSuccessful, authenticationCancelled);
			}

			requestAuthorization.value = false;
		});

		return {
			buttonText,
			objectViewForm,
			gridDef,
			showAuthPopup,
			buttonStyles,
			disabled,
			onAuthenticationSuccessful,
			authenticationCancelled,
			onSave,
			onSaveAndClose
		};
	},
})
</script>

<style>
.objectViewContainer {
	position: relative;
	height: 90%;
	margin: 5%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.objectViewContainer .objectViewForm {
	height: 90%;
	width: 100%;
	display: grid;
	row-gap: 0px;
	column-gap: 0px;
}

.objectViewContainer .createButtons {
	position: absolute;
	bottom: 10%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	column-gap: 50px;
}

.objectViewContainer .createButtons .createButton {
	width: 200px;
	height: 50px;
	background-color: var(--app-color);
	color: white;
	border-radius: 10px;
	transition: 0.3s;
	font-size: 20px;
	animation: fadeIn 1s linear forwards;
}

.objectViewContainer .createButtons .createButton:hover {
	box-shadow: 0 0 25px var(--hover-color);
}

.objectViewContainer .createButtons .createButton:disabled,
.objectViewContainer .createButtons .createButton.disabled {
	box-shadow: 0 0 0 0;
	border: 2px solid gray;
	color: gray;
}
</style>
