<template>
	<div class="passwordRowContainer">
		<div class="passwordRowContainer__left">
			<EncryptedInputField :colorModel="colorModel" :label="'Password'" v-model="passwordValue"
				:initialLength="value.passwordLength" :showCopy="true" :disabled="true" :isInitiallyEncrypted="false"
				:isOnWidget="true" :width="'11vw'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" />
			<TextAreaInputField :colorModel="colorModel" :label="'Additional Information'" :isOnWidget="true"
				v-model="pword.additionalInformation" :disabled="true" :width="'12vw'" :height="'9vh'"
				:maxHeight="'135px'" :maxWidth="'300px'" />
		</div>
		<TableTemplate :color="textColor" :style="{ 'position': 'relative', 'flex-grow': '1' }"
			class="scrollbar passwordRowContainer__table--fadeIn" :scrollbar-size="1" :border="false"
			:row-gap="securityQuestionRowGap" :emptyMessage="emptyMessage"
			:showEmptyMessage="securityQuestions.length == 0" :backgroundColor="backgroundColor">
			<template #body>
				<SecurityQuestionRow v-for="(sq, index) in securityQuestions" :key="sq.id" :rowNumber="index"
					:colorModel="colorModel" :model="sq" :disabled="true" :isInitiallyEncrypted="false" />
			</template>
		</TableTemplate>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import TableTemplate from '../TableTemplate.vue';
import SecurityQuestionRow from '../Rows/SecurityQuestionRow.vue';

import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';
import { SecurityQuestion } from '../../../Types/EncryptedData';
import { v4 as uuidv4 } from 'uuid';
import { HeaderTabModel, InputColorModel } from '@renderer/Types/Models';
import { defaultInputColor } from '@renderer/Types/Colors';
import { ReactivePassword } from '@renderer/Objects/Stores/ReactivePassword';
import cryptHelper from '@renderer/Helpers/cryptHelper';
import { screenWidthIsAtRatioOfMax } from '@renderer/Helpers/screenSizeHelepr';

export default defineComponent({
	name: "PasswordRow",
	components:
	{
		TextAreaInputField,
		EncryptedInputField,
		TableTemplate,
		SecurityQuestionRow
	},
	props: ["value", "authenticationPromise", "color", 'isShowing'],
	setup(props)
	{
		const resizeObserver: ResizeObserver = new ResizeObserver(calcRowGap);
		const textColor: string = "#7676764d";
		const backgroundColor: string = "transparent";
		const colorModel: Ref<InputColorModel> = ref({
			color: props.color,
			textColor: defaultInputColor,
			activeTextColor: defaultInputColor,
			borderColor: "rgba(118, 118, 118, 0.3)",
			activeBorderColor: "rgba(118, 118, 118, 0.3)"
		});

		const securityQuestionRowGap: Ref<string> = ref(screenWidthIsAtRatioOfMax(0.8) ? 'clamp(10px, 1vh, 20px)' : 'clamp(10px, 1vh, 20px)');

		// copy password so we don't accidentally edit it
		const password: ComputedRef<ReactivePassword> = computed(() => JSON.parse(JSON.stringify(props.value)));
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

		function calcRowGap()
		{
			securityQuestionRowGap.value = screenWidthIsAtRatioOfMax(0.8) ? 'clamp(25px, 1vh, 30px)' : 'clamp(10px, 1vh, 20px)';
		}

		watch(() => props.authenticationPromise as Promise<string>, (newValue) =>
		{
			newValue?.then(async (key: string) =>
			{
				cryptHelper.decrypt(key, passwordValue.value).then((result) =>
				{
					if (!result.success)
					{
						return;
					}

					passwordValue.value = result.value ?? "";
				});

				securityQuestions.value.forEach(sq =>
				{
					cryptHelper.decrypt(key, sq.question).then((result) =>
					{
						if (!result.success)
						{
							return;
						}

						sq.question = result.value ?? "";
					});

					cryptHelper.decrypt(key, sq.answer).then((result) =>
					{
						if (!result.success)
						{
							return;
						}

						sq.answer = result.value ?? "";
					});
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
				passwordValue.value = password.value.password;
				securityQuestions.value = password.value.securityQuestions;
			}
		});

		onMounted(() =>
		{
			const app = document.getElementById('app');
			if (app)
			{
				resizeObserver.observe(app);
			}
		})

		return {
			pword: props.value,
			securityQuestions,
			passwordValue,
			textColor,
			emptyMessage,
			headerTabs,
			backgroundColor,
			colorModel,
			securityQuestionRowGap
		}
	}
})
</script>

<style>
.passwordRowContainer {
	display: flex;
	max-height: inherit;
}

.passwordRowContainer__left {
	display: flex;
	flex-direction: column;
	row-gap: 2vw;
	margin-right: clamp(50px, 5vw, 100px);
}

.passwordRowContainer__table--fadeIn {
	opacity: 0;
	animation: fadeIn 1s linear forwards;
}
</style>
