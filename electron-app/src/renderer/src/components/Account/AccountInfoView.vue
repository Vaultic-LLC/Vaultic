<template>
	<div class="accountInfoView">
		<div class="accountInfoView__section">
			<h2 class="accountInfoView__sectionTitle">Payment / Subscription Information</h2>
			<div class="accountInfoView__viewSubscription">
				<div class="accountInfoView__text">
					To view or update your payment information, or cancel your subscription, click 'View Subscription'
					below
					and
					follow the instructions on screen.
				</div>
				<PopupButton :color="currentPrimaryColor" :disabled="disableButtons" :text="'View Subscription'"
					:width="'12vw'" :minWidth="'120px'" :maxWidth="'200px'" :height="'3vh'" :minHeight="'30px'"
					:maxHeight="'45px'" :fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'"
					@onClick="openPaymentInfoLink" />
			</div>
		</div>
		<div class="accountInfoView__section">
			<h2 class="accountInfoView__sectionTitle">Emergency Deactivation</h2>
			<div class="accountInfoView__deactivateSubscription">
				<div class="accountInfoView__text">
					If you are unable to access your subscription via the link in the 'Payment / Subscription
					Information'
					section above, and wish to cancel your subscription, you can do so by entering your
					deactivation key and clicking 'Deactivate'.
				</div>
				<div class="accountInfoView__deactivateSubscriptionControls">
					<TextInputField ref="emailField" :color="currentPrimaryColor" :label="'Email'" v-model="email"
						:width="'330px'" :maxWidth="'330px'" :minWidth="'330px'" :height="'4vh'" :minHeight="'35px'"
						:isEmailField="true" />
					<TextInputField ref="deactivationField" :color="currentPrimaryColor" :label="'Deactivation Key'"
						v-model="deactivationKey" :width="'330px'" :maxWidth="'330px'" :minWidth="'330px'"
						:height="'4vh'" :minHeight="'35px'" :additionalValidationFunction="isValidGuid" />
					<PopupButton :color="currentPrimaryColor" :disabled="disableButtons" :text="'Deactivate'"
						:width="'8vw'" :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'"
						:maxHeight="'45px'" :fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'"
						@onClick="deactivateSubscription" />
				</div>
			</div>
			<div class="accountInfoView__redownloadDeactivationKey">
				<div class="accountInfoView__text">
					If you lost your deactivation key, you can re download it by clicking 'Download'. Note, you can only
					download your deactivation key while signed in.
				</div>
				<PopupButton :color="currentPrimaryColor" :disabled="disableButtons" :text="'Download'" :width="'8vw'"
					:minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
					:fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'" @onClick="downloadDeactivationKey" />
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { computed, ComputedRef, defineComponent, provide, ref, Ref } from 'vue';

import ButtonLink from "../InputFields/ButtonLink.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';

import { stores } from '@renderer/Objects/Stores';
import { defaultHandleFailedResponse } from '@renderer/Helpers/ResponseHelper';
import { ValidationFunctionsKey } from '@renderer/Types/Keys';
import { InputComponent } from '@renderer/Types/Components';

export default defineComponent({
	name: "AccountInfoView",
	components:
	{
		ButtonLink,
		TextInputField,
		PopupButton
	},
	setup()
	{
		const currentPrimaryColor: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);

		const emailField: Ref<InputComponent | null> = ref(null);
		const deactivationField: Ref<InputComponent | null> = ref(null);

		const deactivationKey: Ref<string> = ref('');
		const email: Ref<string> = ref('');
		const disableButtons: Ref<boolean> = ref(false);

		const scrollbarColor: Ref<string> = ref('#0f111d');
		const thumbColor: Ref<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);

		let validationFunctions: Ref<{ (): boolean; }[]> = ref([]);
		provide(ValidationFunctionsKey, validationFunctions);

		function openPaymentInfoLink()
		{
			window.open('https://billing.stripe.com/p/login/28ocOR6vqa0Yeli5kk');
		}

		async function deactivateSubscription()
		{
			disableButtons.value = true;

			let allValid: boolean = true;
			validationFunctions.value.forEach(f => allValid = f() && allValid);

			if (!allValid)
			{
				disableButtons.value = false;
				return;
			}

			stores.popupStore.showLoadingIndicator(currentPrimaryColor.value, "Deactivating");
			const response = await window.api.server.user.deactivateUserSubscription(email.value, deactivationKey.value);

			stores.popupStore.hideLoadingIndicator();
			disableButtons.value = false;

			if (!response.Success)
			{
				if (response.UnknownEmail)
				{
					emailField.value?.invalidate("Incorrect email");
				}
				else if (response.IncorrectDeactivationKey)
				{
					deactivationField.value?.invalidate("Incorrect deactivation key");
				}
				else
				{
					defaultHandleFailedResponse(response);
				}

				return;
			}

			email.value = "";
			deactivationKey.value = "";
			stores.popupStore.showToast(currentPrimaryColor.value, "Deactivated", true);
		}

		async function downloadDeactivationKey()
		{
			disableButtons.value = true;
			stores.popupStore.showLoadingIndicator(currentPrimaryColor.value, "Downloading");

			const result = await window.api.helpers.vaultic.downloadDeactivationKey();

			stores.popupStore.hideLoadingIndicator();
			disableButtons.value = false;

			if (!result.Success)
			{
				defaultHandleFailedResponse(result);
				return;
			}
		}

		function isValidGuid(value: string): [boolean, string]
		{
			const isMatch = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(value);
			if (!isMatch)
			{
				return [false, "Pleaes ener a valid deactivation key"];
			}

			return [true, ''];
		}

		return {
			currentPrimaryColor,
			emailField,
			deactivationField,
			deactivationKey,
			email,
			disableButtons,
			scrollbarColor,
			thumbColor,
			openPaymentInfoLink,
			deactivateSubscription,
			downloadDeactivationKey,
			isValidGuid
		}
	}
})
</script>

<style>
.accountInfoView {
	color: white;
	overflow-y: scroll;
	overflow-x: hidden;
	height: 100%;
	width: 90%;
	direction: rtl;
	margin: auto;
}

.accountInfoView::-webkit-scrollbar {
	width: clamp(7px, 0.7vw, 10px);
}

.accountInfoView::-webkit-scrollbar-track {
	background: transparent;
}

.accountInfoView::-webkit-scrollbar-track {
	transition: 0.3s;
	background: v-bind(scrollbarColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.accountInfoView::-webkit-scrollbar-thumb {
	max-width: 50%;
	transition: 0.3s;
	background: v-bind(thumbColor);
	box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25);
	border-top-left-radius: 20px;
	border-bottom-left-radius: 20px;
}

.accountInfoView__section {
	display: flex;
	width: 80%;
	flex-direction: column;
	margin: auto;
	margin-bottom: 5%;
	align-items: center;
	direction: ltr;
}

.accountInfoView__sectionTitle {
	margin-bottom: 2%;
	font-size: clamp(15px, 1vw, 25px)
}

.accountInfoView__text {
	max-width: 700px;
	font-size: clamp(10px, 0.7vw, 15px)
}

.accountInfoView__viewSubscription {
	display: flex;
	flex-direction: column;
	align-items: center;
	row-gap: 20px;
}

.accountInfoView__deactivateSubscription {
	display: flex;
	flex-direction: column;
	align-items: center;
	row-gap: 20px;
}

.accountInfoView__deactivateSubscriptionControls {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	row-gap: 20px;
}

.accountInfoView__redownloadDeactivationKey {
	display: flex;
	flex-direction: column;
	align-items: center;
	row-gap: 20px;
	margin-top: 5%;
}
</style>
