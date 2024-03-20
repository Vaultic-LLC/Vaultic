<template>
	<div class="signInViewContainer">
		<AccountSetupView ref="mainView" :color="color" :title="'Sign In'" :buttonText="'Sign In'" :displayGrid="false"
			:titleMargin="'0'" @onSubmit="onSubmit">
			<div class="signInViewContainer__content">
                <Transition name="fade" mode="out-in">
                    <div class="signInViewContainer__inputCarousel" :key="refreshKey">
                        <div ref="inputCarouselTop" class="signInViewContainer__inputCarousel__top">
                            <div v-if="inputView == 1" class="signInViewContainer__inputCarousel__navigationButton left"
                                    @click="updateInputView(0)">
                                <ion-icon name="chevron-back-outline"></ion-icon>
                            </div>
                            <div v-if="inputView == 0" ref="usernamePasswordInput" class="signInViewContainer__inputCarousel__inputs">
                                <TextInputField ref="usernameField" :color="color" :label="'Username'" v-model="username"/>
                                <EncryptedInputField ref="passwordField" :colorModel="colorModel" :label="'Password'" v-model="password"
                                :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false" :showUnlock="true" :required="true"
                                :showCopy="false"/>
                            </div>
                            <div v-else-if="inputView == 1" ref="masterKeyInput" class="signInViewContainer__inputCarousel__inputs">
                                <EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'" v-model="masterKey"
                                :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false" :showUnlock="true" :required="true"
                                :showCopy="false"/>
                            </div>
                            <div v-if="inputView == 0" class="signInViewContainer__inputCarousel__navigationButton right"
                                @click="updateInputView(1)">
                                <ion-icon name="chevron-forward-outline"></ion-icon>
                            </div>
                        </div>
                    </div>
                </Transition>
			</div>
			<template #footer>
				<div class="signInViewContainer__contentBottom">
					<div class="signInViewContainer__divider">
						<div class="signInViewContainer__divider__line"></div>
						<div class="signInViewContainer__divider__text">Or</div>
						<div class="signInViewContainer__divider__line"></div>
					</div>
					<div class="signInViewContainer__limitedMode">
						<ButtonLink :color="color" :text="'Continue in Offline Mode'" @onClick="moveToLimitedMode"/>
					</div>
					<div class="signInViewContainer__forgotPassword">
						<ButtonLink :color="color" :text="'Forgot Username or Password'" @onClick="moveToCreateOTP"/>
					</div>
					<div class="signInViewContainer__createAccountLink">Don't have an account?
						<ButtonLink :color="color" :text="'Create One'" @onClick="moveToCreateAccount"/>
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
import { FormComponent, InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';
import { Password } from '@renderer/Types/EncryptedData';
import cryptHelper from '@renderer/Helpers/cryptHelper';

export default defineComponent({
	name: "SignInView",
	components:
	{
		TextInputField,
		EncryptedInputField,
		AccountSetupView,
		ButtonLink
	},
	emits: ['onMoveToCreateAccount', 'onSuccess', 'onMoveToLimitedMode', 'onMoveToCreateOTP'],
	props: ['color', 'infoMessage'],
	setup(props, ctx)
	{
        const refreshKey: Ref<string> = ref('');

		const mainView: Ref<FormComponent | null> = ref(null);
		const usernameField: Ref<InputComponent | null> = ref(null);
		const passwordField: Ref<InputComponent | null> = ref(null);
        const masterKeyField: Ref<InputComponent | null> = ref(null);

		const inputCarouselTop: Ref<HTMLElement | null> = ref(null);
		const usernamePasswordInput: Ref<HTMLElement | null> = ref(null);
		const masterKeyInput: Ref<HTMLElement | null> = ref(null);

		const inputView: Ref<number> = ref(0);

		const username: Ref<string> = ref('');
		const password: Ref<string> = ref('');
        const masterKey: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

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

		async function onSubmit()
		{
			stores.popupStore.showLoadingIndicator(props.color);
			if (inputView.value == 0)
			{
				const response = await window.api.server.session.validateUsernameAndPassword(username.value, password.value);
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
			else if (inputView.value == 1)
			{
                if (!(await stores.passwordStore.canAuthenticateKeyBeforeEntry()))
                {
					stores.popupStore.hideLoadingIndicator();
                    mainView.value?.showAlertMessage(false, "Unable to find Vaultic Password. Please add it to your Passwords within the app before signing in with your Master Key");

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
						stores.popupStore.hideLoadingIndicator();
						mainView.value?.showAlertMessage(false, "Unable to find Vaultic Password. Please add it to your Passwords within the app before signing in with your Master Key");
						stores.resetStoresToDefault();

                    	return;
					}

					const password: Password = stores.passwordStore.passwords.filter(p => p.isVaultic)[0];
					const decryptedPasswordResposne = await cryptHelper.decrypt(masterKey.value, password.password);

					if (!decryptedPasswordResposne.success)
					{
						stores.popupStore.hideLoadingIndicator();
						stores.resetStoresToDefault();

						return;
					}

					const response = await window.api.server.session.validateUsernameAndPassword(password.login, decryptedPasswordResposne.value!);
					if (response.success)
					{
						stores.popupStore.hideLoadingIndicator();
						ctx.emit('onSuccess', password.login, decryptedPasswordResposne.value);
					}
					else
					{
						if (response.IncorrectUsernameOrPassword)
						{
							mainView.value?.showAlertMessage(false, "The Username or Password you have stored for your Vaultic Account is incorrect. Please try entering it manually or click 'Forgot my Username or Password'");
							stores.resetStoresToDefault();
						}
						else if (response.UnknownError)
						{
							stores.popupStore.showErrorResponse(response);
							stores.resetStoresToDefault();
						}
					}
                }
			}
		}

        function updateInputView(index: number)
        {
            inputView.value = index;
            refreshKey.value = Date.now().toString();
        }

		function moveToCreateOTP()
		{
			ctx.emit('onMoveToCreateOTP');
		}

		onMounted(() =>
		{
			if (props.infoMessage)
			{
				mainView.value?.showAlertMessage(true, props.infoMessage);
			}
		});

		return {
            refreshKey,
			mainView,
			usernameField,
			passwordField,
            masterKeyField,
			inputCarouselTop,
			usernamePasswordInput,
			masterKeyInput,
			username,
			password,
            masterKey,
			colorModel,
			inputView,
			moveToCreateAccount,
			onSubmit,
			moveToLimitedMode,
            updateInputView,
			moveToCreateOTP
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
    /* row-gap: 30px; */
    justify-content: center;
    align-items: center;
	transition: 0.3s;
	position: relative;
}

.signInViewContainer__inputCarousel {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	transition: 0.3s;
}

.signInViewContainer__inputCarousel__top {
	position: relative;
	margin-top: 15px;
}

.signInViewContainer__inputCarousel__navigationButton {
	display: flex;
	justify-content: center;
	align-items: center;
	color: grey;
	font-size: 35px;
	cursor: pointer;
	position:absolute;
	transition: 0.3s;
	top: 50%;
	transform: translateY(-50%);
}

.signInViewContainer__inputCarousel__navigationButton:hover {
	/* transform: scale(1.05); */
	color: v-bind(color);
}

.signInViewContainer__inputCarousel__navigationButton.right {
	right: -38%;
}

.signInViewContainer__inputCarousel__navigationButton.left {
	left: -38%;
}

.signInViewContainer__inputCarousel__inputs {
	display: flex;
	flex-direction: column;
	row-gap: 30px;
	justify-content: center;
	align-items: center;
}

.signInViewContainer__inputCarousel__activeViewIcons {
	display: flex;
	justify-content: center;
	align-items: center;
	column-gap: 10px;
	margin-top: 15px;
	transition: 0.3s;
}

.signInViewContainer__inputCarousel__activeViewIcon {
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 50%;
	transition: 0.3s;
	position: relative;
	color: white;
	font-size: 1.2rem;
}

.signInViewContainer__inputCarousel__activeViewIcon.active {
	color: v-bind(color);
}

.signInViewContainer__contentBottom {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    row-gap: 20px;
	margin-bottom: 27px;
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
