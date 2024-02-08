<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<EnumInputField :label="'Auto Lock Time'" :color="color" v-model="settingsState.autoLockTime"
			:optionsEnum="AutoLockTime" fadeIn="true" :style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
		<EnumInputField :label="'Multiple Filter Behavior'" :color="color" v-model="settingsState.multipleFilterBehavior"
			:optionsEnum="FilterStatus" fadeIn="true" :style="{ 'grid-row': '1 / span 2', 'grid-column': '5 / span 2' }" />
		<TextInputField :color="color" :label="'Login Records to Store'" v-model="settingsState.loginRecordsToStore"
			:inputType="'number'" :style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2' }"
			:additionalValidationFunction="enforceMinLoginRecords" />
		<TextInputField :color="color" :label="'Random Password Length'" v-model.number="settingsState.randomValueLength"
			:inputType="'number'" :style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 2' }"
			:additionalValidationFunction="enforceMinRandomPasswordLength" />
		<TextInputField :color="color" :label="'Old Password Days'" v-model.number="settingsState.oldPasswordDays"
			:inputType="'number'" :style="{ 'grid-row': '7 / span 2', 'grid-column': '2 / span 2' }"
			:additionalValidationFunction="enforceOldPasswordDays" />
		<!-- <CheckboxInputField :label="'Require Key when Saving Filter or Group'" :color="color"
			v-model="settingsState.requireMasterKeyOnFilterGrouopSave" :fadeIn="true"
			:style="{ 'grid-row': '7 / span 1', 'grid-column': '2 / span 3', }" />
		<CheckboxInputField :label="'Require Key when Deleting Filter or Group'" :color="color"
			v-model="settingsState.requireMasterKeyOnFilterGroupDelete" :fadeIn="true"
			:style="{ 'grid-row': '8 / span 1', 'grid-column': '2 / span 3', }" /> -->
		<!-- <CheckboxInputField :label="'Take picture on login'" :color="color" v-model="settingsState.takePictureOnLogin"
            :fadeIn="true" :style="{ 'grid-row': '4 / span 2', 'grid-column': '1 / span 2', }" /> -->
	</ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref, inject } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';

import { AutoLockTime } from '../../Types/Settings';
import { GridDefinition } from '../../Types/Models';
import { stores } from '../../Objects/Stores';
import { RequestAuthenticationFunctionKey } from '../../Types/Keys';
import { SettingsState } from '../../Objects/Stores/SettingsStore';
import { FilterStatus } from '../../Types/Table';

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

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);
		let saveSucceeded: (value: boolean) => void;
		let saveFaield: (value: boolean) => void;

		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(onAuthenticationSuccessful, onAuthenticationCanceled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFaield = reject;
				});
			}

			return Promise.reject();
		}

		function onAuthenticationSuccessful(key: string)
		{
			stores.settingsStore.updateSettings(key, settingsState.value);
			saveSucceeded(true);
		}

		function onAuthenticationCanceled()
		{
			saveFaield(false);
		}

		function enforceMinLoginRecords(input: string): [boolean, string]
		{
			return [Number.parseInt(input) >= 10, "Value must be greater than or equal to 10"];
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

		return {
			color,
			settingsState,
			refreshKey,
			gridDefinition,
			AutoLockTime,
			FilterStatus,
			onSave,
			onAuthenticationSuccessful,
			enforceMinLoginRecords,
			enforceMinRandomPasswordLength,
			enforceOldPasswordDays
		};
	},
})
</script>

<style></style>
