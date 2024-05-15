<template>
	<div class="passwordValueGaugesWidget">
		<CombinedMetricGaugeContainer :refreshKey="refreshKey" :title="title">
			<SmallMetricGauge v-for="model in passwordValueMetricGaugeModels" :key="model.key" :model="model"
				:style="model.style" />
		</CombinedMetricGaugeContainer>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import CombinedMetricGaugeContainer from '../../../SmallMetricGauges/CombinedMetricGaugeContainer.vue';
import { DataType } from '@renderer/Types/Table';
import { AtRiskType } from '@renderer/Types/EncryptedData';
import { SmallMetricGaugeModel } from '@renderer/Types/Models';
import SmallMetricGauge from '@renderer/components/Dashboard/SmallMetricGauge.vue';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "PasswordValueGauges",
	components:
	{
		CombinedMetricGaugeContainer,
		SmallMetricGauge
	},
	setup()
	{
		const refreshKey: Ref<string> = ref('');
		const title: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Passwords at Risk" : "Values at Risk");

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
			refreshKey.value = Date.now().toString();
		});

		const passwordValueMetricGaugeModels: ComputedRef<SmallMetricGaugeModel[]> = computed(() =>
		{
			let models: SmallMetricGaugeModel[] = [];
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					models.push(
						{
							key: `vold${stores.valueStore.oldNameValuePairs.value.length}${stores.valueStore.nameValuePairs.length}`,
							title: 'Old',
							filledAmount: stores.valueStore.oldNameValuePairs.value.length,
							totalAmount: stores.valueStore.nameValuePairs.length,
							color: stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '1' },
							active: stores.valueStore.activeAtRiskValueType == AtRiskType.Old,
							onClick: function ()
							{
								stores.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Old)
							}
						});
					models.push(
						{
							key: `vdup${stores.valueStore.duplicateNameValuePairsLength}${stores.valueStore.nameValuePairs.length}`,
							title: 'Duplicate',
							filledAmount: stores.valueStore.duplicateNameValuePairsLength,
							totalAmount: stores.valueStore.nameValuePairs.length,
							color: stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '2' },
							active: stores.valueStore.activeAtRiskValueType == AtRiskType.Duplicate,
							onClick: function ()
							{
								stores.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
							}
						});
					models.push(
						{
							key: `vwv${stores.valueStore.weakPassphraseValues.value.length}${stores.valueStore.nameValuePairs.length}`,
							title: 'Weak Phrase',
							filledAmount: stores.valueStore.weakPassphraseValues.value.length,
							totalAmount: stores.valueStore.nameValuePairs.length,
							color: stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '1' },
							active: stores.valueStore.activeAtRiskValueType == AtRiskType.WeakPhrase,
							onClick: function ()
							{
								stores.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.WeakPhrase)
							}
						});
					models.push(
						{
							key: `vwp${stores.valueStore.weakPasscodeValues.value.length}${stores.valueStore.nameValuePairs.length}`,
							title: 'Weak Passcode',
							filledAmount: stores.valueStore.weakPasscodeValues.value.length,
							totalAmount: stores.valueStore.nameValuePairs.length,
							color: stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '2' },
							active: stores.valueStore.activeAtRiskValueType == AtRiskType.Weak,
							onClick: function ()
							{
								stores.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Weak);
							}
						});
					break;
				case DataType.Passwords:
				default:
					models.push(
						{
							key: `pold${stores.passwordStore.oldPasswords.value.length}${stores.passwordStore.passwords.length}`,
							title: 'Old',
							filledAmount: stores.passwordStore.oldPasswords.value.length,
							totalAmount: stores.passwordStore.passwords.length,
							color: stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '1' },
							active: stores.passwordStore.activeAtRiskPasswordType == AtRiskType.Old,
							onClick: function ()
							{
								stores.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Old);
							}
						});
					models.push(
						{
							key: `pdup${stores.passwordStore.duplicatePasswordsLength}${stores.passwordStore.passwords.length}`,
							title: 'Duplicate',
							filledAmount: stores.passwordStore.duplicatePasswordsLength,
							totalAmount: stores.passwordStore.passwords.length,
							color: stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '2' },
							active: stores.passwordStore.activeAtRiskPasswordType == AtRiskType.Duplicate,
							onClick: function ()
							{
								stores.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
							}
						});
					models.push(
						{
							key: `pweak${stores.passwordStore.weakPasswords.value.length}${stores.passwordStore.passwords.length}`,
							title: 'Weak',
							filledAmount: stores.passwordStore.weakPasswords.value.length,
							totalAmount: stores.passwordStore.passwords.length,
							color: stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '1' },
							active: stores.passwordStore.activeAtRiskPasswordType == AtRiskType.Weak,
							onClick: function ()
							{
								stores.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Weak);
							}
						});
					models.push(
						{
							key: `pcl${stores.passwordStore.containsLoginPasswords.value.length}${stores.passwordStore.passwords.length}`,
							title: 'Contains Username',
							filledAmount: stores.passwordStore.containsLoginPasswords.value.length,
							totalAmount: stores.passwordStore.passwords.length,
							color: stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '2' },
							active: stores.passwordStore.activeAtRiskPasswordType == AtRiskType.ContainsLogin,
							onClick: function ()
							{
								stores.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.ContainsLogin);
							}
						});
			}

			return models;
		});


		return {
			refreshKey,
			title,
			passwordValueMetricGaugeModels
		}
	}
})
</script>
<style>
.passwordValueGaugesWidget {
	position: absolute;
	left: 81%;
	top: 4%;
	width: 17%;
	height: 30%;
}

@media (max-width: 1450px) {
	.passwordValueGaugesWidget {
		left: max(935px, 82%);
	}
}

@media (max-height: 650px) {
	.passwordValueGaugesWidget {
		top: max(12px, 2%);
	}
}
</style>
