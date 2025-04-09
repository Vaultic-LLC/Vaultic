<template>
    <ObjectView ref="objectView" :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey" :hideButtons="readOnly">
        <VaulticAccordion :value="'0'">
            <VaulticAccordionPanel :value="'0'">
                <VaulticAccordionHeader :title="'App'" />
                <VaulticAccordionContent>
                    <div class="settingsView__inputSection">
                        <EnumInputField class="settingsView__autoLockTime" :label="'Auto Lock Time'" :color="color"
                            v-model="reactiveAppSettings.a" :optionsEnum="AutoLockTime" fadeIn="true" :width="'10vw'"
                            :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" :minWidth="'190px'" :disabled="readOnly" />
                        <EnumInputField class="settingsView__multipleFilterBehavior" :label="'Multiple Filter Behavior'"
                            :color="color" v-model="reactiveAppSettings.f" :optionsEnum="FilterStatus"
                            fadeIn="true" :width="'10vw'" :maxWidth="'300px'" :minWidth="'190px'" :height="'4vh'" :minHeight="'35px'"
                            :disabled="readOnly" />
                    </div>                    
                    <div class="settingsView__inputSection">
                        <TextInputField class="settingsView__oldPasswordDays" :color="color" :label="'Old Password Days'"
                            v-model.number="reactiveAppSettings.o" :inputType="'number'" :width="'10vw'"
                            :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" :disabled="readOnly"
                            :additionalValidationFunction="enforceOldPasswordDays" />
                        <TextInputField class="settingsView__percentFilledMetricForPulse" :color="color"
                            :label="'% Filled Metric for Pulse'" v-model.number="reactiveAppSettings.p"
                            :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                            :minHeight="'35px'" :disabled="readOnly"
                            :additionalValidationFunction="enforcePercentMetricForPulse" :showToolTip="true"
                            :toolTipSize="'clamp(15px, 1vw, 28px)'"
                            :toolTipMessage="'At what percent of the total value should the metric start pulsing. Ex. 50% would mean 5 / 10 Weak Passwords would start pusling. Does not apply to Breached Passwords.'" />
                    </div>
                    <div class="settingsView__inputSection">
                        <TextInputField :color="color"
                            :label="'Random Password Length'" v-model.number="reactiveAppSettings.v"
                            :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                            :minHeight="'35px'" :disabled="readOnly"
                            :additionalValidationFunction="enforceMinRandomPasswordLength" />
                        <TextInputField class="settingsView__randomPassphraseLength" :color="color"
                            :label="'Random Passphrase Length'" v-model.number="reactiveAppSettings.r"
                            :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                            :minHeight="'35px'" :disabled="readOnly"
                            :additionalValidationFunction="enforceMinRandomPassphraseLength" />
                    </div>
                    <div class="settingsView__inputSection">
                        <TextInputField :color="color" :label="'Passphrase Seperator'" v-model.number="reactiveAppSettings.e"
                            :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'" :minHeight="'35px'" :disabled="readOnly" />
                        <TextInputField :color="color" :label="'Seconds After Copy to Clear'" v-model.number="reactiveAppSettings.y"
                            :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'" :minHeight="'35px'" :disabled="readOnly"
                            :additionalValidationFunction="enforceSecondsAfterCopy" />
                    </div>
                    <div class="settingsView__inputSection">
                        <CheckboxInputField :color="color" :height="'1.75vh'" :minHeight="'12.5px'" :disabled="readOnly"
                            :label="'Require Master Key to View or Update Sensitive Information'" v-model="reactiveAppSettings.q" />
                        <ToolTip :color="color" :size="'clamp(15px, 0.8vw, 20px)'" :fadeIn="false"
                            :message="'If checked, will prompt you to enter your Master Key when updating your settings, adding, updating, or deleting Passwords, Values, Vaults, Devices or Organizations, and unlocking fields on edit popups. This is to prevent tampering with your sensitive data if you happent to forget to lock your vault.'" />
                    </div>
                    <div class="settingsView__inputSection">
                        <CheckboxInputField :color="color" :height="'1.75vh'" :minHeight="'12.5px'" :disabled="readOnly"
                            :label="'Include Ambiguous Characters in Random Password'" v-model="reactiveAppSettings.m" />
                    </div>
                    <div class="settingsView__inputSection">
                        <CheckboxInputField :color="color" :height="'1.75vh'" :minHeight="'12.5px'" :disabled="readOnly"
                                :label="'Include Numbers in Random Passwords'" v-model="reactiveAppSettings.n" />
                    </div>
                    <div class="settingsView__inputSection">
                        <CheckboxInputField :color="color" :height="'1.75vh'" :minHeight="'12.5px'" :disabled="readOnly"
                                :label="'Include Special Characters in Random Password'" v-model="reactiveAppSettings.s" />
                    </div>               
                </VaulticAccordionContent>
            </VaulticAccordionPanel>
            <VaulticAccordionPanel v-if="isOnline" :value="'1'">
                <VaulticAccordionHeader :title="'Account'" />
                <VaulticAccordionContent>
                    <div class="settingsView__inputSection">
                        <EnumInputField class="settingsView__multipleFilterBehavior" :label="'Require MFA On'"
                            :color="color" v-model="requireMFAOn" :optionsEnum="DisplayRequireMFAOn" :hideClear="true"
                            fadeIn="true" :width="'10vw'" :maxWidth="'300px'" :minWidth="'190px'" :height="'4vh'" :minHeight="'35px'"
                            :disabled="readOnly || !isOnline || isLoadingSharedData" />
                        <TextInputField :color="color" :label="'Argon2 Iterations'"
                            v-model.number="ksfParams.iterations" :inputType="'number'" :width="'10vw'"
                            :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" 
                            :additionalValidationFunction="enforceArgonIterations" />
                    </div>
                    <div class="settingsView__inputSection">
                        <TextInputField :color="color" :label="'Argon2 Memory'"
                            v-model.number="ksfParams.memory" :inputType="'number'" :width="'10vw'"
                            :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" 
                            :additionalValidationFunction="enforceArgonMemory" />
                        <TextInputField :color="color" :label="'Argon2 Parallelism'"
                            v-model.number="ksfParams.parallelism" :inputType="'number'" :width="'10vw'"
                            :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" 
                            :additionalValidationFunction="enforceArgonParallelism" />
                    </div>
                </VaulticAccordionContent>
            </VaulticAccordionPanel>
            <VaulticAccordionPanel :value="'2'" :final="true">
                <VaulticAccordionHeader :title="'Sharing'" />
                <VaulticAccordionContent>
                    <div v-if="isOnline" class="settingsView__inputSection">
                        <CheckboxInputField :color="color" :height="'1.75vh'" :minHeight="'12.5px'" :disabled="readOnly || isLoadingSharedData || failedToLoadSharedData"
                            :label="'Allow Shared Vaults From Others'" v-model="allowSharedVaultsFromOthers" />
                    </div>
                    <div v-if="isOnline && allowSharedVaultsFromOthers" class="settingsView__inputSection">
                        <TextInputField ref="usernameField" class="settingsView__maxLoginRecordsPerDay" :color="color"
                            :label="'Username'" v-model="username"
                            :inputType="'number'" :width="'10vw'" :minWidth="'190px'" :height="'4vh'" :maxWidth="'300px'"
                            :minHeight="'35px'" :disabled="readOnly || !allowSharedVaultsFromOthers || isLoadingSharedData || failedToLoadSharedData" />
                        <EnumInputField class="settingsView__autoLockTime" :label="'Allow Sharing From'" :color="color"
                            v-model="allowSharingFrom" :optionsEnum="AllowSharingFrom" fadeIn="true" :width="'10vw'" :maxWidth="'300px'"
                            :height="'4vh'" :minHeight="'35px'" :minWidth="'190px'" :hideClear="true" 
                            :disabled="readOnly || isLoadingSharedData || failedToLoadSharedData" />
                    </div>
                    <div v-if="isOnline && allowSharedVaultsFromOthers && allowSharingFrom == AllowSharingFrom.SpecificUsers" 
                        class="settingsView__inputSection settingsView__memberContainer">
                        <MemberTable ref="memberTable" :id="'settingsView__memberTable'" :color="color" :emptyMessage="emptyMessage" 
                            :currentMembers="currentAllowUsersToShare" :hidePermissions="true" :tabOverride="'Users'" 
                            :externalLoading="isLoadingSharedData" :hideEdit="true" :disable="readOnly || isLoadingSharedData || failedToLoadSharedData" />
                    </div>
                </VaulticAccordionContent>
            </VaulticAccordionPanel>
        </VaulticAccordion>
    </ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, ref, onMounted, Ref, watch, reactive, Reactive, toRefs } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import MemberTable from '../Table/MemberTable.vue';
