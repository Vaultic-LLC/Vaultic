<template>
	<div class="createAccountViewContainer">
		<AccountSetupView :color="color" :title="'Create Account'" :buttonText="'Create'" :titleMargin="'3%'"
			:titleMarginTop="'1.5%'" @onSubmit="createAccount">
			<Transition name="fade" mode="out-in">
				<div :key="refreshKey" class="createAccountViewContainer__content">
					<div class="createAccountViewContainer__inputs">
						<TextInputField :color="color" :label="'First Name'" v-model="firstName" :width="'80%'"
							:maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" />
						<TextInputField :color="color" :label="'Last Name'" v-model="lastName" :width="'80%'"
							:maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" />
						<TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email" :width="'80%'"
							:maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" :isEmailField="true" />
						<TextInputField ref="emailField" :color="color" :label="'Confirm Email'" v-model="reEnterEmail"
							:width="'80%'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" :isEmailField="true"
							:additionalValidationFunction="emailsMatch" />
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

import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';
import { defaultHandleFailedResponse } from '@renderer/Helpers/ResponseHelper';

export default defineComponent({
	name: "CreateAccountView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView,
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
		const reEnterEmail: Ref<string> = ref('');

		const alertMessage: Ref<string> = ref('');
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		async function createAccount()
		{
			stores.popupStore.showLoadingIndicator(props.color, 'Loading');
			const response = await window.api.server.session.validateEmail(email.value);
			stores.popupStore.hideLoadingIndicator();

			if (response.Success)
			{
				ctx.emit('onSuccess', firstName.value, lastName.value, email.value);
			}
			else
			{
				if (response.EmailIsTaken)
				{
					emailField.value?.invalidate("Email is already in use. Please use a different one");
				}
				else
				{
					defaultHandleFailedResponse(response);
				}
			}
		}

		function emailsMatch()
		{
			return [email.value === reEnterEmail.value, "Email does not match"];
		}

		return {
			refreshKey,
			firstName,
			lastName,
			email,
			colorModel,
			emailField,
			alertMessage,
			reEnterEmail,
			createAccount,
			emailsMatch
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
	width: 100%;
}

.createAccountViewContainer__inputs {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	row-gap: clamp(20px, 2vh, 30px);
	width: 100%;
}

.createAccountViewContainer__nameInputs {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 20px;
}
</style>
