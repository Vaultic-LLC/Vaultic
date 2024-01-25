<template>
	<TableRow :rowNumber="rowNumber" :model="tableRowData" :color="color" :allowDelete="!disabled" :hideAtRisk="true"
		:animateDelete="true">
		<td class="securityQuestionRowOne">
			<EncryptedInputField :color="color" :label="'Question'" v-model="securityQuestion.question"
				:initialLength="securityQuestion.questionLength" :isInitiallyEncrypted="isInitiallyEncrypted"
				:disabled="disabled" :fadeIn="false" :showRandom="false" :showUnlock="false" :showCopy="true"
				@onDirty="$emit('onQuesitonDirty')" />
		</td>
		<td class="gap">

		</td>
		<td>
			<EncryptedInputField :color="color" :label="'Answer'" v-model="securityQuestion.answer"
				:initialLength="securityQuestion.answerLength" :isInitiallyEncrypted="isInitiallyEncrypted"
				:disabled="disabled" :fadeIn="false" :showRandom="false" :showUnlock="false" :showCopy="true"
				@onDirty="$emit('onAnswerDirty')" />
		</td>
	</TableRow>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';

import TableRow from './TableRow.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';

import { SecurityQuestion } from '../../../Types/EncryptedData';
import { TableRowData } from '../../../Types/Models';

export default defineComponent({
	name: 'SecurityQuestionRow',
	components:
	{
		TableRow,
		EncryptedInputField
	},
	emits: ["onQuesitonDirty", "onAnswerDirty", "onDelete"],
	props: ["model", "color", "rowNumber", "disabled", "isInitiallyEncrypted"],
	setup(props, ctx)
	{
		const securityQuestion: Ref<SecurityQuestion> = ref(props.model);
		const tableRowData: Ref<TableRowData> = ref(
			{
				id: '',
				values: [],
				onDelete: function ()
				{
					ctx.emit("onDelete", securityQuestion.value.id);
				}
			}
		)
		return {
			securityQuestion,
			tableRowData
		}
	}
});
</script>

<style>
.gap {
	width: 10px;
}
</style>
