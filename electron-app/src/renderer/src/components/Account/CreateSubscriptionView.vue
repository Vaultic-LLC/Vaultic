<template>
	<div class="paymentInfoView">
		<AccountSetupView :color="color" :title="title" :buttonText="buttonText" :displayGrid="false"
			:titleMargin="'clamp(15px, 0.8vw, 18px)'" :titleMarginTop="'clamp(15px, 0.8vw, 20px)'" @onSubmit="onSubmit">
			<div class="paymentInfoView__content">
				<div v-if="alreadyCreated == false">
					<h3 class="paymentInfoView__content__header">Subscribe to finish setting up your account and enable:
					</h3>
					<div class="paymentInfoView__features">
						<div class="paymentInfoView__feature">
							<CheckboxInputField :color="color" :disabled="true" :modelValue="true" />
							<div>Tracking of Breached Passwords</div>
						</div>
						<div class="paymentInfoView__feature">
							<CheckboxInputField :color="color" :disabled="true" :modelValue="true" />
							<div>Adding Passwords / Values</div>
						</div>
						<div class="paymentInfoView__feature">
							<CheckboxInputField :color="color" :disabled="true" :modelValue="true" />
							<div>Updating Passwords / Values</div>
						</div>
						<div class="paymentInfoView__feature">
							<CheckboxInputField :color="color" :disabled="true" :modelValue="true" />
							<div>Deleting Passwords / Values</div>
						</div>
						<div class="paymentInfoView__feature">
							<CheckboxInputField :color="color" :disabled="true" :modelValue="true" />
							<div>Premium Widgets</div>
						</div>
					</div>
				</div>
				<div v-else-if="alreadyCreated == true">
					<h3 class="paymentInfoView__content__header">
						There is an issue with your subscription. Please click the button below to view and
						update your payment information.
					</h3>
				</div>
			</div>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import { stores } from '@renderer/Objects/Stores';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';

export default defineComponent({
	name: "CreateSubscriptionView",
	components:
	{
		AccountSetupView,
		CheckboxInputField
	},
	props: ['color'],
	setup()
	{
		const url: Ref<string | undefined> = ref('');
		const alreadyCreated: Ref<boolean | undefined> = ref(undefined);

		const title: ComputedRef<string> = computed(() => alreadyCreated.value == true ? "Update Subscription" : "Sign Up");
		const buttonText: ComputedRef<string> = computed(() => alreadyCreated.value == true ? "View" : "Subscribe");

		async function onSubmit()
		{
			if (url.value && alreadyCreated.value != undefined)
			{
				window.open(url.value);
			}
		}

		onMounted(async () =>
		{
			const response = await window.api.server.user.createCheckout();
			stores.popupStore.hideLoadingIndicator();

			if (response.success)
			{
				alreadyCreated.value = response.alreadyCreated;
				url.value = response.url;
			}
			else
			{
				if (response.InvalidSession)
				{
					stores.popupStore.showSessionExpired();
				}
				else if (response.IncorrectDevice)
				{
					stores.popupStore.showIncorrectDevice(response);
				}
				else
				{
					stores.popupStore.showErrorResponseAlert(response);
				}
			}
		});

		return {
			onSubmit,
			alreadyCreated,
			buttonText,
			title
		}
	}
})
</script>

<style>
.paymentInfoView__content {
	margin-bottom: 30%;
}

.paymentInfoView__content__header {
	color: white;
}

.paymentInfoView__features {
	color: white;
	display: flex;
	flex-direction: column;
	row-gap: 10px;
	/* width: 50%;
	margin: auto; */
}

.paymentInfoView__feature {
	display: flex;
}
</style>
