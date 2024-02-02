<template>
	<div class="passwordRowContainer">
		<EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="passwordValue"
			:initialLength="value.passwordLength" :showCopy="true"
			:style="{ 'grid-row': '2 / span 2', 'grid-column': '2 / span 2' }" :disabled="true"
			:isInitiallyEncrypted="false" :isOnWidget="true" />
		<TextAreaInputField :colorModel="colorModel" :label="'Additional Information'" v-model="pword.additionalInformation"
			:style="{ 'grid-row': '5 / span 4', 'grid-column': '2 / span 2' }" :disabled="true" :height="135"
			:width="300" />
		<TableTemplate :color="textColor"
			:style="{ 'position': 'relative', 'grid-row': '2 / span 9', 'grid-column': '10 / span 5' }"
			class="scrollbar passwordRowContainer__table--fadeIn" :scrollbar-size="1" :border="false" :row-gap="0"
			:emptyMessage="emptyMessage" :showEmptyMessage="securityQuestions.length == 0"
			:backgroundColor="backgroundColor">
			<template #header>
				<!-- <TableHeaderRow :color="textColor" :tabs="headerTabs" :border="true" :height="5">
				</TableHeaderRow> -->
			</template>
			<template #body>
				<SecurityQuestionRow v-for="(sq, index) in securityQuestions" :key="sq.id" :rowNumber="index"
					:colorModel="colorModel" :model="sq" :disabled="true" :isInitiallyEncrypted="false" />
			</template>
		</TableTemplate>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import TableTemplate from '../TableTemplate.vue';
import TableHeaderRow from '../Header/TableHeaderRow.vue';
import SecurityQuestionRow from '../Rows/SecurityQuestionRow.vue';

import cryptUtility from '../../../Utilities/CryptUtility';
import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';
import { SecurityQuestion } from '../../../Types/EncryptedData';
import { PasswordStore } from '../../../Objects/Stores/PasswordStore';
import { v4 as uuidv4 } from 'uuid';
import { HeaderTabModel, InputColorModel } from '@renderer/Types/Models';
import { defaultInputColor } from '@renderer/Types/Colors';

export default defineComponent({
	name: "PasswordRow",
	components:
	{
		TextAreaInputField,
		EncryptedInputField,
		TableTemplate,
		TableHeaderRow,
		SecurityQuestionRow
	},
	props: ["value", "authenticationPromise", "color", 'isShowing'],
	setup(props)
	{
		const textColor: string = "rgba(118, 118, 118, 0.3)";
		const backgroundColor: string = "transparent";
		const colorModel: Ref<InputColorModel> = ref({
			color: '',
			textColor: defaultInputColor,
			activeTextColor: defaultInputColor,
			borderColor: "rgba(118, 118, 118, 0.3)",
			activeBorderColor: "rgba(118, 118, 118, 0.3)"
		});

		// copy password so we don't accidentally edit it
		const password: ComputedRef<PasswordStore> = computed(() => JSON.parse(JSON.stringify(props.value)));
		let passwordValue: Ref<string> = ref(password.value.password);
		let securityQuestions: Ref<SecurityQuestion[]> = ref(password.value.securityQuestions);

		const emptyMessage: Ref<string> = ref('This Password does not have any Security Questions. Click the Edit Icon to add some');

		const headerTabs: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Security Questions',
				active: computed(() => true),
				color: computed(() => textColor),
				size: 'small',
				onClick: () => { }
			}
		];

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
			emptyMessage,
			headerTabs,
			backgroundColor,
			colorModel
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

.passwordRowContainer__table--fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}
</style>
