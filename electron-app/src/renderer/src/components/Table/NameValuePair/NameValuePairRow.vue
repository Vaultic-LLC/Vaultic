<template>
	<div class="nameValuePairRowContainer">
		<EncryptedInputField :color="textColor" :label="'Value'" v-model="valueValue" :showCopy="true"
			:style="{ 'grid-row': '2', 'grid-column': '1 / span 2' }" :disabled="true" />
		<TextAreaInputField :color="textColor" :label="'Additional Information'"
			v-model="nameValuePair.additionalInformation" :style="{ 'grid-row': '5 / span 2', 'grid-column': '1 / span 3' }"
			:disabled="true" :height="150" :width="300" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import TextAreaInputField from '../../../components/InputFields/TextAreaInputField.vue';
import EncryptedInputField from '../../../components/InputFields/EncryptedInputField.vue';

import cryptUtility from '../../../Utilities/CryptUtility';
import { NameValuePairStore } from '../../../Objects/Stores/NameValuePairStore';

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
		const textColor: string = "white";
		const value: ComputedRef<NameValuePairStore> = computed(() => JSON.parse(JSON.stringify(props.value)));
		let valueValue: Ref<string> = ref(value.value.value);

		watch(() => props.authenticationPromise as Promise<string>, (newValue) =>
		{
			newValue?.then((key: string) =>
			{
				valueValue.value = cryptUtility.decrypt(key, valueValue.value);
			}).catch(() =>
			{
				// auth was cancelled
			});
		});

		watch(() => props.isShowing, (newValue) =>
		{
			if (!newValue)
			{
				valueValue.value = props.value.value;
			}
		});

		return {
			nameValuePair: props.value,
			valueValue,
			textColor
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
