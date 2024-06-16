<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<div class="settingsView__sectionTitle settingsView__appSettings">App Settings</div>
		<EnumInputField class="settingsView__autoLockTime" :label="'Auto Lock Time'" :color="color"
			v-model="settingsState.autoLockTime" :optionsEnum="AutoLockTime" fadeIn="true" :width="'10vw'"
			:height="'4vh'" :minHeight="'30px'" :minWidth="'190px'" />
		<EnumInputField class="settingsView__multipleFilterBehavior" :label="'Multiple Filter Behavior'" :color="color"
			v-model="settingsState.multipleFilterBehavior" :optionsEnum="FilterStatus" fadeIn="true" :width="'10vw'"
			:minWidth="'190px'" :height="'4vh'" :minHeight="'30px'" />
		<TextInputField class="settingsView__maxLoginRecordsPerDay" :color="color" :label="'Max Login Records Per Day'"
			v-model="settingsState.loginRecordsToStorePerDay" :inputType="'number'" :width="'10vw'" :minWidth="'190px'"
			:height="'4vh'" :maxWidth="'300px'" :minHeight="'30px'"
			:additionalValidationFunction="enforceLoginRecordsPerDay" />
		<TextInputField class="settingsView__daysToStoreLoginRecords" :color="color"
			:label="'Days to Store Login Records'" v-model="settingsState.numberOfDaysToStoreLoginRecords"
			:inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
			:minHeight="'30px'" :additionalValidationFunction="enforceDaysToStoreLoginRecords" />
		<CheckboxInputField class="settingsView__defaultMarkdown" :color="color" :label="'Default Additional Information to Markdown on Edit Screens'"
			v-model="settingsState.defaultMarkdownInEditScreens" />
		<div class="settingsView__sectionTitle settingsView__securitySettings">Security Settings</div>
		<TextInputField class="settingsView__randomPasswordLength" :color="color" :label="'Random Password Length'"
			v-model.number="settingsState.randomValueLength" :inputType="'number'" :width="'10vw'" :minWidth="'190px'"
			:height="'4vh'" :maxWidth="'300px'" :minHeight="'30px'"
			:additionalValidationFunction="enforceMinRandomPasswordLength" />
		<TextInputField class="settingsView__randomPassphraseLength" :color="color" :label="'Random Passphrase Length'"
			v-model.number="settingsState.randomPhraseLength" :inputType="'number'" :width="'10vw'" :minWidth="'190px'"
			:height="'4vh'" :maxWidth="'300px'" :minHeight="'30px'"
			:additionalValidationFunction="enforceMinRandomPassphraseLength" />
		<TextInputField class="settingsView__oldPasswordDays" :color="color" :label="'Old Password Days'"
			v-model.number="settingsState.oldPasswordDays" :inputType="'number'" :width="'10vw'" :minWidth="'190px'"
			:maxWidth="'300px'" :height="'4vh'" :minHeight="'30px'"
			:additionalValidationFunction="enforceOldPasswordDays" />
		<TextInputField class="settingsView__percentFilledMetricForPulse" :color="color"
			:label="'% Filled Metric for Pulse'" v-model.number="settingsState.percentMetricForPulse"
			:inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
			:minHeight="'30px'" :additionalValidationFunction="enforcePercentMetricForPulse" :showToolTip="true"
			:toolTipSize="'clamp(15px, 1vw, 28px)'"
			:toolTipMessage="'At what percent of the total value should the metric start pulsing. Ex. 50% would mean 5 / 10 Weak Passwords would start pusling. Does not apply to Breached Passwords.'" />
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
import { stores } from '@renderer/Objects/Stores';
import { SettingsStoreState } from '@renderer/Objects/Stores/SettingsStore';

export default defineComponent({
	name: "ValueView",
	components:
	{
		ObjectView,
		TextInputField,
		CheckboxInputField,
		EnumInputField
	},
	props: ['creating', 'model', 'currentView'],
	setup(props)
	{
		const refreshKey: Ref<string> = ref("");
		const settingsState: Ref<SettingsStoreState> = ref(props.model);
		const color: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);
		const currentView: Ref<number> = ref(props.currentView ? props.currentView : 0);

		const gridDefinition: GridDefinition = {
			rows: 16,
			rowHeight: 'clamp(20px, 3vh, 50px)',
			columns: 11,
			columnWidth: 'clamp(70px, 4vw, 100px)'
		};

		let saveSucceeded: (value: boolean) => void;
		let saveFaield: (value: boolean) => void;

		function onSave()
		{
			stores.popupStore.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled);
			return new Promise((resolve, reject) =>
			{
				saveSucceeded = resolve;
				saveFaield = reject;
			});
		}

		async function onAuthenticationSuccessful(key: string)
		{
			stores.popupStore.showLoadingIndicator(color.value, "Saving Settings");
			await stores.settingsStore.updateState(key, settingsState.value);
			stores.popupStore.hideLoadingIndicator();

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

		function enforceMinRandomPassphraseLength(input: string): [boolean, string]
		{
			return [Number.parseInt(input) >= 4, "Value must be greater than or equal to 4"];
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
			currentView,
			onSave,
			onAuthenticationSuccessful,
			enforceLoginRecordsPerDay,
			enforceMinRandomPasswordLength,
			enforceMinRandomPassphraseLength,
			enforceOldPasswordDays,
			enforcePercentMetricForPulse,
			enforceDaysToStoreLoginRecords
		};
	},
})
</script>

<style>
.settingsView__sectionTitle {
	color: white;
	margin-left: 5%;
	text-align: left;
	font-size: clamp(15px, 1vw, 25px);
}

.settingsView__appSettings {
	grid-row: 1 / span 2;
	grid-column: 3 / span 3;
	z-index: 8;
}

.settingsView__autoLockTime {
	grid-row: 3 / span 2;
	grid-column: 3 / span 2;
	z-index: 8;
}

.settingsView__multipleFilterBehavior {
	grid-row: 3 / span 2;
	grid-column: 6 / span 2;
	z-index: 8;
}

.settingsView__maxLoginRecordsPerDay {
	grid-row: 5 / span 2;
	grid-column: 3 / span 2;
}

.settingsView__daysToStoreLoginRecords {
	grid-row: 5 / span 2;
	grid-column: 6 / span 2;
}

.settingsView__defaultMarkdown {
	grid-row: 7 / span 1;
	grid-column: 3 / span 3;
}

.settingsView__securitySettings {
	grid-row: 10 / span 1;
	grid-column: 3 / span 3;
}

.settingsView__randomPasswordLength {
	grid-row: 13 / span 2;
	grid-column: 3 / span 2;
}

.settingsView__randomPassphraseLength {
	grid-row: 13 / span 2;
	grid-column: 6 / span 2;
}

.settingsView__oldPasswordDays {
	grid-row: 15 / span 2;
	grid-column: 3 / span 2;
}

.settingsView__percentFilledMetricForPulse {
	grid-row: 15 / span 2;
	grid-column: 6 / span 2;
}
</style>
