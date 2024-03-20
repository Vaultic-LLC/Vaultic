<template>
	<div class="createTemporaryPasswordViewContainer">
		<Transition name="fade" mode="out-in">
			<AccountSetupView :key="refreshKey" :color="color" :title="title" :buttonText="buttonText"
				:displayGrid="false" @onSubmit="onSubmit">
				<TextInputField v-if="!submitted" ref="emailField" :color="color" :label="'Email'" v-model="email"
					:width="'300px'" />
				<div v-else class="createTemporaryPasswordViewContainer__submittedMessage">
					<div>An email from <span class="createTemporaryPasswordViewContainer__email">Vaultic.help@outlook.com</span>, containing your Username and One Time Password, has been sent.
						Please follow the instructions in the email. Your One Time Password will expire in 5 minutes</div>
				</div>
			</AccountSetupView>
		</Transition>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import TextInputField from '../InputFields/TextInputField.vue';

import { InputComponent } from '@renderer/Types/Components';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "CreateOTPView",
	components:
	{
		AccountSetupView,
		TextInputField
	},
	emits: ['onOk'],
	props: ['color'],
	setup(_, ctx)
	{
		const refreshKey: Ref<string> = ref('');

		const emailField: Ref<InputComponent | null> = ref(null);
		const email: Ref<string> = ref('');

		const title: ComputedRef<string> = computed(() => submitted.value ? "One Time Password Sent" : "Generate One Time Password");
		const buttonText: ComputedRef<string> = computed(() => submitted.value ? "Ok" : "Submit");
		const submitted: Ref<boolean> = ref(false);

		async function onSubmit()
		{
			if (submitted.value)
			{
				ctx.emit('onOk');
				return;
			}

			const response = await window.api.server.session.generateOneTimePassword(email.value);
			if (response.success)
			{
				submitted.value = true;
				refreshKey.value = Date.now().toString();
			}
			else
			{
				if (response.UnknownError)
				{
					stores.popupStore.showErrorResponse(response);
				}
				else if (response.UnknownEmail)
				{
					emailField.value?.invalidate("Unable to find account associated with that email. Please try a differnt one");
				}
			}

		}

		return {
			refreshKey,
			emailField,
			email,
			submitted,
			title,
			buttonText,
			onSubmit
		}
	}
})
</script>

<style>
.createTemporaryPasswordViewContainer {
	height: 100%;
}

.createTemporaryPasswordViewContainer__submittedMessage {
	width: 80%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	color: white;
}

.createTemporaryPasswordViewContainer__email {
	color: v-bind(color);
	text-decoration: underline;
	border: none;
	font-size: 17px;
}
</style>
