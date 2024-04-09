<template>
	<div class="duplicateFiledGroupGaugeContainer">
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
	name: "DuplicateFilterGroupGauge",
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
								key: `vgdup${stores.groupStore.duplicateValueGroupLength}${stores.groupStore.valuesGroups.length}`,
								title: 'Duplicate',
								filledAmount: stores.groupStore.duplicateValueGroupLength,
								totalAmount: stores.groupStore.valuesGroups.length,
								color: stores.settingsStore.currentColorPalette.groupsColor,
								active: stores.groupStore.activeAtRiskValueGroupType == AtRiskType.Duplicate,
								onClick: function ()
								{
									stores.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
								}
							};
						case DataType.Filters:
						default:
							return {
								key: `vfdup${stores.filterStore.duplicateValueFiltersLength}${stores.filterStore.nameValuePairFilters.length}`,
								title: 'Duplicate',
								filledAmount: stores.filterStore.duplicateValueFiltersLength,
								totalAmount: stores.filterStore.nameValuePairFilters.length,
								color: stores.settingsStore.currentColorPalette.filtersColor,
								active: stores.filterStore.activeAtRiskValueFilterType == AtRiskType.Duplicate,
								onClick: function ()
								{
									stores.filterStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
								}
							};
					}
				case DataType.Passwords:
				default:
					switch (stores.appStore.activeFilterGroupsTable)
					{
						case DataType.Groups:
							return {
								key: `pgdup${stores.groupStore.duplicatePasswordGroupLength}${stores.groupStore.passwordGroups.length}`,
								title: 'Duplicate',
								filledAmount: stores.groupStore.duplicatePasswordGroupLength,
								totalAmount: stores.groupStore.passwordGroups.length,
								color: stores.settingsStore.currentColorPalette.groupsColor,
								active: stores.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Duplicate,
								onClick: function ()
								{
									stores.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
								}
							};
						case DataType.Filters:
						default:
							return {
								key: `pfdup${stores.filterStore.duplicatePasswordFiltersLength}${stores.filterStore.passwordFilters.length}`,
								title: 'Duplicate',
								filledAmount: stores.filterStore.duplicatePasswordFiltersLength,
								totalAmount: stores.filterStore.passwordFilters.length,
								color: stores.settingsStore.currentColorPalette.filtersColor,
								active: stores.filterStore.activeAtRiskPasswordFilterType == AtRiskType.Duplicate,
								onClick: function ()
								{
									stores.filterStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
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
