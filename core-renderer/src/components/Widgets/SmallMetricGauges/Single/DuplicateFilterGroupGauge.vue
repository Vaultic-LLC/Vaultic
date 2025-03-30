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
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

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
                            const vGSize = OH.size(app.currentVault.groupStore.duplicateValueGroups);
                            return {
                                key: `vgdup${vGSize}${app.currentVault.groupStore.valuesGroups.length}`,
                                title: 'Duplicate',
                                filledAmount: vGSize,
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
                            const vFSize = OH.size(app.currentVault.filterStore.duplicateValueFilters);
                            return {
                                key: `vfdup${vFSize}${app.currentVault.filterStore.nameValuePairFilters.length}`,
                                title: 'Duplicate',
                                filledAmount: vFSize,
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
                            const pgSize = OH.size(app.currentVault.groupStore.duplicatePasswordGroups);
                            return {
                                key: `pgdup${pgSize}${app.currentVault.groupStore.passwordGroups.length}`,
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
                            const pFSize = OH.size(app.currentVault.filterStore.duplicatePasswordFilters);
                            return {
                                key: `pfdup${pFSize}${app.currentVault.filterStore.passwordFilters.length}`,
                                title: 'Duplicate',
                                filledAmount: pFSize,
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
