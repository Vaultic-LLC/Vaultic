<template>
	<div class="signInViewContainer" ref="container">
		<AccountSetupView :color="color" :title="'Sign In'" :buttonText="'Sign In'"
			:titleMargin="'clamp(15px, 0.8vw, 18px)'" :titleMarginTop="'clamp(15px, 0.8vw, 20px)'" @onSubmit="onSubmit">
			<Transition name="fade" mode="out-in">
				<div class="signInViewContainer__contentContainer" :key="refreshKey">
					<div class="signInViewContainer__content">
						<div v-if="showEmailField" class="signInViewContainer__inputs">
							<TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email"
								:width="'70%'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'"
								:isEmailField="true" />
							<EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
								v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
								:showUnlock="true" :required="true" :showCopy="false" :width="'70%'" :maxWidth="'300px'"
								:height="'4vh'" :minHeight="'35px'" />
						</div>
						<div v-else class="signInViewContainer__inputs">
							<EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
								v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
								:showUnlock="true" :required="true" :showCopy="false" :width="'70%'" :maxWidth="'300px'"
								:height="'4vh'" :minHeight="'35px'" />
						</div>
						<div class="signInViewContainer__navigation">
							<div v-if="showEmailField" class="signInViewContainer__arrow signInViewContainer__arrowLeft"
								@click="navigateLeft">
								<ion-icon name="chevron-back-outline"></ion-icon>
							</div>
							<div class="signInViewContainer__dots">
								<div class="signInViewContainer__dot"
									:class="{ 'signInViewContainer__dot--active': !showEmailField }">
								</div>
								<div class="signInViewContainer__dot"
									:class="{ 'signInViewContainer__dot--active': showEmailField }">
								</div>
							</div>
							<div v-if="!showEmailField"
								class="signInViewContainer__arrow signInViewContainer__arrowRight"
								@click="navigateRight">
								<ion-icon name="chevron-forward-outline"></ion-icon>
							</div>
						</div>
					</div>
				</div>
			</Transition>
			<template #footer>
				<div class="signInViewContainer__contentBottom">
					<div class="signInViewContainer__divider">
						<div class="signInViewContainer__divider__line"></div>
						<div class="signInViewContainer__divider__text">Or</div>
						<div class="signInViewContainer__divider__line"></div>
					</div>
					<div class="signInViewContainer__limitedMode">
						<ButtonLink :color="color" :text="'Continue in Offline Mode'" @onClick="moveToLimitedMode" />
					</div>
					<div class="signInViewContainer__createAccountLink">Don't have an account?
						<ButtonLink :color="color" :text="'Create One'" @onClick="moveToCreateAccount" />
					</div>
				</div>
			</template>
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
import { defaultHandleFailedResponse } from '@renderer/Helpers/ResponseHelper';

