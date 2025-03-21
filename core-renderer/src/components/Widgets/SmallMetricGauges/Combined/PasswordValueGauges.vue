<template>
    <div class="passwordValueGaugesWidget">
        <CombinedMetricGaugeContainer :refreshKey="refreshKey" :title="title">
            <SmallMetricGauge v-for="(model, index) in passwordValueMetricGaugeModels" :key="model.key" :model="model"
                :class="{
            'passwordValueGaugesWidget__gaugeOne': index == 0,
            'passwordValueGaugesWidget__gaugeTwo': index == 1,
            'passwordValueGaugesWidget__gaugeThree': index == 2,
            'passwordValueGaugesWidget__gaugeFour': index == 3,
        }" />
        </CombinedMetricGaugeContainer>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import CombinedMetricGaugeContainer from '../../../SmallMetricGauges/CombinedMetricGaugeContainer.vue';
import SmallMetricGauge from '../../../../components/Dashboard/SmallMetricGauge.vue';

import { SmallMetricGaugeModel } from '../../../../Types/Models';
import app from "../../../../Objects/Stores/AppStore";
import { DataType, AtRiskType } from '../../../../Types/DataTypes';
import { OH } from '@vaultic/shared/Utilities/PropertyManagers';

export default defineComponent({
    name: "PasswordValueGauges",
    components:
    {
        CombinedMetricGaugeContainer,
        SmallMetricGauge
    },
    setup()
    {
        const refreshKey: Ref<string> = ref('');
        const title: ComputedRef<string> = computed(() => app.activePasswordValuesTable == DataType.Passwords ? "Passwords at Risk" : "Values at Risk");

        watch(() => app.activePasswordValuesTable, () =>
        {
            refreshKey.value = Date.now().toString();
        });

        const passwordValueMetricGaugeModels: ComputedRef<SmallMetricGaugeModel[]> = computed(() =>
        {
            let models: SmallMetricGaugeModel[] = [];
            switch (app.activePasswordValuesTable)
            {
                case DataType.NameValuePairs:
                    models.push(
                        {
                            key: `vold${app.currentVault.valueStore.oldNameValuePairs.value.length}${app.currentVault.valueStore.nameValuePairs.length}`,
                            title: 'Old',
                            filledAmount: app.currentVault.valueStore.oldNameValuePairs.value.length,
                            totalAmount: app.currentVault.valueStore.nameValuePairs.length,
                            color: app.userPreferences.currentColorPalette.v.p,
                            active: app.currentVault.valueStore.activeAtRiskValueType == AtRiskType.Old,
                            onClick: function ()
                            {
                                app.currentVault.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Old)
                            }
                        });
                    models.push(
                        {
                            key: `vdup${OH.size(app.currentVault.valueStore.duplicateNameValuePairs)}${app.currentVault.valueStore.nameValuePairs.length}`,
                            title: 'Duplicate',
                            filledAmount: OH.size(app.currentVault.valueStore.duplicateNameValuePairs),
                            totalAmount: app.currentVault.valueStore.nameValuePairs.length,
                            color: app.userPreferences.currentColorPalette.v.p,
                            active: app.currentVault.valueStore.activeAtRiskValueType == AtRiskType.Duplicate,
                            onClick: function ()
                            {
                                app.currentVault.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Duplicate);
                            }
                        });
                    models.push(
                        {
                            key: `vwv${app.currentVault.valueStore.weakPassphraseValues.value.length}${app.currentVault.valueStore.nameValuePairs.length}`,
                            title: 'Weak Phrase',
                            filledAmount: app.currentVault.valueStore.weakPassphraseValues.value.length,
                            totalAmount: app.currentVault.valueStore.nameValuePairs.length,
                            color: app.userPreferences.currentColorPalette.v.p,
                            active: app.currentVault.valueStore.activeAtRiskValueType == AtRiskType.WeakPhrase,
                            onClick: function ()
                            {
                                app.currentVault.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.WeakPhrase)
                            }
                        });
                    models.push(
                        {
                            key: `vwp${app.currentVault.valueStore.weakPasscodeValues.value.length}${app.currentVault.valueStore.nameValuePairs.length}`,
                            title: 'Weak Passcode',
                            filledAmount: app.currentVault.valueStore.weakPasscodeValues.value.length,
                            totalAmount: app.currentVault.valueStore.nameValuePairs.length,
                            color: app.userPreferences.currentColorPalette.v.p,
                            active: app.currentVault.valueStore.activeAtRiskValueType == AtRiskType.Weak,
                            onClick: function ()
                            {
                                app.currentVault.valueStore.toggleAtRiskType(DataType.NameValuePairs, AtRiskType.Weak);
                            }
                        });
                    break;
                case DataType.Passwords:
                default:
                    models.push(
                        {
                            key: `pold${app.currentVault.passwordStore.oldPasswords.value.length}${app.currentVault.passwordStore.passwords.length}`,
                            title: 'Old',
                            filledAmount: app.currentVault.passwordStore.oldPasswords.value.length,
                            totalAmount: app.currentVault.passwordStore.passwords.length,
                            color: app.userPreferences.currentColorPalette.p.p,
                            active: app.currentVault.passwordStore.activeAtRiskPasswordType == AtRiskType.Old,
                            onClick: function ()
                            {
                                app.currentVault.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Old);
                            }
                        });
                    models.push(
                        {
                            key: `pdup${OH.size(app.currentVault.passwordStore.duplicatePasswords)}${app.currentVault.passwordStore.passwords.length}`,
                            title: 'Duplicate',
                            filledAmount: OH.size(app.currentVault.passwordStore.duplicatePasswords),
                            totalAmount: app.currentVault.passwordStore.passwords.length,
                            color: app.userPreferences.currentColorPalette.p.p,
                            active: app.currentVault.passwordStore.activeAtRiskPasswordType == AtRiskType.Duplicate,
                            onClick: function ()
                            {
                                app.currentVault.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Duplicate);
                            }
                        });
                    models.push(
                        {
                            key: `pweak${app.currentVault.passwordStore.weakPasswords.value.length}${app.currentVault.passwordStore.passwords.length}`,
                            title: 'Weak',
                            filledAmount: app.currentVault.passwordStore.weakPasswords.value.length,
                            totalAmount: app.currentVault.passwordStore.passwords.length,
                            color: app.userPreferences.currentColorPalette.p.p,
                            active: app.currentVault.passwordStore.activeAtRiskPasswordType == AtRiskType.Weak,
                            onClick: function ()
                            {
                                app.currentVault.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Weak);
                            }
                        });
                    models.push(
                        {
                            key: `pcl${app.currentVault.passwordStore.containsLoginPasswords.value.length}${app.currentVault.passwordStore.passwords.length}`,
                            title: 'Contains Username',
                            filledAmount: app.currentVault.passwordStore.containsLoginPasswords.value.length,
                            totalAmount: app.currentVault.passwordStore.passwords.length,
                            color: app.userPreferences.currentColorPalette.p.p,
                            active: app.currentVault.passwordStore.activeAtRiskPasswordType == AtRiskType.ContainsLogin,
                            onClick: function ()
                            {
                                app.currentVault.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.ContainsLogin);
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
<style>
.passwordValueGaugesWidget {
    position: absolute;
    left: 83%;
    top: 4%;
    width: 16%;
    height: 30%;
}

@media (max-height: 650px) {
    .passwordValueGaugesWidget {
        top: max(12px, 2%);
    }
}

.passwordValueGaugesWidget__gaugeOne {
    grid-row: 1;
    grid-column: 1;
}

.passwordValueGaugesWidget__gaugeTwo {
    grid-row: 1;
    grid-column: 2;
}

.passwordValueGaugesWidget__gaugeThree {
    grid-row: 2;
    grid-column: 1;
}

.passwordValueGaugesWidget__gaugeFour {
    grid-row: 2;
    grid-column: 2;
}
</style>
