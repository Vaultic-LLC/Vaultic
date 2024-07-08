<template>
    <div class="workflowPopupContainer">
        <Transition name="fade" mode="out-in">
            <ScrollView class="workflowPopupContainer__sections" :color="primaryColor">
                <div class="workflowPopupContainer__section">
                    <h2 class="workflowPopupContainer__section__header">Import</h2>
                    <div class="workflowPopupContainer__section__text">
                        Import Passwords or Values via an unencrypted CSV file
                    </div>
                    <div class="workflowPopupContainer__section__buttons">
                        <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Passwords'" :width="'8vw'"
                            :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'"
                            @onClick="doImportPasswords" />
                        <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Values'" :width="'8vw'"
                            :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'"
                            @onClick="doImportValues" />
                    </div>
                </div>
                <div class="workflowPopupContainer__section">
                    <h2 class="workflowPopupContainer__section__header">Export</h2>
                    <div class="workflowPopupContainer__section__text">
                        Export unencrypted Passwords or Values into a CSV file
                    </div>
                    <div class="workflowPopupContainer__section__buttons">
                        <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Passwords'" :width="'8vw'"
                            :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'"
                            @onClick="exportPasswords" />
                        <PopupButton :color="primaryColor" :disabled="disableButtons" :text="'Values'" :width="'8vw'"
                            :minWidth="'75px'" :maxWidth="'150px'" :height="'3vh'" :minHeight="'30px'"
                            :maxHeight="'45px'" :fontSize="'1vw'" :minFontSize="'13px'" :maxFontSize="'20px'"
                            @onClick="exportValues" />
                    </div>
                </div>
            </ScrollView>
        </Transition>
    </div>
</template>
<script lang="ts">
import { Ref, computed, defineComponent, ref } from 'vue';

import TableSelector from '../TableSelector.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from "../ObjectViews/ScrollView.vue"

import { defaultInputTextColor } from '../../Types/Colors';
import { stores } from '../../Objects/Stores';
import { importPasswords, importValues, getExportableValues, getExportablePasswords } from "../../Helpers/ImportExportHelper";
import { api } from "../../API";

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
        const primaryColor: Ref<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);

        const disableButtons: Ref<boolean> = ref(false);

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
            const formattedData = await getExportablePasswords(primaryColor.value);
            if (!formattedData)
            {
                return;
            }

            // do this here so we can unit test exporting easier
            await api.helpers.vaultic.writeCSV(formattedData);
        }

        async function exportValues()
        {
            const formattedData = await getExportableValues(primaryColor.value);
            if (!formattedData)
            {
                return;
            }

            // do this here so we can unit test exporting easier
            await api.helpers.vaultic.writeCSV(formattedData);
        }

        return {
            scrollbarColor,
            primaryColor,
            disableButtons,
            defaultInputTextColor,
            doImportPasswords,
            doImportValues,
            exportPasswords,
            exportValues
        }
    }
})
</script>

<style>
.workflowPopupContainer {
    position: absolute;
    top: 10%;
    width: 100%;
    height: 95%;
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
    margin-bottom: 50px;
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
