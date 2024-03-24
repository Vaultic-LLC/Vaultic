<template>
	<div class="signInViewContainer">
		<AccountSetupView :color="color" :title="'Sign In'" :buttonText="'Sign In'" :displayGrid="false"
			:titleMargin="'2%'" :titleMarginTop="'3%'" @onSubmit="onSubmit">
			<Transition name="fade" mode="out-in">
				<div class="signInViewContainer__contentContainer" :key="refreshKey">
					<div class="signInViewContainer__content">
						<div v-if="true" class="signInViewContainer__inputs">
							<TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email"
								:width="'80%'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" />
							<EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
								v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
								:showUnlock="true" :required="true" :showCopy="false" :width="'80%'" :maxWidth="'300px'"
								:height="'4vh'" :minHeight="'35px'" />
						</div>
						<div v-else>
							<EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
								v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
								:showUnlock="true" :required="true" :showCopy="false" :width="'80%'" :maxWidth="'300px'"
								:height="'4vhh'" :minHeight="'35px'" />
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
						<!-- Add an empty div so row gap acts as margin. Using margin causes the row-gap property to not work at some sizes -->
						<div></div>
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
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		const contentBottomRowGap: ComputedRef<string> = computed(() => failedAutoLogin.value ? "20%" : "20%");
		const contentBottomMargin: ComputedRef<string> = computed(() => failedAutoLogin.value ? "15px" : "130px");

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
			stores.popupStore.showAlert("Unable to auto log in", "Unable to find the email used for your Vaultic account in your Passwords. Please enter your email manually to sign in and re add it.", false);
			refreshKey.value = Date.now().toString();
			await new Promise((resolve) => setTimeout(resolve, 300));

			stores.popupStore.hideLoadingIndicator();
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
				stores.popupStore.showErrorResponseAlert(response);
				stores.resetStoresToDefault();
			}
		}

		onMounted(() =>
		{
			if (props.infoMessage)
			{
				stores.popupStore.showAlert("Alert", props.infoMessage, false);
			}
		});

		return {
			refreshKey,
			masterKeyField,
			masterKey,
			emailField,
			email,
			colorModel,
			failedAutoLogin,
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

.signInViewContainer__contentContainer {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
}

.signInViewContainer__content {
	row-gap: 20px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

.signInViewContainer__inputs {
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
	row-gap: 20px;
}

.signInViewContainer__contentBottom {
	height: 10vh;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-direction: column;
	row-gap: 8%;
	flex-grow: 1;
}

.signInViewContainer__limitedMode {
	color: white;
}

.signInViewContainer__createAccountLink {
	color: white;
	font-size: clamp(13px, 1vw, 20px);
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
	font-size: clamp(13px, 1vw, 20px);
}
</style>
