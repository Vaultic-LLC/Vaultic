<template>
	<TableRow :rowNumber="rowNumber" :model="tableRowData" :color="colorModel.color" :allowDelete="!disabled"
		:hideAtRisk="true" :animateDelete="true">
		<td class="securityQuestionCellOne">
			<EncryptedInputField :colorModel="colorModel" :label="'Question'" v-model="securityQuestion.question"
				:initialLength="securityQuestion.questionLength" :isInitiallyEncrypted="isInitiallyEncrypted"
				:disabled="disabled" :fadeIn="false" :showRandom="false" :showUnlock="false" :showCopy="false"
				:isOnWidget="true" :required="true" @onDirty="$emit('onQuesitonDirty')" :width="'10vw'"
				:maxWidth="'250px'" :height="'4vh'" :minHeight="'35px'" :showButtonsUnderneath="moveButtonsToBottom" />
		</td>
		<td class="gap">
		</td>
		<td>
			<EncryptedInputField :colorModel="colorModel" :label="'Answer'" v-model="securityQuestion.answer"
				:initialLength="securityQuestion.answerLength" :isInitiallyEncrypted="isInitiallyEncrypted"
				:disabled="disabled" :fadeIn="false" :showRandom="false" :showUnlock="false" :showCopy="true"
				:isOnWidget="true" :required="true" @onDirty="$emit('onAnswerDirty')" :width="'10vw'"
				:maxWidth="'250px'" :height="'4vh'" :minHeight="'35px'" :showButtonsUnderneath="moveButtonsToBottom" />
		</td>
	</TableRow>
</template>

<script lang="ts">
import { defineComponent, onMounted, Ref, ref } from 'vue';

import TableRow from './TableRow.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';

import { SecurityQuestion } from '../../../Types/EncryptedData';
import { TableRowData } from '../../../Types/Models';
import { screenWidthIsAtRatioOfMax } from "../../../Helpers/screenSizeHelepr";

export default defineComponent({
	name: 'SecurityQuestionRow',
	components:
	{
		TableRow,
		EncryptedInputField
	},
	emits: ["onQuesitonDirty", "onAnswerDirty", "onDelete"],
	props: ["model", "colorModel", "rowNumber", "disabled", "isInitiallyEncrypted"],
	setup(props, ctx)
	{
		const resizeObserver: ResizeObserver = new ResizeObserver(checkScreenWidth);

		const securityQuestion: Ref<SecurityQuestion> = ref(props.model);
		const moveButtonsToBottom: Ref<boolean> = ref(screenWidthIsAtRatioOfMax(0.8));

		const tableRowData: Ref<TableRowData> = ref(
			{
				id: '',
				values: [],
				onDelete: function ()
				{
					ctx.emit("onDelete", securityQuestion.value.id);
				}
			}
		);

		function checkScreenWidth()
		{
			moveButtonsToBottom.value = screenWidthIsAtRatioOfMax(0.8);
		}

		onMounted(() =>
		{
			const app = document.getElementById('app');
			if (app)
			{
				resizeObserver.observe(app);
			}
		});

		return {
			securityQuestion,
			tableRowData,
			moveButtonsToBottom
		}
	}
});
</script>

<style>
.gap {
	width: clamp(30px, 0.5vw, 50px);
}

/* this will put padding around the whole row */
.securityQuestionCellOne {
	padding: 10px
}
</style>
