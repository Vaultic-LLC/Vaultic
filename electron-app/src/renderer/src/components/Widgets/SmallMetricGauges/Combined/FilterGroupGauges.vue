<template>
	<div class="filterGroupGaugeContainer">
		<CombinedMetricGaugeContainer :refreshKey="refreshKey" :title="title">
			<EmptyFilterGroupGauge :style="{ 'grid-row': 1, 'grid-column': 1 }" />
			<DuplicateFilterGroupGauge :style="{ 'grid-row': 1, 'grid-column': 2 }" />
		</CombinedMetricGaugeContainer>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import EmptyFilterGroupGauge from '../Single/EmptyFilterGroupGauge.vue';
import DuplicateFilterGroupGauge from '../Single/DuplicateFilterGroupGauge.vue';
import CombinedMetricGaugeContainer from '../../../SmallMetricGauges/CombinedMetricGaugeContainer.vue';
import { stores } from '@renderer/Objects/Stores';
import { DataType } from '@renderer/Types/Table';

export default defineComponent({
	name: "FilterGroupGauges",
	components:
	{
		EmptyFilterGroupGauge,
		DuplicateFilterGroupGauge,
		CombinedMetricGaugeContainer
	},
	setup()
	{
		const refreshKey: Ref<string> = ref('');
		const title: ComputedRef<string> = computed(() => stores.appStore.activeFilterGroupsTable == DataType.Filters ? "Filters to Fix" : "Groups to Fix");

		watch(() => stores.appStore.activeFilterGroupsTable, () =>
		{
			refreshKey.value = Date.now().toString();
		});

		watch(() => stores.appStore.activePasswordValuesTable, () =>
		{
			refreshKey.value = Date.now().toString();
		});

		return {
			refreshKey,
			title
		}
	}
})
</script>
<style></style>
