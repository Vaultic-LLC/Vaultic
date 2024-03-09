<template>
	<div class="nameValuePairRowContainer">
		<EncryptedInputField :colorModel="colorModel" :label="'Value'" v-model="valueValue" :showCopy="true"
			:style="{ 'grid-row': '2', 'grid-column': '2 / span 2' }" :disabled="true" />
		<TextAreaInputField :colorModel="colorModel" :label="'Additional Information'"
			v-model="nameValuePair.additionalInformation" :style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 3' }"
			:disabled="true" :height="150" :width="300" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';

import { defaultInputColor } from '@renderer/Types/Colors';
import { InputColorModel } from '@renderer/Types/Models';
import { ReactiveValue } from '@renderer/Objects/Stores/ReactiveValue';

export default defineComponent({
	name: "NameValuePairRow",
	components:
	{
		TextAreaInputField,
		EncryptedInputField
	},
	props: ["value", "authenticationPromise", "color", "isShowing"],
	setup(props)
	{
		const textColor: string = defaultInputColor;
		const value: ComputedRef<ReactiveValue> = computed(() => JSON.parse(JSON.stringify(props.value)));
		let valueValue: Ref<string> = ref(value.value.value);

		const colorModel: Ref<InputColorModel> = ref({
			color: props.color,
			textColor: defaultInputColor,
			activeTextColor: defaultInputColor,
			borderColor: "rgba(118, 118, 118, 0.3)",
			activeBorderColor: "rgba(118, 118, 118, 0.3)"
		});

		watch(() => props.authenticationPromise as Promise<string>, (newValue) =>
		{
			newValue?.then((key: string) =>
			{
				window.api.utilities.crypt.decrypt(key, valueValue.value).then((value) =>
				{
					valueValue.value  = value;
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
				valueValue.value = value.value.value;
			}
		});

		return {
			nameValuePair: props.value,
			valueValue,
			textColor,
			colorModel
		}
	}
})
</script>

<style>
.nameValuePairRowContainer {
	display: grid;
	grid-template-rows: repeat(10, 30px);
	grid-template-columns: repeat(10, 75px);
}
</style>