import VaulticAccordion from '../Accordion/VaulticAccordion.vue';
import VaulticAccordionPanel from '../Accordion/VaulticAccordionPanel.vue';
import VaulticAccordionHeader from '../Accordion/VaulticAccordionHeader.vue';
import VaulticAccordionContent from '../Accordion/VaulticAccordionContent.vue';
import ToolTip from '../ToolTip.vue';

import app, { AppSettings } from "../../Objects/Stores/AppStore";
import StoreUpdateTransaction from "../../Objects/StoreUpdateTransaction";
import { AllowSharingFrom, ServerAllowSharingFrom, ServerPermissions } from '@vaultic/shared/Types/ClientServerTypes';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { InputComponent, MemberChanges, MemberTableComponent, ObjectViewComponent } from '../../Types/Components';
import { Member } from '@vaultic/shared/Types/DataTypes';
import { DisplayRequireMFAOn, displayRequireMFAOnToRequireMFAOn, RequireMFAOn, reuireMFAOnToDisplay } from '@vaultic/shared/Types/Device';
import { AutoLockTime, FilterStatus } from '@vaultic/shared/Types/Stores';
import { KSFParams } from '@vaultic/shared/Types/Keys';

export default defineComponent({
    name: "SettingsView",
    components:
    {
        ObjectView,
        TextInputField,
        CheckboxInputField,
        EnumInputField,
        MemberTable,
        VaulticAccordion,
        VaulticAccordionPanel,
        VaulticAccordionHeader,
        VaulticAccordionContent,
        ToolTip
    },
    props: ['creating', 'currentView'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);

        const memberTable: Ref<MemberTableComponent | null> = ref(null);
        const usernameField: Ref<InputComponent | null> = ref(null);
        const objectView: Ref<ObjectViewComponent | null> = ref(null);

        const appStoreState = app.getPendingState()!;
        // copy the objects so that we don't edit the original one. Also needed for change tracking
        const originalAppSettings: Ref<AppSettings> = ref(JSON.parse(JSON.stringify(app.settings)));
        const reactiveAppSettings = appStoreState.createCustomRef("settings", originalAppSettings.value);

        // const originalVaultSettings: Ref<VaultSettings> = ref(JSON.parse(JSON.stringify(app.currentVault.settings.value)));
        // const vaultSettings: Ref<VaultSettings> = ref(JSON.parse(JSON.stringify(app.currentVault.settings.value)));

        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const currentView: Ref<number> = ref(props.currentView ? props.currentView : 0);
        const readOnly: Ref<boolean> = ref(app.currentVault.isReadOnly.value);

        const originalAllowSharedVaultsFromOthers: Ref<boolean> = ref(false);
        const originalUsername: Ref<string> = ref('');
        const originalAllowSharingFrom: Ref<AllowSharingFrom> = ref(AllowSharingFrom.Everyone);
        
        const isLoadingSharedData: Ref<boolean> = ref(false);
        const failedToLoadSharedData: Ref<boolean> = ref(false);
        const allowSharedVaultsFromOthers: Ref<boolean> = ref(false);
        const username: Ref<string> = ref('');
        const allowSharingFrom: Ref<AllowSharingFrom> = ref(AllowSharingFrom.Everyone);
        const currentAllowUsersToShare: Ref<Map<number, Member>> = ref(new Map());
        const emptyMessage: Ref<string> = ref(`You haven't allowed anyone to share their Vaults with you. Click '+' to allow someone to share their data with you.`);

        const originalRequireMFAOnSetting: Ref<DisplayRequireMFAOn> = ref(DisplayRequireMFAOn.NoDevices);
        const requireMFAOn: Ref<DisplayRequireMFAOn> = ref(DisplayRequireMFAOn.NoDevices);

        const ksfParams: Ref<KSFParams> = ref(JSON.parse(app.userInfo!.ksfParams!)); 

        let saveSucceeded: (value: boolean) => void;
        let saveFaield: (value: boolean) => void;

        function onSave()
        {
            app.popups.showRequestAuthentication(color.value, onAuthenticationSuccessful, onAuthenticationCanceled, true);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFaield = reject;
            });
        }

        async function onAuthenticationSuccessful(masterKey: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Settings");

            app.runAsAsyncProcess(async() =>
            {
                //check / save shared settinsg first in case username is already taken
                if (!await checkUpdateSettings())
                {
                    app.popups.hideLoadingIndicator();
                    saveFaield(true);

                    return false;
                }
    
                if (!await checkUpdateKSF())
                {
                    app.popups.hideLoadingIndicator();
                    saveFaield(true);

                    return false;
                }
    
                const transaction = new StoreUpdateTransaction(app.currentVault.userVaultID);
                if (JSON.stringify(originalAppSettings.value) != JSON.stringify(reactiveAppSettings))
                {
                    appStoreState.commitProxyObject('settings', reactiveAppSettings);
                    transaction.updateUserStore(app, appStoreState);
    
                    if (!(await transaction.commit(masterKey)))
                    {
                        app.popups.hideLoadingIndicator();
                        saveFaield(true);

                        return false;
                    }
                }
    
                // if (JSON.stringify(originalVaultSettings.value) != JSON.stringify(vaultSettings.value))
                // {
                //     const state = app.currentVault.cloneState();
                //     state.settings.value = vaultSettings.value;
    
                //     transaction.updateVaultStore(app.currentVault, state);
                // }
    
                app.popups.hideLoadingIndicator();
                saveSucceeded(true);
            });        
        }

        async function checkUpdateSettings(): Promise<boolean>
        {
            if (!isOnline.value)
            {
                return true;
            }

            let updateSettings: boolean = false;

            let updatedAllowSharedVaultsFromOthers: boolean | undefined = undefined;
            let updatedUsername: string | undefined = undefined;
            let updatedAllowSharingFrom: ServerAllowSharingFrom | undefined = undefined;
            let updatedRequireMFAOn: RequireMFAOn | undefined = undefined;

            if (originalAllowSharedVaultsFromOthers.value != allowSharedVaultsFromOthers.value)
            {
                updatedAllowSharedVaultsFromOthers = allowSharedVaultsFromOthers.value
                updateSettings = true;
            } 
            
            if (originalUsername.value != username.value)
            {
                updatedUsername = username.value
                updateSettings = true;
            }

            if (originalAllowSharingFrom.value != allowSharingFrom.value)
            {
                switch (allowSharingFrom.value)
                {
                    case AllowSharingFrom.Everyone:
                        updatedAllowSharingFrom = ServerAllowSharingFrom.Everyone;
                        break;
                    case AllowSharingFrom.SpecificUsers:
                        updatedAllowSharingFrom = ServerAllowSharingFrom.SpecificUsers;
                        break;
                }

                updateSettings = true;
            }

            if (originalRequireMFAOnSetting.value != requireMFAOn.value)
            {
                updatedRequireMFAOn = displayRequireMFAOnToRequireMFAOn(requireMFAOn.value);
                updateSettings = true;
            }

            const sharedIndividualsChanges: MemberChanges | undefined = memberTable.value?.getChanges()!;
            if (sharedIndividualsChanges?.addedMembers.size > 0 || sharedIndividualsChanges?.removedMembers.size > 0)
            {
                updateSettings = true;
            }

            if (updateSettings)
            {
                const response = await api.server.user.updateSettings(updatedUsername, updatedAllowSharedVaultsFromOthers, updatedAllowSharingFrom, 
                sharedIndividualsChanges?.addedMembers.map((k, v) => k), sharedIndividualsChanges?.removedMembers.map((k, v) => k), updatedRequireMFAOn);

                if (!response.Success)
                {
                    if (response.UsernameIsTaken)
                    {
                        usernameField.value?.invalidate("Username is already taken. Please choose a different one");
                        return false;
                    }

                    defaultHandleFailedResponse(response);
                    return false;
                }
            }

            return true;
        } 

        async function checkUpdateKSF(): Promise<boolean>
        {
            const originalParams: KSFParams = JSON.parse(app.userInfo!.ksfParams!);
            if (ksfParams.value.iterations != originalParams.iterations || 
                ksfParams.value.memory != originalParams.memory || 
                ksfParams.value.parallelism != originalParams.parallelism)
            {
                const response = await api.helpers.server.updateKSFParams(JSON.stringify(ksfParams.value));
                if (!response.success)
                {
                    defaultHandleFailedResponse(response);
                    return false;
                }

                app.userInfo!.ksfParams = JSON.stringify(ksfParams.value);
            }

            return true;
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

        function enforceArgonIterations(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1 || numb > 4294967295)
            {
                return [false, "Value must be between 1 and 4,294,967,295"];
            }

            return [true, ""];        
        }

        function enforceArgonMemory(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1024 || numb > 2097151)
            {
                return [false, "Value must be between 1024 and 2,097,151"];
            }

            return [true, ""];        
        }

        function enforceArgonParallelism(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1 || numb > 16777215)
            {
                return [false, "Value must be between 1 and 16,777,215"];
            }

            return [true, ""];        
        }

        function enforceSecondsAfterCopy(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 0)
            {
                return [false, "Value must be greater than 0"];
            }

            return [true, ""];    
        }

        watch(() => allowSharedVaultsFromOthers.value, (newValue, oldValue) =>
        {
            if (isLoadingSharedData.value)
            {
                return;
            }

            if (newValue === false && oldValue === true)
            {
                objectView.value?.addWarning("Disabling 'Allow Shared Vaults From Others' will remove all Vaults that are currently shared with you");          
            }
        });

        watch(() => allowSharingFrom.value, (newValue, oldValue) =>
        {
            if (isLoadingSharedData.value)
            {
                return;
            }

            if (newValue != originalAllowSharingFrom.value && newValue == AllowSharingFrom.SpecificUsers)
            {
                objectView.value?.addWarning("Changing 'Allow Sharing From' to 'Specific Users' will remove all Vaults that are currently shared with you that aren't from Users you've selected");          
            }
        });

        onMounted(async () => 
        {
            if (isOnline.value)
            {
                isLoadingSharedData.value = true;
                const response = await api.server.user.getSettings();
                if (!response.Success)
                {
                    isLoadingSharedData.value = false;
                    failedToLoadSharedData.value = true;
                    defaultHandleFailedResponse(response, true, "Unable to retrieve Sharing Settings", "We are unable to retrieve your sharing settings at the moment. Please try again later. If the issue persists");
                    return;
                }

                originalAllowSharedVaultsFromOthers.value = response.AllowSharedVaultsFromOthers!
                originalUsername.value = response.Username!;

                allowSharedVaultsFromOthers.value = response.AllowSharedVaultsFromOthers!
                username.value = response.Username!;

                if (response.AllowSharingFrom != undefined && response.AllowSharingFrom != null)
                {
                    if (response.AllowSharingFrom == ServerAllowSharingFrom.Everyone)
                    {
                        originalAllowSharingFrom.value = AllowSharingFrom.Everyone;
                        allowSharingFrom.value = AllowSharingFrom.Everyone;       
                    }
                    else
                    {
                        originalAllowSharingFrom.value = AllowSharingFrom.SpecificUsers;
                        allowSharingFrom.value = AllowSharingFrom.SpecificUsers;
                    }
                }

                if (response.AllowSharingFromUsers && response.AllowSharingFromUsers.length > 0)
                {
                    for (let i = 0; i < response.AllowSharingFromUsers.length; i++)
                    {
                        const member: Member = 
                        {
                            userID: response.AllowSharingFromUsers[i].UserID,
                            username: response.AllowSharingFromUsers[i].Username,
                            firstName: response.AllowSharingFromUsers[i].FirstName,
                            lastName: response.AllowSharingFromUsers[i].LastName,
                            permission: ServerPermissions.View,
                            icon: undefined,
                            publicEncryptingKey: undefined
                        };

                        currentAllowUsersToShare.value.set(member.userID, member);
                    }
                }

                if (response.RequireMFAOn != undefined && response.RequireMFAOn != null)
                {
                    originalRequireMFAOnSetting.value = reuireMFAOnToDisplay(response.RequireMFAOn!);
                    requireMFAOn.value = originalRequireMFAOnSetting.value;
                }
            }

            isLoadingSharedData.value = false;
        });

        return {
            isOnline,
            readOnly,
            color,
            objectView,
            usernameField,
            memberTable,
            refreshKey,
            AutoLockTime,
            FilterStatus,
            currentView,
            allowSharedVaultsFromOthers,
            username,
            allowSharingFrom,
            AllowSharingFrom,
            failedToLoadSharedData,
            isLoadingSharedData,
            emptyMessage,
            currentAllowUsersToShare,
            requireMFAOn,
            DisplayRequireMFAOn,
            reactiveAppSettings,
            ksfParams,
            onSave,
            onAuthenticationSuccessful,
            enforceLoginRecordsPerDay,
            enforceMinRandomPasswordLength,
            enforceMinRandomPassphraseLength,
            enforceOldPasswordDays,
            enforcePercentMetricForPulse,
            enforceDaysToStoreLoginRecords,
            enforceArgonIterations,
            enforceArgonMemory,
            enforceArgonParallelism,
            enforceSecondsAfterCopy
        };
    },
})
</script>

<style scoped>
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
    column-gap: clamp(30px, 2vw, 50px);
    justify-content: center;
    margin: clamp(10px, 1vw, 20px);
    row-gap: clamp(10px, 1vw, 20px);
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

.settingsView__memberContainer {
    width: 100%;
    display: flex;
    justify-content: center;
    position: relative;
    height: 35vh;
}

:deep(#settingsView__memberTable) {
    min-height: 40vh;
    height: 100%;
}

.settingsView__checkboxGroup {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    row-gap: 10px
}

:deep(.settingsView__accordion) {
    width: 80%;
}

:deep(.settingsView__accordionHeader) {
    background: var(--app-color) !important;
    border: 1px solid #4d4b4b !important;
    padding: clamp(9px, 0.8vw, 18px) !important;
    font-size: clamp(8px, 0.9vw, 16px) !important;
}

:deep(.settingsView__accordianContentContent) {
    background: var(--app-color)!important;
    padding: 10px !important;
}

:deep(.settingsView__accordionPanel) {
    border: none !important;
}
</style>
