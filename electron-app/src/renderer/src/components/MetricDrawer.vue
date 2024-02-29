<template>
	<div class="metricDrawer">
		<!-- <Transition name="fade" mode="out-in">
			<h2 class="atRiskTitle" :key="passwordValueRiskTitle">{{ passwordValueRiskTitle }}</h2>
		</Transition> -->
		<div class="passwordValueAtRiskModels">
			<PasswordValueGauges />
			<!-- <SmallMetricGauge v-for="model in passwordValueMetricGaugeModels" :key="model.key" :model="model"
				:style="model.style" /> -->
		</div>
		<!-- <Transition name="fade" mode="out-in">
			<h2 class="atRiskTitle" :key="passwordValueRiskTitle + filterGroupAtRiskTitle">{{ filterGroupAtRiskTitle }}</h2>
		</Transition> -->
		<div class="filterGroupAtRiskModels">
			<!-- <SmallMetricGauge v-for="model in filterGroupSmallMetricGaugeModels" :key="model.key" :model="model"
				:style="model.style" /> -->
			<FilterGroupGauges />
		</div>
		<PasswordStrengthProgressChart />
		<LoginHistoryCalendar :style="{ width: '90%', height: '25%', 'marginTop': '100px' }" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import SmallMetricGauge from "./Dashboard/SmallMetricGauge.vue"
import PasswordStrengthProgressChart from './Dashboard/PasswordStrengthProgressChart.vue';
import LoginHistoryCalendar from './Widgets/LoginHistoryCalendar.vue';
import FilterGroupGauges from "./Widgets/SmallMetricGauges/Combined/FilterGroupGauges.vue"
import PasswordValueGauges from "./Widgets/SmallMetricGauges/Combined/PasswordValueGauges.vue"

