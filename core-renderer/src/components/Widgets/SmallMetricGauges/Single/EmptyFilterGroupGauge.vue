<template>
    <div class="emptyFiledGroupGaugeContainer">
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
    name: "EmptyFilterGroupGauge",
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
                                key: `vgempty${app.currentVault.groupStore.emptyValueGroups.length}${app.currentVault.groupStore.valuesGroups.length}`,
                                title: 'Empty',
                                filledAmount: app.currentVault.groupStore.emptyValueGroups.length,
                                totalAmount: app.currentVault.groupStore.valuesGroups.length,
                                color: app.userPreferences.currentColorPalette.groupsColor,
                                active: app.currentVault.groupStore.activeAtRiskValueGroupType == AtRiskType.Empty,
                                onClick: function ()
                                {
                                    app.currentVault.groupStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Empty);
                                }
                            };
                        case DataType.Filters:
                        default:
                            return {
                                key: `vfempty${app.currentVault.filterStore.emptyValueFilters.length}${app.currentVault.filterStore.nameValuePairFilters.length}`,
                                title: 'Empty',
                                filledAmount: app.currentVault.filterStore.emptyValueFilters.length,
                                totalAmount: app.currentVault.filterStore.nameValuePairFilters.length,
                                color: app.userPreferences.currentColorPalette.filtersColor,
                                active: app.currentVault.filterStore.activeAtRiskValueFilterType == AtRiskType.Empty,
                                onClick: function ()
                                {
                                    app.currentVault.filterStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Empty);
                                }
                            };
                    }
                case DataType.Passwords:
                default:
                    switch (app.activeFilterGroupsTable)
                    {
                        case DataType.Groups:
                            return {
                                key: `pgempty${app.currentVault.groupStore.emptyPasswordGroups.length}${app.currentVault.groupStore.passwordGroups.length}`,
                                title: 'Empty',
                                filledAmount: app.currentVault.groupStore.emptyPasswordGroups.length,
                                totalAmount: app.currentVault.groupStore.passwordGroups.length,
                                color: app.userPreferences.currentColorPalette.groupsColor,
                                active: app.currentVault.groupStore.activeAtRiskPasswordGroupType == AtRiskType.Empty,
                                onClick: function ()
                                {
                                    app.currentVault.groupStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Empty);
                                }
                            };
                        case DataType.Filters:
                        default:
                            return {
                                key: `pfempty${app.currentVault.filterStore.emptyPasswordFilters.length}${app.currentVault.filterStore.passwordFilters.length}`,
                                title: 'Empty',
                                filledAmount: app.currentVault.filterStore.emptyPasswordFilters.length,
                                totalAmount: app.currentVault.filterStore.passwordFilters.length,
                                color: app.userPreferences.currentColorPalette.filtersColor,
                                active: app.currentVault.filterStore.activeAtRiskPasswordFilterType == AtRiskType.Empty,
                                onClick: function ()
                                {
                                    app.currentVault.filterStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Empty);
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
