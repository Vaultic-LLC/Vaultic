<template>
	<div class="passwordRowContainer">
		<EncryptedInputField :color="textColor" :label="'Password'" v-model="passwordValue"
			:initialLength="value.passwordLength" :showCopy="true"
			:style="{ 'grid-row': '2 / span 2', 'grid-column': '1 / span 2' }" :disabled="true"
			:isInitiallyEncrypted="false" />
		<TextAreaInputField :color="textColor" :label="'Additional Information'" v-model="pword.additionalInformation"
			:style="{ 'grid-row': '5 / span 3', 'grid-column': '1 / span 2' }" :disabled="true" :height="100"
			:width="200" />
		<SecurityQuestionInputField :border="false" :color="textColor" :model="securityQuestions" :disabled="true"
			:showUnlock="false" :isInitiallyEncrypted="false"
			:style="{ 'grid-row': '1 / span 5', 'grid-column': '10 / span 5' }" :rowGap="25" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import SecurityQuestionInputField from '../../../components/InputFields/SecurityQuestionInputField.vue';

import cryptUtility from '../../../Utilities/CryptUtility';
import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';
import { SecurityQuestion } from '../../../Types/EncryptedData';
import { PasswordStore } from '../../../Objects/Stores/PasswordStore';

export default defineComponent({
	name: "PasswordRow",
	components:
	{
		SecurityQuestionInputField,
		TextAreaInputField,
		EncryptedInputField
	},
	props: ["value", "authenticationPromise", "color", 'isShowing'],
	setup(props)
	{
		const textColor: string = "white";

		// copy password so we don't accidentally edit it
		const password: ComputedRef<PasswordStore> = computed(() => JSON.parse(JSON.stringify(props.value)));
		let passwordValue: Ref<string> = ref(password.value.password);
		let securityQuestions: Ref<SecurityQuestion[]> = ref(password.value.securityQuestions);

		watch(() => props.authenticationPromise as Promise<string>, (newValue) =>
		{
			newValue?.then((key: string) =>
			{
				passwordValue.value = cryptUtility.decrypt(key, passwordValue.value);
				securityQuestions.value.forEach(sq =>
				{
					sq.question = cryptUtility.decrypt(key, sq.question);
					sq.answer = cryptUtility.decrypt(key, sq.answer);
				});
			}).catch(() =>
			{
				// auth was cancelled
			});
		});

		watch(() => props.isShowing, (newValue) =>
		{
			if (!newValue)
			{
				passwordValue.value = props.value.password;
				securityQuestions.value = props.value.securityQuestions;
			}
		});

		return {
			pword: props.value,
			securityQuestions,
			passwordValue,
			textColor,
		}
	}
})
</script>

<style>
.passwordRowContainer {
	display: grid;
	grid-template-rows: repeat(10, 30px);
	grid-template-columns: repeat(7, 50px);
}
</style>
