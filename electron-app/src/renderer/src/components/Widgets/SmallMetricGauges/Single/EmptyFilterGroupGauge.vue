<template>
	<div class="emptyFiledGroupGaugeContainer">
		<SmallMetricGauge :model="model" :key="model.key" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import SmallMetricGauge from "../../../Dashboard/SmallMetricGauge.vue"

import { AtRiskType } from '../../../../Types/EncryptedData';
import { DataType } from '../../../../Types/Table';
import { SmallMetricGaugeModel } from "../../../../Types/Models"
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "EmptyFilterGroupGauge",
	components:
	{
		SmallMetricGauge
	},
	setup()
	{
		const model: ComputedRef<SmallMetricGaugeModel> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					switch (stores.appStore.activeFilterGroupsTable)
					{
						case DataType.Groups:
							return {
								key: `vgempty${stores.groupStore.emptyValueGroups.length}${stores.groupStore.valuesGroups.length}`,
								title: 'Empty',
								filledAmount: stores.groupStore.emptyValueGroups.length,
								totalAmount: stores.groupStore.valuesGroups.length,
								color: stores.settingsStore.currentColorPalette.groupsColor,
								active: stores.groupStore.activeAtRiskValueGroupType == AtRiskType.Empty,
								onClick: function ()
								{
									stores.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Empty);
								}
							};
						case DataType.Filters:
						default:
							return {
								key: `vfempty${stores.filterStore.emptyValueFilters.length}${stores.filterStore.nameValuePairFilters.length}`,
								title: 'Empty',
								filledAmount: stores.filterStore.emptyValueFilters.length,
								totalAmount: stores.filterStore.nameValuePairFilters.length,
								color: stores.settingsStore.currentColorPalette.filtersColor,
								active: stores.filterStore.activeAtRiskValueFilterType == AtRiskType.Empty,
								onClick: function ()
								{
									stores.filterStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Empty);
								}
							};
					}
				case DataType.Passwords:
				default:
					switch (stores.appStore.activeFilterGroupsTable)
					{
						case DataType.Groups:
							return {
								key: `pgempty${stores.groupStore.emptyPasswordGroups.length}${stores.groupStore.passwordGroups.length}`,
								title: 'Empty',
								filledAmount: stores.groupStore.emptyPasswordGroups.length,
								totalAmount: stores.groupStore.passwordGroups.length,
								color: stores.settingsStore.currentColorPalette.groupsColor,
								active: stores.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Empty,
								onClick: function ()
								{
									stores.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Empty);
								}
							};
						case DataType.Filters:
						default:
							return {
								key: `pfempty${stores.filterStore.emptyPasswordFilters.length}${stores.filterStore.passwordFilters.length}`,
								title: 'Empty',
								filledAmount: stores.filterStore.emptyPasswordFilters.length,
								totalAmount: stores.filterStore.passwordFilters.length,
								color: stores.settingsStore.currentColorPalette.filtersColor,
								active: stores.filterStore.activeAtRiskPasswordFilterType == AtRiskType.Empty,
								onClick: function ()
								{
									stores.filterStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Empty);
								}
							};
					}
			}
		});

		return {
			model
		}
	}
})
</script>
<style></style>
