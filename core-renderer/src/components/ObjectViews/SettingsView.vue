<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <ScrollView :color="color" class="settingsView__container">
            <div class="settingsView__sectionTitle settingsView__appSettings">App Settings</div>
            <div class="settingsView__inputSection">
                <EnumInputField class="settingsView__autoLockTime" :label="'Auto Lock Time'" :color="color"
                    v-model="appSettings.autoLockTime.value" :optionsEnum="AutoLockTime" fadeIn="true" :width="'10vw'"
                    :height="'4vh'" :minHeight="'35px'" :minWidth="'190px'" :disabled="readOnly" />
                <EnumInputField class="settingsView__multipleFilterBehavior" :label="'Multiple Filter Behavior'"
                    :color="color" v-model="appSettings.multipleFilterBehavior.value" :optionsEnum="FilterStatus"
                    fadeIn="true" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :minHeight="'35px'"
                    :disabled="readOnly" />
            </div>
            <div class="settingsView__inputSection">
                <TextInputField class="settingsView__maxLoginRecordsPerDay" :color="color"
                    :label="'Max Login Records Per Day'" v-model="vaultSettings.loginRecordsToStorePerDay.value"
                    :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                    :minHeight="'35px'" :disabled="readOnly"
                    :additionalValidationFunction="enforceLoginRecordsPerDay" />
                <TextInputField class="settingsView__daysToStoreLoginRecords" :color="color"
                    :label="'Days to Store Login Records'" v-model="vaultSettings.numberOfDaysToStoreLoginRecords.value"
                    :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                    :minHeight="'35px'" :disabled="readOnly"
                    :additionalValidationFunction="enforceDaysToStoreLoginRecords" />
            </div>
            <div class="settingsView__inputSection">
                <CheckboxInputField class="settingsView__defaultMarkdown" :color="color" :height="'1.75vh'"
                    :minHeight="'12.5px'" :disabled="readOnly"
                    :label="'Default Additional Information to Markdown on Edit Screens'"
                    v-model="appSettings.defaultMarkdownInEditScreens.value" />
            </div>
            <div class="settingsView__sectionTitle settingsView__securitySettings">Security Settings</div>
            <div class="settingsView__inputSection">
                <TextInputField class="settingsView__randomPasswordLength" :color="color"
                    :label="'Random Password Length'" v-model.number="appSettings.randomValueLength.value"
                    :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                    :minHeight="'35px'" :disabled="readOnly"
                    :additionalValidationFunction="enforceMinRandomPasswordLength" />
                <TextInputField class="settingsView__randomPassphraseLength" :color="color"
                    :label="'Random Passphrase Length'" v-model.number="appSettings.randomPhraseLength.value"
                    :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                    :minHeight="'35px'" :disabled="readOnly"
                    :additionalValidationFunction="enforceMinRandomPassphraseLength" />
            </div>
            <div class="settingsView__inputSection">
                <TextInputField class="settingsView__oldPasswordDays" :color="color" :label="'Old Password Days'"
                    v-model.number="appSettings.oldPasswordDays.value" :inputType="'number'" :width="'10vw'"
                    :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" :disabled="readOnly"
                    :additionalValidationFunction="enforceOldPasswordDays" />
                <TextInputField class="settingsView__percentFilledMetricForPulse" :color="color"
                    :label="'% Filled Metric for Pulse'" v-model.number="appSettings.percentMetricForPulse.value"
                    :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                    :minHeight="'35px'" :disabled="readOnly"
                    :additionalValidationFunction="enforcePercentMetricForPulse" :showToolTip="true"
                    :toolTipSize="'clamp(15px, 1vw, 28px)'"
                    :toolTipMessage="'At what percent of the total value should the metric start pulsing. Ex. 50% would mean 5 / 10 Weak Passwords would start pusling. Does not apply to Breached Passwords.'" />
            </div>
            <div></div>
        </ScrollView>
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import ScrollView from './ScrollView.vue';

import { AutoLockTime } from '../../Types/App';
import { GridDefinition } from '../../Types/Models';
import app, { AppSettings } from "../../Objects/Stores/AppStore";
import { VaultSettings } from "../../Objects/Stores/VaultStore";
import StoreUpdateTransaction from "../../Objects/StoreUpdateTransaction";
import { FilterStatus } from '../../Types/DataTypes';

