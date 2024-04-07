<template>
	<div class="objectViewContainer">
		<div class="objectViewForm" :style="{
			'grid-template-rows': `repeat(${gridDef.rows}, ${gridDef.rowHeight})`,
			'grid-template-columns': `repeat(${gridDef.columns}, ${gridDef.columnWidth})`
		}">
			<slot></slot>
		</div>
		<div class="createButtons">
			<PopupButton :color="color" :text="buttonText" :disabled="disabled" :width="'10vw'" :minWidth="'125px'"
				:maxWidth="'200px'" :maxHeight="'50px'" :minHeight="'35px'" :height="'2vw'" :fontSize="'1vw'"
				:minFontSize="'13px'" :maxFontSize="'20px'" @onClick="onSave" />
			<PopupButton :color="color" :text="'Create and Close'" :disabled="disabled" :width="'10vw'"
				:minWidth="'125px'" :maxWidth="'200px'" :maxHeight="'50px'" :minHeight="'35px'" :height="'2vw'"
				:fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'" :isSubmit="true"
				@onClick="onSaveAndClose" />
		</div>
	</div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, provide, ref, watch } from 'vue';

import { ClosePopupFuncctionKey, ValidationFunctionsKey, DecryptFunctionsKey, RequestAuthorizationKey } from '../../Types/Keys';
import { GridDefinition } from '../../Types/Models';
import PopupButton from '../InputFields/PopupButton.vue';
import { stores } from '@renderer/Objects/Stores';

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

		let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);
		let decryptFunctions: Ref<{ (key: string): void; }[]> = ref([]);

		const requestAuthorization: Ref<boolean> = ref(false);
		provide(ValidationFunctionsKey, validationFunctions);
		provide(DecryptFunctionsKey, decryptFunctions);
		provide(RequestAuthorizationKey, requestAuthorization);

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

					stores.popupStore.showToast(primaryColor.value, "Saved Successfully", true);
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

					stores.popupStore.showToast(primaryColor.value, "Saved Successfully", true);
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

			stores.popupStore.showRequestAuthentication(primaryColor.value,
				onAuthenticationSuccessful, authenticationCancelled);

			requestAuthorization.value = false;
		});

		return {
			buttonText,
			objectViewForm,
			gridDef,
			showAuthPopup,
			disabled,
			onAuthenticationSuccessful,
			authenticationCancelled,
			onSave,
			onSaveAndClose
		};
	},
	components: { PopupButton }
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
	position: relative
}

.objectViewContainer .createButtons {
	margin-bottom: clamp(3%, 1.5vw, 10%);
	display: flex;
	align-items: center;
	justify-content: space-between;
	column-gap: 50px;
}
</style>
