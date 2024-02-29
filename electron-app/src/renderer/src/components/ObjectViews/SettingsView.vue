<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<EnumInputField :label="'Auto Lock Time'" :color="color" v-model="settingsState.autoLockTime"
			:optionsEnum="AutoLockTime" fadeIn="true" :style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
		<EnumInputField :label="'Multiple Filter Behavior'" :color="color" v-model="settingsState.multipleFilterBehavior"
			:optionsEnum="FilterStatus" fadeIn="true" :style="{ 'grid-row': '1 / span 2', 'grid-column': '5 / span 2' }" />
		<TextInputField :color="color" :label="'Login Records to Store Per Day'"
			v-model="settingsState.loginRecordsToStorePerDay" :inputType="'number'"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }"
			:additionalValidationFunction="enforceLoginRecordsPerDay" />
		<TextInputField :color="color" :label="'Days to Store Login Records'"
			v-model="settingsState.numberOfDaysToStoreLoginRecords" :inputType="'number'"
			:style="{ 'grid-row': '3 / span 2', 'grid-column': '5 / span 2' }"
			:additionalValidationFunction="enforceDaysToStoreLoginRecords" />
		<TextInputField :color="color" :label="'Random Password Length'" v-model.number="settingsState.randomValueLength"
			:inputType="'number'" :style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 2' }"
			:additionalValidationFunction="enforceMinRandomPasswordLength" />
		<TextInputField :color="color" :label="'Old Password Days'" v-model.number="settingsState.oldPasswordDays"
			:inputType="'number'" :style="{ 'grid-row': '7 / span 2', 'grid-column': '2 / span 2' }"
			:additionalValidationFunction="enforceOldPasswordDays" />
		<TextInputField :color="color" :label="'% Filled Metric for Pulse'"
			v-model.number="settingsState.percentMetricForPulse" :inputType="'number'"
			:style="{ 'grid-row': '7 / span 2', 'grid-column': '5 / span 2' }"
			:additionalValidationFunction="enforcePercentMetricForPulse" :showToolTip="true"
			:toolTipMessage="'At what percent of the total value should the metric start pulsing. Ex. 50% would mean 5 / 10 Weak Passwords would start pusling. Does not apply to Breeched Passwords.'" />
		<!-- <CheckboxInputField :label="'Take picture on login'" :color="color" v-model="settingsState.takePictureOnLogin"
            :fadeIn="true" :style="{ 'grid-row': '4 / span 2', 'grid-column': '1 / span 2', }" /> -->
	</ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';

import { AutoLockTime } from '../../Types/Settings';
import { GridDefinition } from '../../Types/Models';
import { FilterStatus } from '../../Types/Table';
import { useLoadingIndicator, useRequestAuthFunction } from '@renderer/Helpers/injectHelper';
import { stores } from '@renderer/Objects/Stores';
import { SettingsState } from '@renderer/Objects/Stores/SettingsStore';

export default defineComponent({
	name: "ValueView",
	components:
	{
		ObjectView,
		TextInputField,
		CheckboxInputField,
		EnumInputField
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const refreshKey: Ref<string> = ref("");
		const settingsState: Ref<SettingsState> = ref(props.model);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		const gridDefinition: GridDefinition = {
			rows: 10,
			rowHeight: '50px',
			columns: 11,
			columnWidth: '100px'
		}

		const requestAuthFunc = useRequestAuthFunction();
		const [showLoadingIndicator, hideLoadingIndicator] = useLoadingIndicator();

		let saveSucceeded: (value: boolean) => void;
		let saveFaield: (value: boolean) => void;

		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(color.value, onAuthenticationSuccessful, onAuthenticationCanceled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFaield = reject;
				});
			}

			return Promise.reject();
		}

		async function onAuthenticationSuccessful(key: string)
		{
			showLoadingIndicator(color.value, "Saving Settings");
			await stores.settingsStore.updateSettings(key, settingsState.value);
			hideLoadingIndicator();

			saveSucceeded(true);
		}

		function onAuthenticationCanceled()
		{
			saveFaield(false);
		}

		function enforceLoginRecordsPerDay(input: string): [boolean, string]
		{
			const numb: number = Number.parseInt(input);
			if (!numb)
			{
				return [false, "Not a valid number"];
			}

			if (numb < 3)
			{
				return [false, "Value must be greater than 3"];
			}

			if (numb > 20)
			{
				return [false, "Value must be less than 20"];
			}

			return [true, ""];
		}

		function enforceDaysToStoreLoginRecords(input: string): [boolean, string]
		{
			const numb: number = Number.parseInt(input);
			if (!numb)
			{
				return [false, "Not a valid number"];
			}

			if (numb < 7)
			{
				return [false, "Value must be greater than 7"];
			}

			if (numb > 365)
			{
				return [false, "Value must be less than 365"];
			}

			return [true, ""];
		}

		function enforceMinRandomPasswordLength(input: string): [boolean, string]
		{
			return [Number.parseInt(input) >= 20, "Value must be greater than or equal to 20"];
		}

		function enforceOldPasswordDays(input: string): [boolean, string]
		{
			const numb: number = Number.parseInt(input);
			if (!numb)
			{
				return [false, "Not a valid number"];
			}

			if (numb < 30 || numb > 365)
			{
				return [false, "Value must be between 30 and 365 days"];
			}

			return [true, ""];
		}

		function enforcePercentMetricForPulse(input: string): [boolean, string]
		{
			const numb: number = Number.parseInt(input);
			if (!numb)
			{
				return [false, "Not a valid number"];
			}

			if (numb < 1 || numb > 100)
			{
				return [false, "Value must be between 1 and 100"];
			}

			return [true, ""];
		}

		return {
			color,
			settingsState,
			refreshKey,
			gridDefinition,
			AutoLockTime,
			FilterStatus,
			onSave,
			onAuthenticationSuccessful,
			enforceLoginRecordsPerDay,
			enforceMinRandomPasswordLength,
			enforceOldPasswordDays,
			enforcePercentMetricForPulse,
			enforceDaysToStoreLoginRecords
		};
	},
})
</script>

<style></style>
