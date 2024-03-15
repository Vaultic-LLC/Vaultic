<template>
	<div class="usernamePasswordViewContainer">
		<AccountSetupView ref="mainView" :color="color" :title="title" :displayGrid="false" :buttonText="'Submit'"
			@onSubmit="onSubmitMFACode">
			<div v-if="creating" class="usernamePasswordViewContainer__setupInstructions">
				<ol class="usernamePasswordViewContainer__list">
					<li>Download an authenticator app by searching for 'Authenticator' in your mobile device's app store
					</li>
					<li>Scan the QR code shown</li>
					<li>Enter the 6-digit code you see in the app into the input below and click submit</li>
				</ol>
				<img :src="qrCodeUrl" />
			</div>
			<div v-else class="usernamePasswordViewContainer__enterInstructions">
				<div>Enter the 6-digit code you see in your authenticator app into the input below and click submit</div>
			</div>
			<TextInputField ref="mfaCodeField" :color="color" :label="'Code'" v-model="mfaCode"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import AccountSetupView from './AccountSetupView.vue';

import { Account, LicenseStatus } from '@renderer/Types/AccountSetup';
import qrCode from "qrcode";
import { FormComponent, InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "MFAView",
	components:
	{
		TextInputField,
		AccountSetupView
	},
	emits: ['onSuccess'],
	props: ['creating', 'account', 'color'],
	setup(props, ctx)
	{
		const mainView: Ref<FormComponent | null> = ref(null);
		const mfaCodeField: Ref<InputComponent | null> = ref(null);

		const title: ComputedRef<string> = computed(() => props.creating ? "Setup Multifactor Authentication" : "Enter Multifactor Authentication Code");

		const account: Ref<Account> = ref(props.account);
		const mfaCode: Ref<string> = ref('');

		const qrCodeUrl: Ref<string> = ref('');

		async function onSubmitMFACode()
		{
			if (props.creating)
			{
				stores.popupStore.showLoadingIndicator(props.color);

				const response = await window.api.server.session.createAccount(
					account.value.firstName, account.value.lastName, account.value.email, account.value.username, account.value.password,
					account.value.mfaKey, mfaCode.value, account.value.createdTime);

				stores.popupStore.hideLoadingIndicator();

				if (response.success)
				{
					ctx.emit('onSuccess');
					stores.popupStore.hideLoadingIndicator();
				}
				else
				{
					if (response.UnknownError)
					{
						stores.popupStore.hideLoadingIndicator();

						stores.popupStore.showErrorResponse(response);
						return;
					}

					if (response.ExpiredMFACode)
					{
						const response = await window.api.server.session.generateMFA();
						stores.popupStore.hideLoadingIndicator();

						if (response.success)
						{
							account.value.mfaKey = response.MFAKey!;
							account.value.createdTime = response.GeneratedTime!;
							mainView.value?.showAlertMessage(true, "QR Code has expired. Please try again with this new one");
						}
						else
						{
							stores.popupStore.showErrorResponse(response);
						}
					}
					else if (response.InvalidMFACode)
					{
						stores.popupStore.hideLoadingIndicator();
						mfaCodeField.value?.invalidate("Incorrect code");

						return;
					}
					else if (response.DeviceIsTaken)
					{
						stores.popupStore.hideLoadingIndicator();
						mainView.value?.showAlertMessage(false, "There is already an account associated with this device. Please sign in using that account");

						return;
					}

					if (response.EmailIsTaken)
					{
						stores.popupStore.hideLoadingIndicator();
						mainView.value?.showAlertMessage(false, "Email is already in use. Please use a different one")
					}
					else if (response.UsernameIsTaken)
					{
						stores.popupStore.hideLoadingIndicator();
						mainView.value?.showAlertMessage(false, "Username is taken. Please pick a different one")
					}
				}
			}
			else
			{
				stores.popupStore.showLoadingIndicator(props.color);
				const response = await window.api.server.session.validateMFACode(account.value.username, account.value.password, mfaCode.value);
				stores.popupStore.hideLoadingIndicator();

				if (response.success)
				{
					ctx.emit('onSuccess');
				}
				else
				{
					if (response.UnknownError)
					{
						stores.popupStore.showErrorResponse(response);
						return;
					}

					if (response.InvalidMFACode)
					{
						mfaCodeField.value?.invalidate("Incorrect code");
					}
					else if (response.IncorrectDevice)
					{
						stores.popupStore.showIncorrectDevice(response);
					}
					else if (response.IncorrectUsernameOrPassword)
					{
						mainView.value?.showAlertMessage(false, "Incorrect Username or Password")
					}
					else if (response.LicenseStatus && response.LicenseStatus != LicenseStatus.Active)
					{
						// navigate to payment page with license status
					}
				}
			}
		}

		function generateQRCode()
		{
			const url = `otpauth://totp/${account.value.username}?secret=${account.value.mfaKey}&issuer=Vaultic`
			qrCode.toDataURL(url, function (err, data_url)
			{
				if (err)
				{
					mainView.value?.showAlertMessage(false, "Unable to generate MFA Code at this time. Please try again later or contact support")
				}

				qrCodeUrl.value = data_url;
			});
		}

		onMounted(() =>
		{
			generateQRCode();
		});

		return {
			mainView,
			mfaCodeField,
			account,
			mfaCode,
			title,
			qrCodeUrl,
			onSubmitMFACode
		};
	}
})
</script>

<style>
.usernamePasswordViewContainer__setupInstructions {
	display: flex;
}

.usernamePasswordViewContainer__enterInstructions {
	color: white;
}

.usernamePasswordViewContainer__list {
	color: white;
	text-align: left;
}


.usernamePasswordViewContainer__list li {
	margin: 10px;
}
</style>
