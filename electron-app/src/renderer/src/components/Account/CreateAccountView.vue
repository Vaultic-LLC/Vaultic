<template>
	<div class="createAccountViewContainer">
		<AccountSetupView ref="mainView" :color="color" :title="'Create Account'" :buttonText="'Create'" @onSubmit="createAccount"
			:displayGrid="true" :gridDefinition="gridDefinition">
			<TextInputField :color="color" :label="'First Name'" v-model="firstName"
				:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
			<TextInputField :color="color" :label="'Last Name'" v-model="lastName"
				:style="{ 'grid-row': '1 / span 2', 'grid-column': '4 / span 2' }" />
			<TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email" :width="'300px'"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 4' }" />
			<TextInputField ref="usernameField" :color="color" :label="'Username'" v-model="username"
				:style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 2' }" />
			<EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="password" :initialLength="0"
				:isInitiallyEncrypted="false" :showRandom="false" :showUnlock="true" :required="true" :showCopy="false"
				:style="{ 'grid-row': '5 / span 2', 'grid-column': '4 / span 2' }" />
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import AccountSetupView from './AccountSetupView.vue';

import { GridDefinition, InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { FormComponent, InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "CreateAccountView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView
	},
	emits: ['onSuccess'],
	props: ['color', 'account'],
	setup(props, ctx)
	{
		const mainView: Ref<FormComponent | null> = ref(null);

		const emailField: Ref<InputComponent | null> = ref(null);
		const usernameField: Ref<InputComponent | null> = ref(null);

		const firstName: Ref<string> = ref(props.account.firstName);
		const lastName: Ref<string> = ref(props.account.lastName);
		const email: Ref<string> = ref(props.account.email);
		const username: Ref<string> = ref(props.account.username);
		const password: Ref<string> = ref(props.account.password);

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		const gridDefinition: GridDefinition = {
			rows: 6,
			rowHeight: '50px',
			columns: 6,
			columnWidth: '100px'
		}

		async function createAccount()
		{
			stores.popupStore.showLoadingIndicator(props.color);
			const response = await window.api.server.session.validateEmailAndUsername(email.value, username.value);

			if (response.success)
			{
				const mfaResponse = await window.api.server.session.generateMFA();

				stores.popupStore.hideLoadingIndicator();
				if (mfaResponse.success)
				{
					ctx.emit('onSuccess', firstName.value, lastName.value, email.value, username.value,
						password.value, mfaResponse.MFAKey, mfaResponse.GeneratedTime);
				}
				else if (response.UnknownError)
				{
					stores.popupStore.showErrorResponse(response);
				}
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
					mainView.value?.showAlertMessage(false, "There is already an account associated with this device. Please sign in using that account")
					return;
				}

				if (response.EmailIsTaken)
				{
					emailField.value?.invalidate("Email is already in use. Please use a different one");
				}

				if (response.UsernameIsTaken)
				{
					usernameField.value?.invalidate("Username is taken. Please pick a different one");
				}
			}
		}
		return {
			mainView,
			firstName,
			lastName,
			email,
			username,
			password,
			colorModel,
			gridDefinition,
			emailField,
			usernameField,
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
</style>
