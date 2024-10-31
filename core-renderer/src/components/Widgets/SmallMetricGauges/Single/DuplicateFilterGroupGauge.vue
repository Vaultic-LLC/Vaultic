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
                                key: `vgdup${app.currentVault.groupStore.duplicateValueGroupLength}${app.currentVault.groupStore.valuesGroups.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.groupStore.duplicateValueGroupLength,
                                totalAmount: app.currentVault.groupStore.valuesGroups.length,
                                color: app.userPreferences.currentColorPalette.groupsColor.value,
                                active: app.currentVault.groupStore.activeAtRiskValueGroupType == AtRiskType.Duplicate,
                                onClick: function ()
                                {
                                    app.currentVault.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
                                }
                            };
                        case DataType.Filters:
                        default:
                            return {
                                key: `vfdup${app.currentVault.filterStore.duplicateValueFiltersLength}${app.currentVault.filterStore.nameValuePairFilters.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.filterStore.duplicateValueFiltersLength,
                                totalAmount: app.currentVault.filterStore.nameValuePairFilters.length,
                                color: app.userPreferences.currentColorPalette.filtersColor.value,
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
                                key: `pgdup${app.currentVault.groupStore.duplicatePasswordGroupLength}${app.currentVault.groupStore.passwordGroups.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.groupStore.duplicatePasswordGroupLength,
                                totalAmount: app.currentVault.groupStore.passwordGroups.length,
                                color: app.userPreferences.currentColorPalette.groupsColor.value,
                                active: app.currentVault.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Duplicate,
                                onClick: function ()
                                {
                                    app.currentVault.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
                                }
                            };
                        case DataType.Filters:
                        default:
                            return {
                                key: `pfdup${app.currentVault.filterStore.duplicatePasswordFiltersLength}${app.currentVault.filterStore.passwordFilters.length}`,
                                title: 'Duplicate',
                                filledAmount: app.currentVault.filterStore.duplicatePasswordFiltersLength,
                                totalAmount: app.currentVault.filterStore.passwordFilters.length,
                                color: app.userPreferences.currentColorPalette.filtersColor.value,
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
