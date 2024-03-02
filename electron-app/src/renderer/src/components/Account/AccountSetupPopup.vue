<template>
	<div class="accountSetupPopupContainer">
		<ObjectPopup :height="'60%'" :width="'40%'">
			<div>
				<Transition name="fade" mode="out-in">
					<IncorrectDeviceView v-if="accountSetupModel.currentView == AccountSetupView.IncorrectDevice"
						:updatesLeft="accountSetupModel.updateDevicesLeft" :devices="accountSetupModel.devices" />
					<UsernamePasswordView v-if="accountSetupModel.currentView == AccountSetupView.UsernamePassword"
						:color="primaryColor" @onSuccess="onUsernamePasswordViewSuccess"
						@onMoveToCreateAccount="moveToCreateAccount" />
					<CreateAccountView v-if="accountSetupModel.currentView == AccountSetupView.CreateAccount"
						:color="primaryColor" @onSuccess="onCreateAccoutViewSucceeded" />
					<MFAView v-if="accountSetupModel.currentView == AccountSetupView.MFA" :creating="creatingAccount"
						:accont="account" :color="primaryColor" @onSuccess="onMFAViewSucceeded" />
					<PaymentInfoView v-if="accountSetupModel.currentView == AccountSetupView.SetupPayment ||
						accountSetupModel.currentView == AccountSetupView.UpdatePayment ||
						accountSetupModel.currentView == AccountSetupView.ReActivate" :color="primaryColor" />
				</Transition>
			</div>
		</ObjectPopup>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import ObjectPopup from '../../../components/ObjectPopups/ObjectPopup.vue';
import { AccountSetupModel, AccountSetupView } from '@renderer/Types/Models';
import CreateAccountView from './CreateAccountView.vue';
import IncorrectDeviceView from './IncorrectDeviceView.vue';
import MFAView from './MFAView.vue';
import UsernamePasswordView from './UsernamePasswordView.vue';
import PaymentInfoView from './PaymentInfoView.vue';
import ReactivateAccountView from './ReactivateAccountView.vue';
import { Account } from '@renderer/Types/AccountSetup';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "AccountSetupPopup",
	components:
	{
		ObjectPopup,
		CreateAccountView,
		IncorrectDeviceView,
		MFAView,
		UsernamePasswordView,
		PaymentInfoView,
		ReactivateAccountView
	},
	emits: ['onAccountSetupComplete', 'reCheckLicense'],
	props: ['model'],
	setup(props, ctx)
	{
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		const accountSetupModel: Ref<AccountSetupModel> = ref(props.model);
		const creatingAccount: Ref<boolean> = ref(false);
		const account: Ref<Account> = ref({
			firstName: '',
			lastName: '',
			email: '',
			username: '',
			password: '',
			mfaKey: '',
			createdTime: -1
		});

		function onUsernamePasswordViewSuccess(username: string, password: string)
		{
			account.value.username = username;
			account.value.password = password;

			creatingAccount.value = false;
			accountSetupModel.value.currentView = AccountSetupView.MFA;
		}

		function moveToCreateAccount()
		{
			accountSetupModel.value.currentView = AccountSetupView.CreateAccount;
		}

		function onCreateAccoutViewSucceeded(firstName: string, lastName: string, email: string,
			username: string, password: string, mfaKey: string, createdTime: number)
		{
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

		watch(() => props.model, () =>
		{
			accountSetupModel.value = props.model;
		});

		return {
			AccountSetupView,
			accountSetupModel,
			creatingAccount,
			account,
			primaryColor,
			onUsernamePasswordViewSuccess,
			moveToCreateAccount,
			onCreateAccoutViewSucceeded,
			onMFAViewSucceeded
		}
	}
})
</script>

<style></style>
