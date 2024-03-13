<template>
	<div class="accountSetupPopupContainer">
		<ObjectPopup :height="'40%'" :width="'30%'" :preventClose="true" :glassOpacity="1" :showPulsing="true">
			<Transition name="fade" mode="out-in">
				<div v-if="navigationStack.length > 0 && !disableBack" class="accountSetupPopupContainer__backButton"
					@click="navigateBack">
					<ion-icon name="arrow-back-outline"></ion-icon>
				</div>
			</Transition>
			<Transition name="fade" mode="out-in">
				<SignInView v-if="accountSetupModel.currentView == AccountSetupView.SignIn" :color="primaryColor"
					:infoMessage="accountSetupModel.infoMessage" @onSuccess="onUsernamePasswordViewSuccess"
					@onMoveToCreateAccount="moveToCreateAccount" @onMoveToLimitedMode="close" />
				<CreateAccountView v-else-if="accountSetupModel.currentView == AccountSetupView.CreateAccount"
					:color="primaryColor" :account="account" @onSuccess="onCreateAccoutViewSucceeded" />
				<MFAView v-else-if="accountSetupModel.currentView == AccountSetupView.MFA" :creating="creatingAccount"
					:account="account" :color="primaryColor" @onSuccess="onMFAViewSucceeded" />
				<PaymentInfoView v-else-if="accountSetupModel.currentView == AccountSetupView.SetupPayment ||
					accountSetupModel.currentView == AccountSetupView.UpdatePayment ||
					accountSetupModel.currentView == AccountSetupView.ReActivate" :color="primaryColor" />
			</Transition>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onUnmounted, provide, ref, watch } from 'vue';

import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import CreateAccountView from './CreateAccountView.vue';
import MFAView from './MFAView.vue';
import SignInView from './SignInView.vue';
import PaymentInfoView from './PaymentInfoView.vue';

import { AccountSetupModel, AccountSetupView } from '@renderer/Types/Models';
import { Account } from '@renderer/Types/AccountSetup';
import { stores } from '@renderer/Objects/Stores';
import { DisableBackButtonFunctionKey, EnableBackButtonFunctionKey } from '@renderer/Types/Keys';

export default defineComponent({
	name: "AccountSetupPopup",
	components:
	{
		ObjectPopup,
		CreateAccountView,
		MFAView,
		SignInView,
		PaymentInfoView
	},
	emits: ['onAccountSetupComplete', 'reCheckLicense', 'onClose'],
	props: ['model'],
	setup(props, ctx)
	{
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);
		const accountSetupModel: Ref<AccountSetupModel> = ref(props.model);
		const navigationStack: Ref<AccountSetupView[]> = ref([]);
		const disableBack: Ref<boolean> = ref(false);

		const creatingAccount: Ref<boolean> = ref(false);
		const account: Ref<Account> = ref({
			firstName: '',
			lastName: '',
			email: '',
			username: '',
			password: '',
			mfaKey: '',
			createdTime: ''
		});

		provide(DisableBackButtonFunctionKey, disableBackButtonFunction);
		provide(EnableBackButtonFunctionKey, enableBackButtonFunction);

		function onUsernamePasswordViewSuccess(username: string, password: string)
		{
			account.value.username = username;
			account.value.password = password;

			creatingAccount.value = false;
			accountSetupModel.value.currentView = AccountSetupView.MFA;
		}

		function moveToCreateAccount()
		{
			navigationStack.value.push(AccountSetupView.SignIn);
			accountSetupModel.value.currentView = AccountSetupView.CreateAccount;
		}

		function onCreateAccoutViewSucceeded(firstName: string, lastName: string, email: string,
			username: string, password: string, mfaKey: string, createdTime: string)
		{
			navigationStack.value.push(AccountSetupView.CreateAccount);

			account.value.firstName = firstName;
			account.value.lastName = lastName;
			account.value.email = email;
			account.value.username = username;
			account.value.password = password;
			account.value.mfaKey = mfaKey;
			account.value.createdTime = createdTime;

			creatingAccount.value = true;
			accountSetupModel.value.currentView = AccountSetupView.MFA;
		}

		function onMFAViewSucceeded()
		{
			if (creatingAccount.value)
			{
				accountSetupModel.value.currentView = AccountSetupView.SetupPayment;
			}
			else
			{
				ctx.emit('onAccountSetupComplete');
			}
		}

		function navigateBack()
		{
			const view: AccountSetupView | undefined = navigationStack.value.shift();
			if (view)
			{
				accountSetupModel.value.currentView = view;
			}
		}

		function disableBackButtonFunction()
		{
			disableBack.value = true;
		}

		function enableBackButtonFunction()
		{
			disableBack.value = false;
		}

		function close()
		{
			ctx.emit('onClose');
		}

		watch(() => props.model.currentView, () =>
		{
			accountSetupModel.value = props.model;
		});

		onUnmounted(() =>
		{
			accountSetupModel.value.infoMessage = "";
		});

		return {
			AccountSetupView,
			accountSetupModel,
			creatingAccount,
			account,
			primaryColor,
			navigationStack,
			disableBack,
			onUsernamePasswordViewSuccess,
			moveToCreateAccount,
			onCreateAccoutViewSucceeded,
			onMFAViewSucceeded,
			navigateBack,
			close
		}
	}
})
</script>

<style>
.accountSetupPopupContainer {
	width: 100%;
	height: 100%;
	top: 0%;
	z-index: 150;
	position: fixed;
}

.accountSetupPopupContainer__backButton {
	color: v-bind(primaryColor);
	font-size: 20px;
	position: absolute;
	top: 5%;
	left: 5%;
	transition: 0.3s;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: v-bind(primaryColor);
	width: 30px;
	height: 30px;
	cursor: pointer;
}

.accountSetupPopupContainer__backButton::before {
	content: '';
	position: absolute;
	width: 90%;
	height: 90%;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	border-radius: 50%;
	background-color: var(--app-color);
}

.accountSetupPopupContainer__backButton:hover {
	box-shadow: 0 0 25px v-bind(primaryColor);

}
</style>
