<template>
	<ObjectInputField :border="border" :color="primaryColor" :allowAdd="!disabled" :onAdd="onAdd" :showUnlock="true">
		<template #body>
			<SecurityQuestionRow v-for="(sq, index) in securityQuestions" :key="sq.id" :rowNumber="index"
				:color="primaryColor" :model="sq" :disabled="disabled" @onQuesitonDirty="onQuestionDirty(sq.id)"
				@onAnswerDirty="onAnswerDirty(sq.id)" @onDelete="onDelete"
				:isInitiallyEncrypted="sq.question != '' && isInitiallyEncrypted" />
		</template>
	</ObjectInputField>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, ref } from 'vue';

import SecurityQuestionRow from '../Table/Rows/SecurityQuestionRow.vue';
import ObjectInputField from './ObjectInputField.vue';

import { SecurityQuestion } from '../../Types/EncryptedData';
import { DirtySecurityQuestionQuestionsKey, DirtySecurityQuestionAnswersKey } from '../../Types/Keys';
import { generateUniqueID } from '@renderer/Helpers/generatorHelper';

export default defineComponent({
	name: "SecurityQuestionInputField",
	components:
	{
		SecurityQuestionRow,
		ObjectInputField
	},
	props: ['model', 'color', 'disabled', 'border', 'isInitiallyEncrypted'],
	setup(props)
	{
		let securityQuestions: Ref<SecurityQuestion[]> = ref(props.model);
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		const dirtySecurityQuestionQuestions: Ref<string[]> = inject(DirtySecurityQuestionQuestionsKey, ref([]));
		const dirtySecurityQuestionAnswers: Ref<string[]> = inject(DirtySecurityQuestionAnswersKey, ref([]));

		async function onAdd()
		{
			securityQuestions.value.push({
				id: await generateUniqueID(securityQuestions.value),
				question: '',
				questionLength: 0,
				answer: '',
				answerLength: 0
			});
		}

		function onQuestionDirty(id: string)
		{
			if (!dirtySecurityQuestionQuestions.value.includes(id))
			{
				dirtySecurityQuestionQuestions.value.push(id);
			}
		}

		function onAnswerDirty(id: string)
		{
			if (!dirtySecurityQuestionAnswers.value.includes(id))
			{
				dirtySecurityQuestionAnswers.value.push(id);
			}
		}

		function onDelete(id: string)
		{
			securityQuestions.value = securityQuestions.value.filter(sq => sq.id != id);

			if (dirtySecurityQuestionQuestions.value.includes(id))
			{
				dirtySecurityQuestionQuestions.value.splice(dirtySecurityQuestionQuestions.value.indexOf(id), 1);
			}

			if (dirtySecurityQuestionAnswers.value.includes(id))
			{
				dirtySecurityQuestionAnswers.value.splice(dirtySecurityQuestionAnswers.value.indexOf(id), 1);
			}
		}

		return {
			securityQuestions,
			primaryColor,
			onQuestionDirty,
			onAnswerDirty,
			onAdd,
			onDelete
		}
	}
})
</script>

<style></style>