export default defineComponent({
	name: "SignInView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView,
		ButtonLink,
	},
	emits: ['onMoveToCreateAccount', 'onKeySuccess', 'onUsernamePasswordSuccess', 'onMoveToLimitedMode', 'onMoveToSetupPayment'],
	props: ['color', 'infoMessage'],
	setup(props, ctx)
	{
		const refreshKey: Ref<string> = ref('');
		const container: Ref<HTMLElement | null> = ref(null);
		const resizeHandler: ResizeObserver = new ResizeObserver(checkWidthHeightRatio);

		const masterKeyField: Ref<InputComponent | null> = ref(null);
		const masterKey: Ref<string> = ref('');

		const emailField: Ref<InputComponent | null> = ref(null);
		const email: Ref<string> = ref('');

		const showEmailField: Ref<boolean> = ref(false);
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		const contentBottomRowGap: Ref<string> = ref(showEmailField.value ? "min(1.5vh, 25px)" : "min(2.5vh, 40px)");
		const contentBottomMargin: ComputedRef<string> = computed(() => showEmailField.value ? "15px" : "130px");

		function moveToCreateAccount()
		{
			ctx.emit('onMoveToCreateAccount');
		}

		async function moveToLimitedMode()
		{
			if (await stores.appStore.canAuthenticateKey())
			{
				stores.popupStore.showGlobalAuthentication(props.color, true);
			}

			ctx.emit('onMoveToLimitedMode');
		}

		async function didFailedAutoLogin()
		{
			stores.popupStore.showAlert("Unable to auto log in", "Unable to find the email used for your Vaultic account in your Passwords. Please enter your email manually to sign in and re add it, or crate a new account.", false);
			refreshKey.value = Date.now().toString();
			await new Promise((resolve) => setTimeout(resolve, 300));

			stores.popupStore.hideLoadingIndicator();
			showEmailField.value = true;
		}

		async function onSubmit()
		{
			stores.popupStore.showLoadingIndicator(props.color);

			if (!showEmailField.value)
			{
				if (!(await stores.appStore.canAuthenticateKey()))
				{
					didFailedAutoLogin();
					return;
				}
				else
				{
					const validKey = await stores.appStore.authenticateKey(masterKey.value);
					if (!validKey)
					{
						stores.popupStore.hideLoadingIndicator();
						masterKeyField.value?.invalidate("Master Key is incorrect");
						resetToDefault();

						return;
					}

					await stores.passwordStore.readState(masterKey.value);
					if (!stores.passwordStore.hasVaulticPassword)
					{
						didFailedAutoLogin();
						resetToDefault();

						return;
					}

					const password: Password = stores.passwordStore.passwords.filter(p => p.isVaultic)[0];
					const response = await window.api.server.session.validateEmailAndMasterKey(password.email, masterKey.value);
					if (response.Success)
					{
						stores.appStore.isOnline = true;
						await stores.loadStoreData(masterKey.value);
						await stores.appStore.recordLogin(masterKey.value, Date.now());

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
				const response = await window.api.server.session.validateEmailAndMasterKey(email.value, masterKey.value);
				if (response.Success)
				{
					stores.appStore.isOnline = true;
					await overrideUserData();
					ctx.emit('onKeySuccess');
				}
				else
				{
					handleFailedResponse(response);
				}
			}
		}

		async function overrideUserData()
		{
			const response = await window.api.server.user.getUserData(masterKey.value);
			if (response.Success)
			{
				if (!(await stores.appStore.canAuthenticateKey()))
				{
					// user lost data files, force override all data
					await stores.checkUpdateStoresWithBackup(masterKey.value, response, true);
				}
				else
				{
					const validKey = await stores.appStore.authenticateKey(masterKey.value);
					if (!validKey)
					{
						// new user, force override all data
						await stores.checkUpdateStoresWithBackup(masterKey.value, response, true);
					}
					else
					{
						// same user, just needed to re add vaultic password
						// override data stores
						await stores.checkUpdateStoresWithBackup(masterKey.value, {
							...response,
							settingsStoreState: undefined,
							appStoreState: undefined,
							userPreferenceStoreState: undefined
						}, true);

						// check version on settigns, app, and user preferences and update accordingly since they could
						// be newer or not
						await stores.checkUpdateStoresWithBackup(masterKey.value, {
							...response,
							filterStoreState: undefined,
							groupStoreState: undefined,
							passwordStoreState: undefined,
							valueStoreState: undefined
						});
					}
				}
			}
			else
			{
				handleFailedResponse(response);
			}
		}

		function handleFailedResponse(response: any)
		{
			stores.popupStore.hideLoadingIndicator();
			if (response.InvalidMasterKey)
			{
				stores.popupStore.hideLoadingIndicator();

				masterKeyField.value?.invalidate("Incorrect Master Key. Pleaes try again");
				resetToDefault();
			}
			else if (response.UnknownEmail)
			{
				stores.popupStore.hideLoadingIndicator();

				if (!showEmailField.value)
				{
					showEmailField.value = true;
					stores.popupStore.showAlert("Unable to auto log in", "The email for your Vaultic account stored on your computer is incorrect. Please enter it manually in order to log in and update it locally.", false);
				}

				emailField.value?.invalidate("Incorrect Email. Please try again");
				resetToDefault();
			}
			else
			{
				defaultHandleFailedResponse(response);
			}
		}

		async function resetToDefault()
		{
			stores.appStore.resetToDefault();
			stores.passwordStore.resetToDefault();
		}

		function navigateLeft()
		{
			showEmailField.value = false;
			refreshKey.value = Date.now().toString();
		}

		function navigateRight()
		{
			showEmailField.value = true;
			refreshKey.value = Date.now().toString();
		}

		function checkWidthHeightRatio()
		{
			if (container.value)
			{
				const containerDimensions = container.value.getBoundingClientRect();
				// min dimensions of popup
				if (containerDimensions.width < 225 && containerDimensions.height <= 345)
				{
					contentBottomRowGap.value = "min(2.5vh, 40px)"
					return;
				}
			}

			if (window.innerHeight < 1200)
			{
				const ratio = window.innerWidth / window.innerHeight;
				if (ratio > 2)
				{
					contentBottomRowGap.value = "min(0.5vh, 10px)";
				}
				else if (ratio > 1.5)
				{
					contentBottomRowGap.value = "min(1.5vh, 25px)";
				}
				else
				{
					contentBottomRowGap.value = "min(2.5vh, 40px)"
				}
			}
			else
			{
				contentBottomRowGap.value = "min(2.5vh, 40px)"
			}
		}

		onMounted(() =>
		{
			if (props.infoMessage)
			{
				stores.popupStore.showAlert("Alert", props.infoMessage, false);
			}

			const body = document.getElementById('body');
			if (body)
			{
				resizeHandler.observe(body);
			}
		});

		return {
			refreshKey,
			container,
			masterKeyField,
			masterKey,
			emailField,
			email,
			colorModel,
			showEmailField,
			contentBottomRowGap,
			contentBottomMargin,
			moveToCreateAccount,
			moveToLimitedMode,
			onSubmit,
			navigateLeft,
			navigateRight
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
	margin-bottom: 10px;
}

.signInViewContainer__content {
	row-gap: clamp(15px, 2vh, 25px);
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	position: relative;
	/* set the height so that the elements below it don't jump arround when showing email field at smaller screen sizes */
	height: clamp(calc(90px + clamp(15px, 2vh, 25px) + clamp(7px, 0.5vw, 10px) + 10px),
			calc(8vh + 20px + clamp(15px, 2vh, 25px) + clamp(7px, 0.5vw, 10px) + 10px),
			calc(100px + 20px + clamp(15px, 2vh, 25px) + clamp(7px, 0.5vw, 10px) + 10px));
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
	/* height: 16vh; */
	display: flex;
	justify-content: flex-end;
	align-items: center;
	flex-direction: column;
	row-gap: v-bind(contentBottomRowGap);
	flex-grow: 1;
	/* margin-top: min(2vh, 30px); */
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

.signInViewContainer__arrow {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	color: gray;
	display: flex;
	font-size: clamp(20px, 1.8vw, 30px);
	will-change: transform;
	transition: 0.3s;
}

.signInViewContainer__arrow:hover {
	transform: translateY(-50%) scale(1.05);
	color: rgb(177, 177, 177);
}

.signInViewContainer__arrowLeft {
	left: clamp(-80px, -3vw, -40px);
}

.signInViewContainer__arrowRight {
	right: clamp(-80px, -3vw, -40px);
}

.signInViewContainer__navigation {
	display: flex;
	position: relative;
}

.signInViewContainer__dots {
	display: flex;
	column-gap: 10px;
	justify-content: center;
	align-items: center;
}

.signInViewContainer__dot {
	width: clamp(7px, 0.5vw, 10px);
	height: clamp(7px, 0.5vw, 10px);
	border: 1.5px solid v-bind(color);
	background-color: transparent;
	border-radius: 50%;
	transition: 0.3s;
}

.signInViewContainer__dot--active {
	background-color: v-bind(color);
	box-shadow: 0 0 10px v-bind(color);
}
</style>
