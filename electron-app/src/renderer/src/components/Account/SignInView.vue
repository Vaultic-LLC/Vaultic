<template>
	<div class="usernamePasswordViewContainer">
		<AccountSetupView :color="color" :title="'Sign In'" :buttonText="'Sign In'" :displayGrid="false"
			:gridDefinition="gridDefinition" @onSubmit="onSubmit">
			<TextInputField :color="color" :label="'Username'" v-model="username"
				:style="{ 'grid-row': '1 / span 2', 'grid-column': '1 / span 2' }" />
			<EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="password" :initialLength="0"
				:isInitiallyEncrypted="false" :showRandom="false" :showUnlock="true" :required="true" :showCopy="false"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '1 / span 2' }" />
			<div class="usernamePasswordViewContainer__createAccountLink"
				:style="{ 'grid-row': '5', 'grid-column': '1 / span 3' }">Don't have an account?
				<button class="usernamePasswordViewContainer__createAccountLinkButton" @click="moveToCreateAccount">
					Create One
				</button>
			</div>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';

import { GridDefinition, InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';

export default defineComponent({
	name: "SignInView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView
	},
	emits: ['onMoveToCreateAccount', 'onSuccess'],
	props: ['color'],
	setup(props, ctx)
	{
		const username: Ref<string> = ref('');
		const password: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));
		const gridDefinition: GridDefinition = {
			rows: 5,
			rowHeight: '50px',
			columns: 3,
			columnWidth: '100px'
		}

		function moveToCreateAccount()
		{
			ctx.emit('onMoveToCreateAccount');
		}

		async function onSubmit()
		{
			const response = await window.api.server.validateUsernameAndPassword(username.value, password.value);
			if (response.Success)
			{
				ctx.emit('onSuccess', username.value, password.value);
			}
			else
			{
				if (response.IncorrectUsernameOrPassword)
				{
					// Show validation message
				}
				else if (response.IncorrectDevice)
				{
					// Is this possible?
					// technically, but it would be hard. The user would have to spoof their license in between
					// checking the license request and this one
				}
			}
		}

		return {
			username,
			password,
			colorModel,
			gridDefinition,
			moveToCreateAccount,
			onSubmit
		};
	}
})
</script>

<style>
.usernamePasswordViewContainer__createAccountLink {
	color: white;
	font-size: 17px;
}

.usernamePasswordViewContainer__createAccountLinkButton {
	background-color: var(--app-color);
	color: v-bind(color);
	text-decoration: underline;
	border: none;
	cursor: pointer;
	font-size: 17px;
}

.usernamePasswordViewContainer__createAccountLinkButton:hover {
	opacity: 0.8;
}
</style>
