<template>
    <div class="importSelectionPopup">
        <ObjectPopup :closePopup="onClose" :width="'50%'" :minWidth="'600px'" :minHeight="'480px'">
            <ObjectView :color="color" :creating="false" :defaultSave="onConfirm" :gridDefinition="gridDefinition"
                :buttonText="'Confirm'" :skipOnSaveFunctionality="true" :anchorButtonsDown="true">
                <div class="importSelectionPopup__content">
                    <h2 class="importSelectionPopup__header">Select which columns map to each property</h2>
                    <ScrollView class="importSelectionPopup__sections" :color="color">
                        <div class="importSelectionPopup__pickers">
                            <div v-for="(mapper, idx) in csvHeaderPropertyMappers" :key="idx"
                                class="importSelectionPopup__headerPropertyPicker">
                                <TextInputField :disabled="true" :color="color" :label="'Property'"
                                    v-model="mapper.property.displayName" :width="'8vw'" :maxWidth="'330px'"
                                    :minWidth="'100px'" :height="'4vh'" :minHeight="'35px'" />
                                <EnumInputField :label="'CSV Header'" :color="color" v-model="mapper.csvHeader"
                                    :optionsEnum="mockHeadersEnum" :width="'8vw'" :height="'4vh'" :minHeight="'35px'"
                                    :minWidth="'100px'" :maxHeight="'50px'" :fadeIn="true"
                                    :required="mapper.property.required" />
                                <TextInputField v-if="mapper.property.requiresDelimiter" :color="color"
                                    :label="'Delimiter'" v-model="mapper.property.delimiter" :width="'4vw'"
                                    :maxWidth="'100px'" :minWidth="'80px'" :height="'4vh'" :minHeight="'35px'" />
                            </div>
                        </div>
                    </ScrollView>
                </div>
            </ObjectView>
        </ObjectPopup>
    </div>
</template>
<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import TableSelector from '../TableSelector.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from "../ObjectViews/ScrollView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import ObjectPopup from "../ObjectPopups/ObjectPopup.vue";
import ObjectView from "../ObjectViews/ObjectView.vue";

import app from "../../Objects/Stores/AppStore";
import { CSVHeaderPropertyMapperModel, GridDefinition } from "../../Types/Models";
import { defaultInputTextColor } from '../../Types/Colors';
import { buildCSVPropertyMappers } from "../../Helpers/ImportExportHelper";
import { popups } from "../../Objects/Stores/PopupStore";
import { ImportableDisplayField } from '../../Types/Fields';

export default defineComponent({
    name: "WorkflowPopup",
    components:
    {
        TableSelector,
        TextInputField,
        PopupButton,
        ScrollView,
        EnumInputField,
        ObjectPopup,
        ObjectView
    },
    props: ['color', 'csvHeaders', 'properties'],
    emits: ['onConfirm', 'onClose'],
    setup(props, ctx)
    {
        const popupInfo = popups.importSelection;

        const gridDefinition: GridDefinition = {
            rows: 1,
            rowHeight: '100%',
            columns: 1,
            columnWidth: '100%'
        };

        const mockHeadersEnum = computed(() => Object.assign({}, props.csvHeaders));
        const properties: ComputedRef<ImportableDisplayField[]> = computed(() => props.properties);
        const csvHeaderPropertyMappers: ComputedRef<CSVHeaderPropertyMapperModel[]> = computed(() => properties.value.map(p => 
        {
            return {
                property: p,
                csvHeader: undefined
            }
        }));

        function onConfirm()
        {
            return app.popups.showRequestAuthentication(props.color, buildAndEmit, () => { });
        }

        function buildAndEmit(masterKey: string)
        {
            const csvHeadersToPropertiesDict = buildCSVPropertyMappers(csvHeaderPropertyMappers.value);
            ctx.emit('onConfirm', masterKey, csvHeadersToPropertiesDict);

            onClose();
        }

        function onClose()
        {
            ctx.emit('onClose');
        }

        return {
            mockHeadersEnum,
            csvHeaderPropertyMappers,
            defaultInputTextColor,
            zIndex: popupInfo.zIndex,
            gridDefinition,
            onClose,
            onConfirm
        }
    }
})
</script>

<style>
.importSelectionPopup {
    position: fixed;
    z-index: v-bind(zIndex);
    width: 100%;
    height: 100%;
}

.importSelectionPopup__sections {
    position: relative;
    color: v-bind(defaultInputTextColor);
    margin-left: auto;
    margin-right: auto;
    margin-top: 0;
    width: 90%;
    height: 80%;
    padding: 5px;
    display: flex;
    flex-direction: column;
}

.importSelectionPopup__content {
    direction: ltr;
    height: 100%;
    color: white;
}

.importSelectionPopup__header {
    margin-bottom: 2vw;
    font-size: clamp(15px, 1vw, 25px);
}

.importSelectionPopup__pickers {
    height: 100%;
    direction: ltr;
    display: flex;
    flex-direction: column;
    align-items: baseline;
    margin: auto;
    margin-top: 10px;

    /* move over half the lenght of the delmiter input 
    field so everything appears centered */
    transform: translateX(2vw);
}

.importSelectionPopup__headerPropertyPicker {
    display: flex;
    justify-content: center;
    column-gap: 20px;
    margin-bottom: 20px;
}
</style>
