<template>
	<div class="createAccountViewContainer">
		<AccountSetupView :color="color" :title="'Create Account'" :buttonText="'Create'" @onSubmit="createAccount">
			<Transition name="fade" mode="out-in">
				<div :key="refreshKey" class="createAccountViewContainer__content">
					<AlertBanner v-if="alertMessage" :message="alertMessage" />
					<div class="createAccountViewContainer__inputs">
						<div class="createAccountViewContainer__nameInputs">
							<TextInputField :color="color" :label="'First Name'" v-model="firstName" />
							<TextInputField :color="color" :label="'Last Name'" v-model="lastName" />
						</div>
						<TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email"
							:width="'415px'" />
					</div>
				</div>
			</Transition>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import AccountSetupView from './AccountSetupView.vue';
import AlertBanner from './AlertBanner.vue';

import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "CreateAccountView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView,
		AlertBanner
	},
	emits: ['onSuccess'],
	props: ['color', 'account'],
	setup(props, ctx)
	{
		const refreshKey: Ref<string> = ref('');

		const emailField: Ref<InputComponent | null> = ref(null);

		const firstName: Ref<string> = ref(props.account.firstName);
		const lastName: Ref<string> = ref(props.account.lastName);
		const email: Ref<string> = ref(props.account.email);

		const alertMessage: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		async function showAlertMessage()
		{
			stores.popupStore.hideLoadingIndicator();
			refreshKey.value = Date.now().toString();
			await new Promise((resolve) => setTimeout(resolve, 300));
			alertMessage.value = "There is already an account associated with this device. Please sign in using that account";
		}

		async function createAccount()
		{
			ctx.emit('onSuccess', firstName.value, lastName.value, email.value);
			return;

			const response = await window.api.server.session.validateEmail(email.value);

			if (response.success)
			{
				stores.popupStore.hideLoadingIndicator();
				ctx.emit('onSuccess', firstName.value, lastName.value, email.value);
			}
			else
			{
				stores.popupStore.hideLoadingIndicator();

				if (response.UnknownError)
				{
					stores.popupStore.showErrorResponse(response);
					return;
				}

				if (response.DeviceIsTaken)
				{
					showAlertMessage();
					return;
				}

				if (response.EmailIsTaken)
				{
					emailField.value?.invalidate("Email is already in use. Please use a different one");
				}
			}
		}
		return {
			refreshKey,
			firstName,
			lastName,
			email,
			colorModel,
			emailField,
			alertMessage,
			createAccount
		};
	}
})
</script>

<style>
.createAccountViewContainer {
	height: 100%;
}

.createAccountViewContainer__row {
	display: flex;
}

.createAccountViewContainer__content {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	row-gap: 30px;
}

.createAccountViewContainer__inputs {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	row-gap: 30px;
}

.createAccountViewContainer__nameInputs {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 20px;
}
</style>