export default defineComponent({
    name: "ValueView",
    components:
    {
        ObjectView,
        TextInputField,
        CheckboxInputField,
        EnumInputField,
        ScrollView
    },
    props: ['creating', 'currentView'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");

        // copy the objects so that we don't edit the original one. Also needed for change tracking
        const originalAppSettings: Ref<AppSettings> = ref(JSON.vaulticParse(JSON.vaulticStringify(app.settings.value)));
        const appSettings: Ref<AppSettings> = ref(JSON.vaulticParse(JSON.vaulticStringify(app.settings.value)));

        const originalVaultSettings: Ref<VaultSettings> = ref(JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.settings.value)));
        const vaultSettings: Ref<VaultSettings> = ref(JSON.vaulticParse(JSON.vaulticStringify(app.currentVault.settings.value)));

        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const currentView: Ref<number> = ref(props.currentView ? props.currentView : 0);
        const readOnly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);

        const gridDefinition: GridDefinition = {
            rows: 1,
            rowHeight: '100%',
            columns: 1,
            columnWidth: '100%'
        };

        let saveSucceeded: (value: boolean) => void;
        let saveFaield: (value: boolean) => void;

        function onSave()
        {
            app.popups.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFaield = reject;
            });
        }

        async function onAuthenticationSuccessful(masterKey: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Settings");

            const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);
            if (JSON.vaulticStringify(originalAppSettings.value) != JSON.vaulticStringify(appSettings.value))
            {
                const state = app.cloneState();
                state.settings.value = appSettings.value;

                transaction.updateUserStore(app, state);
            }

            if (JSON.vaulticStringify(originalVaultSettings.value) != JSON.vaulticStringify(vaultSettings.value))
            {
                const state = app.currentVault.cloneState();
                state.settings.value = vaultSettings.value;

                transaction.updateVaultStore(app.currentVault, state);
            }

            const succeeded = await transaction.commit(masterKey, app.isOnline);
            app.popups.hideLoadingIndicator();
            saveSucceeded(succeeded);
        }

        function onAuthenticationCanceled()
        {
            saveFaield(false);
        }

        function enforceLoginRecordsPerDay(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb <= 0)
            {
                return [false, "Value must be greater than 0"];
            }

            if (numb > 20)
            {
                return [false, "Value must be less than 20"];
            }

            return [true, ""];
        }

        function enforceDaysToStoreLoginRecords(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb <= 0)
            {
                return [false, "Value must be greater than 0"];
            }

            return [true, ""];
        }

        function enforceMinRandomPasswordLength(input: string): [boolean, string]
        {
            return [Number.parseInt(input) >= 20, "Value must be greater than or equal to 20"];
        }

        function enforceMinRandomPassphraseLength(input: string): [boolean, string]
        {
            return [Number.parseInt(input) >= 4, "Value must be greater than or equal to 4"];
        }

        function enforceOldPasswordDays(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb <= 0)
            {
                return [false, "Value must be greater than 0"];
            }

            return [true, ""];
        }

        function enforcePercentMetricForPulse(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1 || numb > 100)
            {
                return [false, "Value must be between 1 and 100"];
            }

            return [true, ""];
        }

        return {
            readOnly,
            color,
            appSettings,
            vaultSettings,
            refreshKey,
            gridDefinition,
            AutoLockTime,
            FilterStatus,
            currentView,
            onSave,
            onAuthenticationSuccessful,
            enforceLoginRecordsPerDay,
            enforceMinRandomPasswordLength,
            enforceMinRandomPassphraseLength,
            enforceOldPasswordDays,
            enforcePercentMetricForPulse,
            enforceDaysToStoreLoginRecords
        };
    },
})
</script>

<style>
.settingsView__container {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    /* account for -6% margin */
    height: 106%;
    width: 80%;
    display: flex;
    flex-direction: column;
    row-gap: clamp(20px, 2vw, 50px);
    align-items: center;
    margin-top: -6%;
    margin-bottom: 10px;
}

.settingsView__sectionTitle {
    color: white;
    text-align: left;
    font-size: clamp(17px, 1vw, 25px);
}

.settingsView__inputSection {
    direction: ltr;
    display: flex;
    column-gap: 50px;
}

.settingsView__appSettings {
    z-index: 8;
}

.settingsView__autoLockTime {
    z-index: 8;
}

.settingsView__multipleFilterBehavior {
    z-index: 8;
}
</style>
