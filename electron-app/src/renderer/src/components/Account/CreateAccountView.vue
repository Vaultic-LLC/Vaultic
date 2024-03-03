<template>
	<div class="createAccountViewContainer">
		<AccountSetupView :color="color" :title="'Create Account'" :buttonText="'Create'" @onSubmit="createAccount"
			:displayGrid="true" :gridDefinition="gridDefinition">
			<TextInputField :color="color" :label="'First Name'" v-model="firstName"
				:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
			<TextInputField :color="color" :label="'Last Name'" v-model="lastName"
				:style="{ 'grid-row': '1 / span 2', 'grid-column': '4 / span 2' }" />
			<TextInputField :color="color" :label="'Email'" v-model="email" :width="'300px'"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 4' }" />
			<TextInputField :color="color" :label="'Username'" v-model="username"
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

export default defineComponent({
	name: "CreateAccountView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView
	},
	emits: ['onSuccess'],
	props: ['color'],
	setup(props, ctx)
	{
		const firstName: Ref<string> = ref('');
		const lastName: Ref<string> = ref('');
		const email: Ref<string> = ref('');
		const username: Ref<string> = ref('');
		const password: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		const gridDefinition: GridDefinition = {
			rows: 6,
			rowHeight: '50px',
			columns: 6,
			columnWidth: '100px'
		}

		async function createAccount()
		{
			// show loading indicator
			const response = await window.api.server.validateEmailAndUsername(email.value, username.value);
			if (response.Success)
			{
				const mfaResponse = await window.api.server.generateMFA();
				if (mfaResponse.Success)
				{
					ctx.emit('onSuccess', firstName.value, lastName.value, email.value, username.value,
						password.value, mfaResponse.MFAKey, mfaResponse.GeneratedTime);
				}
				else
				{
					// TODO: basic error handling
				}
			}
			else
			{
				if (response.EmailIsTaken)
				{
					// notify user
				}

				if (response.UsernameIsTaken)
				{
					// notify user
				}
			}
		}
		return {
			firstName,
			lastName,
			email,
			username,
			password,
			colorModel,
			gridDefinition,
			createAccount
		};
	}
})
</script>

<style>
.createAccountViewContainer__row {
	display: flex;
}
</style>
