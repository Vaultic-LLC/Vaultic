<template>
	<div class="usernamePasswordViewContainer">
		<div>
			<div v-if="creating">
				<div>Download app</div>
				<div>scan code</div>
				<div>enter code</div>
				<img src="" />
			</div>
			<TextInputField :color="color" :label="'Code'" v-model="mfaCode"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
			<button @click="onSubmitMFACode">Submit</button>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';
import TextInputField from '../InputFields/TextInputField.vue';
import { Account } from '@renderer/Types/AccountSetup';

export default defineComponent({
	name: "UsernamePasswordView",
	components:
	{
		TextInputField,
	},
	emits: ['onSuccess'],
	props: ['creating', 'account', 'color'],
	setup(props, ctx)
	{
		const account: ComputedRef<Account> = computed(() => props.account);
		const mfaCode: Ref<string> = ref('');

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

		return {
			account,
			mfaCode,
			onSubmitMFACode
		};
	}
})
</script>

<style></style>