import { DataType } from '../Types/Table';
import { SmallMetricGaugeModel } from '../Types/Models';
import { AtRiskType } from "../Types/EncryptedData";
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "MetricDrawer",
	components:
	{
		SmallMetricGauge,
		PasswordStrengthProgressChart,
		LoginHistoryCalendar,
		FilterGroupGauges,
		PasswordValueGauges
	},
	setup()
	{
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);
		const passwordValueRiskTitle: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			"Passwords at Risk" : "Values at Risk");

		const filterGroupAtRiskTitle: ComputedRef<string> = computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters ?
			"Filters to Fix" : "Groups to Fix");

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
							title: 'Contains Login',
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

		const filterGroupSmallMetricGaugeModels: ComputedRef<SmallMetricGaugeModel[]> = computed(() =>
		{
			let models: SmallMetricGaugeModel[] = [];
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					switch (stores.appStore.activeFilterGroupsTable)
					{
						case DataType.Groups:
							models.push(
								{
									key: `vgempty${stores.groupStore.emptyValueGroups.length}${stores.groupStore.valuesGroups.length}`,
									title: 'Empty',
									filledAmount: stores.groupStore.emptyValueGroups.length,
									totalAmount: stores.groupStore.valuesGroups.length,
									color: stores.settingsStore.currentColorPalette.groupsColor,
									style: { 'grid-row': '1', 'grid-column': '1' },
									active: stores.groupStore.activeAtRiskValueGroupType == AtRiskType.Empty,
									onClick: function ()
									{
										stores.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Empty);
									}
								});
							models.push(
								{
									key: `vgdup${stores.groupStore.duplicateValueGroupLength}${stores.groupStore.valuesGroups.length}`,
									title: 'Duplicate',
									filledAmount: stores.groupStore.duplicateValueGroupLength,
									totalAmount: stores.groupStore.valuesGroups.length,
									color: stores.settingsStore.currentColorPalette.groupsColor,
									style: { 'grid-row': '1', 'grid-column': '2' },
									active: stores.groupStore.activeAtRiskValueGroupType == AtRiskType.Duplicate,
									onClick: function ()
									{
										stores.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
									}
								});
							break;
						case DataType.Filters:
						default:
							models.push(
								{
									key: `vfempty${stores.filterStore.emptyValueFilters.length}${stores.filterStore.nameValuePairFilters.length}`,
									title: 'Empty',
									filledAmount: stores.filterStore.emptyValueFilters.length,
									totalAmount: stores.filterStore.nameValuePairFilters.length,
									color: stores.settingsStore.currentColorPalette.filtersColor,
									style: { 'grid-row': '1', 'grid-column': '1' },
									active: stores.filterStore.activeAtRiskValueFilterType == AtRiskType.Empty,
									onClick: function ()
									{
										stores.filterStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Empty);
									}
								});
							models.push(
								{
									key: `vfdup${stores.filterStore.duplicateValueFiltersLength}${stores.filterStore.nameValuePairFilters.length}`,
									title: 'Duplicate',
									filledAmount: stores.filterStore.duplicateValueFiltersLength,
									totalAmount: stores.filterStore.nameValuePairFilters.length,
									color: stores.settingsStore.currentColorPalette.filtersColor,
									style: { 'grid-row': '1', 'grid-column': '2' },
									active: stores.filterStore.activeAtRiskValueFilterType == AtRiskType.Duplicate,
									onClick: function ()
									{
										stores.filterStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
									}
								});
					}
					break;
				case DataType.Passwords:
				default:
					switch (stores.appStore.activeFilterGroupsTable)
					{
						case DataType.Groups:
							models.push(
								{
									key: `pgempty${stores.groupStore.emptyPasswordGroups.length}${stores.groupStore.passwordGroups.length}`,
									title: 'Empty',
									filledAmount: stores.groupStore.emptyPasswordGroups.length,
									totalAmount: stores.groupStore.passwordGroups.length,
									color: stores.settingsStore.currentColorPalette.groupsColor,
									style: { 'grid-row': '1', 'grid-column': '1' },
									active: stores.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Empty,
									onClick: function ()
									{
										stores.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Empty);
									}
								});
							models.push(
								{
									key: `pgdup${stores.groupStore.duplicatePasswordGroupLength}${stores.groupStore.passwordGroups.length}`,
									title: 'Duplicate',
									filledAmount: stores.groupStore.duplicatePasswordGroupLength,
									totalAmount: stores.groupStore.passwordGroups.length,
									color: stores.settingsStore.currentColorPalette.groupsColor,
									style: { 'grid-row': '1', 'grid-column': '2' },
									active: stores.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Duplicate,
									onClick: function ()
									{
										stores.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
									}
								});
							break;
						case DataType.Filters:
						default:
							models.push(
								{
									key: `pfempty${stores.filterStore.emptyPasswordFilters.length}${stores.filterStore.passwordFilters.length}`,
									title: 'Empty',
									filledAmount: stores.filterStore.emptyPasswordFilters.length,
									totalAmount: stores.filterStore.passwordFilters.length,
									color: stores.settingsStore.currentColorPalette.filtersColor,
									style: { 'grid-row': '1', 'grid-column': '1' },
									active: stores.filterStore.activeAtRiskPasswordFilterType == AtRiskType.Empty,
									onClick: function ()
									{
										stores.filterStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Empty);
									}
								});
							models.push(
								{
									key: `pfdup${stores.filterStore.duplicatePasswordFiltersLength}${stores.filterStore.passwordFilters.length}`,
									title: 'Duplicate',
									filledAmount: stores.filterStore.duplicatePasswordFiltersLength,
									totalAmount: stores.filterStore.passwordFilters.length,
									color: stores.settingsStore.currentColorPalette.filtersColor,
									style: { 'grid-row': '1', 'grid-column': '2' },
									active: stores.filterStore.activeAtRiskPasswordFilterType == AtRiskType.Duplicate,
									onClick: function ()
									{
										stores.filterStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
									}
								});
					}

			}

			return models;
		});

		return {
			passwordValueRiskTitle,
			filterGroupAtRiskTitle,
			passwordValueMetricGaugeModels,
			filterGroupSmallMetricGaugeModels,
			primaryColor
		}
	}
})
</script>

<style>
.metricDrawer {
	height: 100%;
	width: 20%;
	position: fixed;
	/* background-color: #0f141a; */
	right: 0;
	top: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	/* box-shadow: 0 5px 25px rgba(0, 0, 0, 0.25); */
}

.metricDrawer .atRiskTitle {
	user-select: none;
	color: white;
	margin-top: 50px;
}

.passwordValueAtRiskModels {
	padding: 10px;
	display: grid;
	flex-wrap: wrap;
	width: 100%;
	place-items: center;
	margin-bottom: 50px;
	row-gap: 100px;
}

.filterGroupAtRiskModels {
	padding: 10px;
	display: grid;
	flex-wrap: wrap;
	gap: 10px;
	width: 100%;
	place-items: center;
	margin-bottom: 50px;
}
</style>
