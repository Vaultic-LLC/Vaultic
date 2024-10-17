<template>
    <div class="filterGroupGaugesWidget">
        <CombinedMetricGaugeContainer :refreshKey="refreshKey" :title="title">
            <EmptyFilterGroupGauge class="filterGroupGaugesWidget__emptyFilerGroupGauge" />
            <DuplicateFilterGroupGauge class="filterGroupGaugesWidget__duplicateFilterGroupGauge" />
        </CombinedMetricGaugeContainer>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import EmptyFilterGroupGauge from '../Single/EmptyFilterGroupGauge.vue';
import DuplicateFilterGroupGauge from '../Single/DuplicateFilterGroupGauge.vue';
import CombinedMetricGaugeContainer from '../../../SmallMetricGauges/CombinedMetricGaugeContainer.vue';

import app from "../../../../Objects/Stores/AppStore";
import { DataType } from '../../../../Types/DataTypes';

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
        const title: ComputedRef<string> = computed(() => app.activeFilterGroupsTable == DataType.Filters ? "Filters to Fix" : "Groups to Fix");

        watch(() => app.activeFilterGroupsTable, () =>
        {
            refreshKey.value = Date.now().toString();
        });

        watch(() => app.activePasswordValuesTable, () =>
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
<style>
.filterGroupGaugesWidget {
    position: absolute;
    left: 83%;
    top: 45%;
    width: 16%;
}

@media (max-width: 1450px) {
    .filterGroupGaugesWidget {
        left: max(935px, 82%);
    }
}

@media (max-height: 650px) {
    .filterGroupGaugesWidget {
        top: max(258px, 43%);
    }
}

.filterGroupGaugesWidget__emptyFilerGroupGauge {
    grid-row: 1;
    grid-column: 1;
}

.filterGroupGaugesWidget__duplicateFilterGroupGauge {
    grid-row: 1;
    grid-column: 2;
}
</style>
