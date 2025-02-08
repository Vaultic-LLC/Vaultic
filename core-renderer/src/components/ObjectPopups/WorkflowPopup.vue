<template>
    <div class="workflowPopupHeader">
        <h2>Workflows</h2>
    </div>
    <div class="workflowPopupContainer">
        <ScrollView class="workflowPopupContainer__sections" :color="primaryColor">
            <div class="workflowPopupContainer__section">
                <h2 class="workflowPopupContainer__section__header">Import</h2>
                <div class="workflowPopupContainer__section__text">
                    Import Passwords or Values via an unencrypted CSV file
                </div>
                <div class="workflowPopupContainer__section__buttons">
                    <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Passwords'" :width="'8vw'"
                        :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="doImportPasswords" />
                    <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Values'" :width="'8vw'"
                        :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="doImportValues" />
                </div>
            </div>
            <div class="workflowPopupContainer__section">
                <h2 class="workflowPopupContainer__section__header">Export</h2>
                <div class="workflowPopupContainer__section__text">
                    Export unencrypted Passwords or Values into a CSV file
                </div>
                <div class="workflowPopupContainer__section__buttons">
                    <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Passwords'" :width="'8vw'"
                        :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="exportPasswords" />
                    <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Values'" :width="'8vw'"
                        :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="exportValues" />
                </div>
            </div>
            <div class="workflowPopupContainer__section">
                <h2 class="workflowPopupContainer__section__header">Export Logs</h2>
                <div class="workflowPopupContainer__section__buttons">
                    <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Export'" :width="'8vw'"
                        :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'" :maxHeight="'45px'"
                        :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="doExportLogs" />
                </div>
            </div>
        </ScrollView>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TableSelector from '../TableSelector.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from "../ObjectViews/ScrollView.vue"

import { defaultInputTextColor } from '../../Types/Colors';
import app from "../../Objects/Stores/AppStore";
import { importPasswords, importValues, getExportableValues, getExportablePasswords, exportLogs } from "../../Helpers/ImportExportHelper";
import { api } from "../../API";
import { SingleSelectorItemModel } from '../../Types/Models';

export default defineComponent({
    name: "WorkflowPopup",
    components:
    {
        TableSelector,
        TextAreaInputField,
        PopupButton,
        ScrollView,
    },
    setup()
    {
        const scrollbarColor: Ref<string> = ref('#0f111d');
        const primaryColor: Ref<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const disableButtons: Ref<boolean> = ref(app.currentVault.isReadOnly.value);

        const worflowsSelectorItem: ComputedRef<SingleSelectorItemModel> = computed(() =>
        {
            return {
                title: ref("Workflows"),
                color: ref(app.userPreferences.currentPrimaryColor.value),
                isActive: computed(() => true),
                onClick: () => { }
            }
        });

        async function doImportPasswords()
        {
            await importPasswords(primaryColor.value);
        }

        async function doImportValues()
        {
            await importValues(primaryColor.value);
        }

        async function exportPasswords()
        {
            app.popups.showRequestAuthentication(primaryColor.value, doExportPasswords, () => { })

            async function doExportPasswords(masterKey: string)
            {
                const formattedData = await getExportablePasswords(primaryColor.value, masterKey);
                if (!formattedData)
                {
                    return;
                }

                await doExport("Vaultic-Passwords", formattedData);
            }
        }

        async function exportValues()
        {
            app.popups.showRequestAuthentication(primaryColor.value, doExportValues, () => { })

            async function doExportValues(masterKey: string)
            {
                const formattedData = await getExportableValues(primaryColor.value, masterKey);
                if (!formattedData)
                {
                    return;
                }

                await doExport("Vaultic-Values", formattedData);
            }
        }

        async function doExport(fileName: string, formattedData: string)
        {
            // do this here so we can unit test exporting easier
            const success = await api.helpers.vaultic.writeCSV(fileName, formattedData);
            if (success)
            {
                app.popups.showToast(primaryColor.value, "Export Succeeded", true);
            }
            else 
            {
                app.popups.showToast(primaryColor.value, "Export Failed", false);
            }

            app.popups.hideLoadingIndicator();
        }

        async function doExportLogs()
        {
            await exportLogs(primaryColor.value);
        }

        return {
            scrollbarColor,
            primaryColor,
            disableButtons,
            defaultInputTextColor,
            worflowsSelectorItem,
            doImportPasswords,
            doImportValues,
            exportPasswords,
            exportValues,
            doExportLogs
        }
    }
})
</script>

<style>
.workflowPopupHeader {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.workflowPopupContainer {
    width: 100%;
    height: 86%;
    margin-top: 2%;
}

.workflowPopupContainer__sections {
    position: relative;
    color: v-bind(defaultInputTextColor);
    margin-left: auto;
    margin-right: auto;
    margin-top: 0;
    width: 90%;
    height: 90%;
    padding: 5px;
}

.workflowPopupContainer__section {
    direction: ltr;
    margin-bottom: clamp(10px, 5vh, 50px);
}

.workflowPopupContainer__section__header {
    font-size: clamp(15px, 1vw, 25px);
    margin-bottom: 20px;
}

.workflowPopupContainer__section__text {
    font-size: clamp(10px, 0.8vw, 15px)
}

.workflowPopupContainer__section__buttons {
    display: flex;
    justify-content: center;
    column-gap: 20px;
    margin-top: 20px;
}
</style>
