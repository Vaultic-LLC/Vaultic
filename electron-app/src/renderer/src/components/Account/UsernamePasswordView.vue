<template>
	<div class="usernamePasswordViewContainer">
		<div>
			<TextInputField :color="color" :label="'Username'" v-model="username"
				:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }" />
			<EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="password" :initialLength="0"
				:isInitiallyEncrypted="false" :showRandom="true" :showUnlock="true" :required="true" showCopy="true"
				:style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 2' }" />
			<div>Don't have an account? <button @click="moveToCreateAccount">Create One</button></div>
			<button @click="onSubmit">Submit</button>
		</div>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import { InputColorModel, defaultInputColorModel } from '@renderer/Types/Models';

export default defineComponent({
	name: "UsernamePasswordView",
	components:
	{
		TextInputField,
		EncryptedInputField
	},
	emits: ['onMoveToCreateAccount', 'onSuccess'],
	props: ['color'],
	setup(props, ctx)
	{
		const username: Ref<string> = ref('');
		const password: Ref<string> = ref('');

		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

		function moveToCreateAccount()
		{
			ctx.emit('onMoveToCreateAccount');
		}

		async function onSubmit()
		{
			const response = await window.api.server.validateUsernameAndPassword(username.value, password.value);
			if (response.Success)
			{
				ctx.emit('onSuccess', username.value, password.value);
			}
			else
			{
				if (response.IncorrectUsernameOrPassword)
				{
					// Show validation message
				}
				else if (response.IncorrectDevice)
				{
					// Is this possible?
					// technically, but it would be hard. The user would have to spoof their license in between
					// checking the license request and this one
				}
			}
		}

		return {
			username,
			password,
			colorModel,
			moveToCreateAccount,
			onSubmit
		};
	}
})
</script>

<style></style>
