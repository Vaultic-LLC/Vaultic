<template>
	<div class="signInViewContainer">
		<AccountSetupView ref="mainView" :color="color" :title="'Sign In'" :buttonText="'Sign In'" :displayGrid="false"
			@onSubmit="onSubmit">
			<TextInputField ref="usernameField" :color="color" :label="'Username'" v-model="username"/>
			<EncryptedInputField ref="passwordField" :colorModel="colorModel" :label="'Password'" v-model="password" :initialLength="0"
				:isInitiallyEncrypted="false" :showRandom="false" :showUnlock="true" :required="true" :showCopy="false"/>
			<div class="signInViewContainer__createAccountLink">Don't have an account?
				<button class="signInViewContainer__createAccountLinkButton" @click="moveToCreateAccount">
					Create One
				</button>
			</div>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';

import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { FormComponent, InputComponent } from '@renderer/Types/Components';
import { useUnknownResponsePopup } from '@renderer/Helpers/injectHelper';

export default defineComponent({
	name: "SignInView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView
	},
	emits: ['onMoveToCreateAccount', 'onSuccess'],
	props: ['color', 'infoMessage'],
	setup(props, ctx)
	{
		const mainView: Ref<FormComponent | null> = ref(null);
		const usernameField: Ref<InputComponent | null> = ref(null);
		const passwordField: Ref<InputComponent | null> = ref(null);

		const username: Ref<string> = ref('');
		const password: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		const showUnknownResponse = useUnknownResponsePopup();

		function moveToCreateAccount()
		{
			ctx.emit('onMoveToCreateAccount');
		}

		async function onSubmit()
		{
			const response = await window.api.server.account.validateUsernameAndPassword(username.value, password.value);
			if (response.Success)
			{
				ctx.emit('onSuccess', username.value, password.value);
			}
			else
			{
				if (response.IncorrectUsernameOrPassword)
				{
					usernameField.value?.invalidate("Username or Password is incorrect");
					passwordField.value?.invalidate("Username or Password is incorrect");
				}
				else if (response.UnknownError)
				{
					showUnknownResponse(response.StatusCode);
				}
			}
		}

		onMounted(() =>
		{
			if (props.infoMessage)
			{
				mainView.value?.showAlertMessage(true, props.infoMessage);
			}
		});

		return {
			mainView,
			usernameField,
			passwordField,
			username,
			password,
			colorModel,
			moveToCreateAccount,
			onSubmit
		};
	}
})
</script>

<style>
.signInViewContainer {
	height: 100%;
}

.signInViewContainer__createAccountLink {
	color: white;
	font-size: 17px;
}

.signInViewContainer__createAccountLinkButton {
	background-color: var(--app-color);
	color: v-bind(color);
	text-decoration: underline;
	border: none;
	cursor: pointer;
	font-size: 17px;
}

.signInViewContainer__createAccountLinkButton:hover {
	opacity: 0.8;
}
</style>
