<template>
	<div class="paymentInfoView">
		<AccountSetupView :color="color" :title="'Sign Up'" :buttonText="'Subscribe'" :displayGrid="false"
			:titleMargin="'clamp(15px, 0.8vw, 18px)'" :titleMarginTop="'clamp(15px, 0.8vw, 20px)'" @onSubmit="onSubmit">
			<!-- TODO should show the price of the subscription somewhere here as well -->
			<div id="payment-element">
			</div>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "CreateSubscriptionView",
	components:
	{
		AccountSetupView
	},
	props: ['color'],
	setup(props)
	{
		//@ts-ignore
		const stripe = Stripe('pk_live_51Oo8kfLqVElHE0XY0ZBfiZEXBD60wiR9twJc3epBTLpe06Z1KQqIuwc8qjDpCH2NjRPSfszImK8dv9aMs8Y4gwqy00XoDfpmEB');
		let elements: any;

		let subscriptionID: string | undefined = '';
		let clientSecret: string | undefined = '';

		async function onSubmit()
		{
			stores.popupStore.showLoadingIndicator(props.color, "Loading");
			const { error } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: "", // TODO: This is suppose to redirect the user to an optional authorization step if needed. How
					// do I handle that? Would all of this just be easier using a link? Could I just use an IFrame instead and
					// load the link in there so the user doesn't have to leave the app?
				}
			});

			if (error)
			{
				stores.popupStore.hideLoadingIndicator();
				stores.popupStore.showAlert("An Error has occured", error.message, false);
			}
			else
			{
				checkPaymentStatus();
			}
		}

		function checkPaymentStatus()
		{
			stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) =>
			{
				switch (paymentIntent.status)
				{
					case 'succeeded':
						stores.popupStore.hideLoadingIndicator();
						stores.popupStore.showToast(props.color, "Success", true);
						break;
					case 'processing':
						// TODO: this might not work if the user needs to authenticate and i'm just waiting on them
						setTimeout(checkPaymentStatus, 3000);
						break;
					case 'requires_payment_method':
					default:
						stores.popupStore.hideLoadingIndicator();
						stores.popupStore.showAlert("An Error has Occured", 'Payment failed. Please try another payment method.', false);
						break;
				}
			});
		}

		onMounted(async () =>
		{
			const response = await window.api.server.user.createPaymentIntent();
			stores.popupStore.hideLoadingIndicator();

			if (response.success)
			{
				subscriptionID = response.SubscriptionID;
				clientSecret = response.ClientSecret;

				const options = {
					business: "Vaultic LLC",
					clientSecret: clientSecret,
					appearance: {
						theme: 'night',
						type: 'tabs',
						defaultCollapsed: false,
					},
				};

				// Set up Stripe.js and Elements to use in checkout form, passing the client secret obtained in step 5
				elements = stripe.elements(options);

				const paymentElement = elements.create('payment');
				paymentElement.mount('#payment-element');
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
			onSubmit
		}
	}
})
</script>

<style></style>
