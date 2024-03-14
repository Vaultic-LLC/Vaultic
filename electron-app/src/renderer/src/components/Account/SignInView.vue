<template>
	<div class="signInViewContainer">
		<AccountSetupView ref="mainView" :color="color" :title="'Sign In'" :buttonText="'Sign In'" :displayGrid="false"
			@onSubmit="onSubmit">
			<div class="signInViewContainer__content">
				<TextInputField ref="usernameField" :color="color" :label="'Username'" v-model="username"/>
				<EncryptedInputField ref="passwordField" :colorModel="colorModel" :label="'Password'" v-model="password" :initialLength="0"
					:isInitiallyEncrypted="false" :showRandom="false" :showUnlock="true" :required="true" :showCopy="false"/>
				<div class="signInViewContainer__limitedMode">Or
					<ButtonLink :color="color" :text="'Continue in Limited Mode'" @onClick="moveToLimitedMode"/>
				</div>
				<div class="signInViewContainer__createAccountLink">Don't have an account?
					<ButtonLink :color="color" :text="'Create One'" @onClick="moveToCreateAccount"/>
				</div>
			</div>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';

import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { FormComponent, InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "SignInView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView,
		ButtonLink
	},
	emits: ['onMoveToCreateAccount', 'onSuccess', 'onMoveToLimitedMode'],
	props: ['color', 'infoMessage'],
	setup(props, ctx)
	{
		const mainView: Ref<FormComponent | null> = ref(null);
		const usernameField: Ref<InputComponent | null> = ref(null);
		const passwordField: Ref<InputComponent | null> = ref(null);

		const username: Ref<string> = ref('');
		const password: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		function moveToCreateAccount()
		{
			ctx.emit('onMoveToCreateAccount');
		}

		function moveToLimitedMode()
		{
			ctx.emit('onMoveToLimitedMode');
		}

		async function onSubmit()
		{
			stores.popupStore.showLoadingIndicator(props.color);
			const response = await window.api.server.account.validateUsernameAndPassword(username.value, password.value);
			stores.popupStore.hideLoadingIndicator();

			if (response.success)
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
					stores.popupStore.showErrorResponse(response);
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
			onSubmit,
			moveToLimitedMode
		};
	}
})
</script>

<style>
.signInViewContainer {
	height: 100%;
}

.signInViewContainer__content {
	display: flex;
    flex-direction: column;
    row-gap: 30px;
    justify-content: center;
    align-items: center;
}

.signInViewContainer__limitedMode {
	color: white;
}

.signInViewContainer__createAccountLink {
	color: white;
	font-size: 17px;
}
</style>
