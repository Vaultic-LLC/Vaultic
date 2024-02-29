<template>
	<div class="filterGroupGaugeContainer">
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
	name: "FilterGroupGauges",
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
							key: `vold${stores.encryptedDataStore.oldNameValuePairs.value.length}${stores.encryptedDataStore.nameValuePairs.length}`,
							title: 'Old',
							filledAmount: stores.encryptedDataStore.oldNameValuePairs.value.length,
							totalAmount: stores.encryptedDataStore.nameValuePairs.length,
							color: stores.settingsStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '1' },
							active: stores.encryptedDataStore.activeAtRiskValueType == AtRiskType.Old,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.NameValuePairs, AtRiskType.Old)
							}
						});
					models.push(
						{
							key: `vdup${stores.encryptedDataStore.duplicateNameValuePairsLength}${stores.encryptedDataStore.nameValuePairs.length}`,
							title: 'Duplicate',
							filledAmount: stores.encryptedDataStore.duplicateNameValuePairsLength,
							totalAmount: stores.encryptedDataStore.nameValuePairs.length,
							color: stores.settingsStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '2' },
							active: stores.encryptedDataStore.activeAtRiskValueType == AtRiskType.Duplicate,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.NameValuePairs, AtRiskType.Duplicate);
							}
						});
					models.push(
						{
							key: `vwv${stores.encryptedDataStore.weakVerbalValues.value.length}${stores.encryptedDataStore.nameValuePairs.length}`,
							title: 'Weak Verbal',
							filledAmount: stores.encryptedDataStore.weakVerbalValues.value.length,
							totalAmount: stores.encryptedDataStore.nameValuePairs.length,
							color: stores.settingsStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '1' },
							active: stores.encryptedDataStore.activeAtRiskValueType == AtRiskType.WeakVerabl,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.NameValuePairs, AtRiskType.WeakVerabl)
							}
						});
					models.push(
						{
							key: `vwp${stores.encryptedDataStore.weakPasscodeValues.value.length}${stores.encryptedDataStore.nameValuePairs.length}`,
							title: 'Weak Passcode',
							filledAmount: stores.encryptedDataStore.weakPasscodeValues.value.length,
							totalAmount: stores.encryptedDataStore.nameValuePairs.length,
							color: stores.settingsStore.currentColorPalette.valuesColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '2' },
							active: stores.encryptedDataStore.activeAtRiskValueType == AtRiskType.Weak,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.NameValuePairs, AtRiskType.Weak);
							}
						});
					break;
				case DataType.Passwords:
				default:
					models.push(
						{
							key: `pold${stores.encryptedDataStore.oldPasswords.value.length}${stores.encryptedDataStore.passwords.length}`,
							title: 'Old',
							filledAmount: stores.encryptedDataStore.oldPasswords.value.length,
							totalAmount: stores.encryptedDataStore.passwords.length,
							color: stores.settingsStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '1' },
							active: stores.encryptedDataStore.activeAtRiskPasswordType == AtRiskType.Old,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.Passwords, AtRiskType.Old);
							}
						});
					models.push(
						{
							key: `pdup${stores.encryptedDataStore.duplicatePasswordsLength}${stores.encryptedDataStore.passwords.length}`,
							title: 'Duplicate',
							filledAmount: stores.encryptedDataStore.duplicatePasswordsLength,
							totalAmount: stores.encryptedDataStore.passwords.length,
							color: stores.settingsStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '1', 'grid-column': '2' },
							active: stores.encryptedDataStore.activeAtRiskPasswordType == AtRiskType.Duplicate,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.Passwords, AtRiskType.Duplicate);
							}
						});
					models.push(
						{
							key: `pweak${stores.encryptedDataStore.weakPasswords.value.length}${stores.encryptedDataStore.passwords.length}`,
							title: 'Weak',
							filledAmount: stores.encryptedDataStore.weakPasswords.value.length,
							totalAmount: stores.encryptedDataStore.passwords.length,
							color: stores.settingsStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '1' },
							active: stores.encryptedDataStore.activeAtRiskPasswordType == AtRiskType.Weak,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.Passwords, AtRiskType.Weak);
							}
						});
					models.push(
						{
							key: `pcl${stores.encryptedDataStore.containsLoginPasswords.value.length}${stores.encryptedDataStore.passwords.length}`,
							title: 'Contains Username',
							filledAmount: stores.encryptedDataStore.containsLoginPasswords.value.length,
							totalAmount: stores.encryptedDataStore.passwords.length,
							color: stores.settingsStore.currentColorPalette.passwordsColor.primaryColor,
							style: { 'grid-row': '2', 'grid-column': '2' },
							active: stores.encryptedDataStore.activeAtRiskPasswordType == AtRiskType.ContainsLogin,
							onClick: function ()
							{
								stores.encryptedDataStore.toggleAtRiskModels(DataType.Passwords, AtRiskType.ContainsLogin);
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
<style></style>
