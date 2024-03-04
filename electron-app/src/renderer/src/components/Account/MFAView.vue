<template>
	<div class="usernamePasswordViewContainer">
		<AccountSetupView :color="color" :title="title" :displayGrid="false" :buttonText="'Submit'"
			:onSubmit="onSubmitMFACode">
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
			<TextInputField :color="color" :label="'Code'" v-model="mfaCode"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
		</AccountSetupView>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import AccountSetupView from './AccountSetupView.vue';

import { Account } from '@renderer/Types/AccountSetup';
import qrCode from "qrcode";

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
		const title: ComputedRef<string> = computed(() => props.creating ? "Setup Multifactor Authentication" : "Enter Multifactor Authentication Code");

		const account: ComputedRef<Account> = computed(() => props.account);
		const mfaCode: Ref<string> = ref('');

		const qrCodeUrl: Ref<string> = ref('');

		async function onSubmitMFACode()
		{
			if (props.creating)
			{
				const response = await window.api.server.createAccount(
					account.value.firstName, account.value.lastName, account.value.email, account.value.username, account.value.password,
					account.value.mfaKey, mfaCode.value, account.value.createdTime);

				if (response.Success)
				{
					ctx.emit('onSuccess');
				}
				else
				{
					if (response.ExpiredMFACode)
					{
						// send another request to get a new one and update mfaCode
					}
					else if (response.InvalidMFACode)
					{
						// notify user
					}
					else if (response.DeviceIsTaken)
					{
						// notify user
					}
					else if (response.UsernameIsTaken || response.EmailIsTaken)
					{
						// navigate back to the enter username / email page
					}
				}

			}
			else
			{
				const response = await window.api.server.validateMFACode(account.value.username, account.value.password, mfaCode.value);
				if (response.Success)
				{
					ctx.emit('onSuccess');
				}
				else
				{
					if (response.InvalidMFACode)
					{
						// notify user
					}
					else if (response.IncorrectDevice)
					{
						// notify user
					}
					else if (response.IncorrectUsernameOrPassword)
					{
						// navigate back to enter username / password page
					}
				}
			}
		}

		onMounted(() =>
		{
			const url = `otpauth://totp/${account.value.username}?secret=${account.value.mfaKey}&issuer=Vaultic`

			qrCode.toDataURL(url, function (err, data_url)
			{
				if (err)
				{
					// notify user
				}

				qrCodeUrl.value = data_url;
			});
		});

		return {
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
