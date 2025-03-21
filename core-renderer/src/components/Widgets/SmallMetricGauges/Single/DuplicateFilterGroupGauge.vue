<template>
    <div class="duplicateFiledGroupGaugeContainer">
        <SmallMetricGauge :model="model" :key="model.key" />
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import SmallMetricGauge from "../../../Dashboard/SmallMetricGauge.vue"

import { SmallMetricGaugeModel } from "../../../../Types/Models"
import app from "../../../../Objects/Stores/AppStore";
import { DataType, AtRiskType } from '../../../../Types/DataTypes';

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
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    switch (app.activeFilterGroupsTable)
                    {
                        case DataType.Groups:
                            return {
                                key: `vgdup${app.currentVault.groupStore.duplicateValueGroups.size}${app.currentVault.groupStore.valuesGroups.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.groupStore.duplicateValueGroups.size,
                                totalAmount: app.currentVault.groupStore.valuesGroups.length,
                                color: app.userPreferences.currentColorPalette.g,
                                active: app.currentVault.groupStore.activeAtRiskValueGroupType == AtRiskType.Duplicate,
                                onClick: function ()
                                {
                                    app.currentVault.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
                                }
                            };
                        case DataType.Filters:
                        default:
                            return {
                                key: `vfdup${app.currentVault.filterStore.duplicateValueFilters.size}${app.currentVault.filterStore.nameValuePairFilters.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.filterStore.duplicateValueFilters.size,
                                totalAmount: app.currentVault.filterStore.nameValuePairFilters.length,
                                color: app.userPreferences.currentColorPalette.f,
                                active: app.currentVault.filterStore.activeAtRiskValueFilterType == AtRiskType.Duplicate,
                                onClick: function ()
                                {
                                    app.currentVault.filterStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
                                }
                            };
                    }
                case DataType.Passwords:
                default:
                    switch (app.activeFilterGroupsTable)
                    {
                        case DataType.Groups:
                            return {
                                key: `pgdup${app.currentVault.groupStore.duplicatePasswordGroups.size}${app.currentVault.groupStore.passwordGroups.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.groupStore.duplicatePasswordGroups.size,
                                totalAmount: app.currentVault.groupStore.passwordGroups.length,
                                color: app.userPreferences.currentColorPalette.g,
                                active: app.currentVault.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Duplicate,
                                onClick: function ()
                                {
                                    app.currentVault.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
                                }
                            };
                        case DataType.Filters:
                        default:
                            return {
                                key: `pfdup${app.currentVault.filterStore.duplicatePasswordFilters.size}${app.currentVault.filterStore.passwordFilters.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.filterStore.duplicatePasswordFilters.size,
                                totalAmount: app.currentVault.filterStore.passwordFilters.length,
                                color: app.userPreferences.currentColorPalette.f,
                                active: app.currentVault.filterStore.activeAtRiskPasswordFilterType == AtRiskType.Duplicate,
                                onClick: function ()
                                {
                                    app.currentVault.filterStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
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
