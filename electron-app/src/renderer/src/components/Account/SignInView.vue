<template>
	<div class="signInViewContainer">
		<AccountSetupView :color="color" :title="'Sign In'" :buttonText="'Sign In'" :displayGrid="false"
			:titleMargin="'0'" @onSubmit="onSubmit">
			<Transition name="fade" mode="out-in">
				<div :key="refreshKey">
					<div class="signInViewContainer__content">
						<AlertBanner v-if="alertMessage" :message="alertMessage" />
						<div v-if="failedAutoLogin" class="signInViewContainer__inputs">
							<TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email"
								:width="'300px'" />
							<EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
								v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
								:showUnlock="true" :required="true" :showCopy="false" :width="'300px'" />
						</div>
						<div v-else>
							<EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
								v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
								:showUnlock="true" :required="true" :showCopy="false" :width="'300px'" />
						</div>
					</div>
					<div class="signInViewContainer__contentBottom">
						<div class="signInViewContainer__divider">
							<div class="signInViewContainer__divider__line"></div>
							<div class="signInViewContainer__divider__text">Or</div>
							<div class="signInViewContainer__divider__line"></div>
						</div>
						<div class="signInViewContainer__limitedMode">
							<ButtonLink :color="color" :text="'Continue in Offline Mode'"
								@onClick="moveToLimitedMode" />
						</div>
						<div class="signInViewContainer__createAccountLink">Don't have an account?
							<ButtonLink :color="color" :text="'Create One'" @onClick="moveToCreateAccount" />
						</div>
					</div>
				</div>
			</Transition>
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';
import AlertBanner from "./AlertBanner.vue"

import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';
import { InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';
import { Password } from '@renderer/Types/EncryptedData';

export default defineComponent({
	name: "SignInView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView,
		ButtonLink,
		AlertBanner
	},
	emits: ['onMoveToCreateAccount', 'onKeySuccess', 'onUsernamePasswordSuccess', 'onMoveToLimitedMode', 'onMoveToCreateOTP'],
	props: ['color', 'infoMessage'],
	setup(props, ctx)
	{
		const refreshKey: Ref<string> = ref('');

		const masterKeyField: Ref<InputComponent | null> = ref(null);
		const masterKey: Ref<string> = ref('');

		const emailField: Ref<InputComponent | null> = ref(null);
		const email: Ref<string> = ref('');

		const failedAutoLogin: Ref<boolean> = ref(false);
		const alertMessage: Ref<string> = ref('');
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		const contentBottomRowGap: ComputedRef<string> = computed(() => failedAutoLogin.value ? "20px" : "30px");
		const contentBottomMargin: ComputedRef<string> = computed(() => failedAutoLogin.value ? "15px" : alertMessage.value ? "50px" : "130px");

		function moveToCreateAccount()
		{
			ctx.emit('onMoveToCreateAccount');
		}

		function moveToLimitedMode()
		{
			if (stores.needsAuthentication)
			{
				stores.popupStore.showGlobalAuthentication(props.color);
			}

			ctx.emit('onMoveToLimitedMode');
		}

		async function didFailedAutoLogin()
		{
			refreshKey.value = Date.now().toString();
			await new Promise((resolve) => setTimeout(resolve, 300));

			stores.popupStore.hideLoadingIndicator();
			alertMessage.value = "Unable to find the email used for your Vaultic account in your Passwords. Please enter your email manually to sign in and re add it."
			failedAutoLogin.value = true;
		}

		async function onSubmit()
		{
			stores.popupStore.showLoadingIndicator(props.color);

			if (!failedAutoLogin.value)
			{
				if (!(await stores.passwordStore.canAuthenticateKeyBeforeEntry()))
				{
					didFailedAutoLogin();
					return;
				}
				else
				{
					const validKey = await stores.checkKeyBeforeEntry(masterKey.value);
					if (!validKey)
					{
						stores.popupStore.hideLoadingIndicator();
						masterKeyField.value?.invalidate("Master Key is incorrect");

						return;
					}

					await stores.loadStoreData(masterKey.value);
					if (!stores.passwordStore.hasVaulticPassword)
					{
						didFailedAutoLogin();
						stores.resetStoresToDefault();

						return;
					}

					const password: Password = stores.passwordStore.passwords.filter(p => p.isVaultic)[0];
					const response = await window.api.server.session.validateEmailAndMasterKey(password.email, masterKey.value);

					if (response.success)
					{
						ctx.emit('onKeySuccess');
					}
					else
					{
						handleFailedResponse(response);
					}
				}
			}
			else
			{
				// TODO: add stores and 'ReAddVaulticPassword' parameter
				const response = await window.api.server.session.validateEmailAndMasterKey(email.value, masterKey.value);

				// no matter what try to add the vaultic password. We can fail but still need to add it ex. license isn't valid
				await stores.handleUpdateStoreResponse(masterKey.value, response, true);

				if (response.success)
				{
					ctx.emit('onKeySuccess');
				}
				else
				{
					handleFailedResponse(response);
				}
			}
		}

		function handleFailedResponse(response: any)
		{
			stores.popupStore.hideLoadingIndicator();

			if (response.IncorrectDevice)
			{
				stores.popupStore.showIncorrectDevice(response);
			}
			else if (response.InvalidMasterKey)
			{
				masterKeyField.value?.invalidate("Incorrect Master Key. Pleaes try again");
				stores.resetStoresToDefault();
			}
			else if (response.UnknownEmail)
			{
				if (!failedAutoLogin.value)
				{
					failedAutoLogin.value = true;
				}
				else
				{
					emailField.value?.invalidate("Incorrect Email. Please try again");
				}

				stores.resetStoresToDefault();
			}
			else if (response.LicenseStatus && response.LicenseStatus != 1)
			{
				// TODO move to setup payment page
			}
			else if (response.UnknownError)
			{
				stores.popupStore.showErrorResponse(response);
				stores.resetStoresToDefault();
			}
		}

		onMounted(() =>
		{
			alertMessage.value = props.infoMessage;
		});

		return {
			refreshKey,
			masterKeyField,
			masterKey,
			emailField,
			email,
			colorModel,
			failedAutoLogin,
			alertMessage,
			contentBottomRowGap,
			contentBottomMargin,
			moveToCreateAccount,
			moveToLimitedMode,
			onSubmit,
		};
	}
})
</script>

<style>
.signInViewContainer {
	height: 100%;
}

.signInViewContainer__content {
	margin-top: 10px;
	row-gap: 20px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.signInViewContainer__inputs {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	row-gap: 20px;
}

.signInViewContainer__contentBottom {
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	row-gap: v-bind(contentBottomRowGap);
	margin-top: v-bind(contentBottomMargin);
}

.signInViewContainer__limitedMode {
	color: white;
}

.signInViewContainer__createAccountLink {
	color: white;
	font-size: 17px;
}

.signInViewContainer__divider {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 5px;
}

.signInViewContainer__divider__line {
	background-color: gray;
	height: 1px;
	border-radius: 20px;
	flex-grow: 1;
	min-width: 100%;
}

.signInViewContainer__divider__text {
	color: gray;
}
</style>
