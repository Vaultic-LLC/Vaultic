<template>
    <div class="importSelectionPopup">
        <Transition name="fade" mode="out-in">
            <ScrollView class="importSelectionPopup__sections" :color="color">
                <div>
                    <h2>Select which columns map to which properties</h2>
                    <div v-for="(mapper, idx) in csvHeaderPropertyMappers" :key="idx"
                        class="importSelectionPopup__headerPropertyPicker">
                        <TextInputField :id="'importSelectionPopup__property' + idx" :color="color" :label="'Property'"
                            v-model="mapper.property" :width="'8vw'" :maxWidth="'330px'" :minWidth="'100px'"
                            :height="'4vh'" :minHeight="'35px'" :isEmailField="true" />
                        <EnumInputField :id="'importSelectionPopup__csvHeader' + idx" :label="'CSV Header'"
                            :color="color" v-model="mapper.csvHeader" :optionsEnum="mockHeadersEnum" :width="'8vw'"
                            :height="'4vh'" :minHeight="'35px'" :minWidth="'100px'" :maxHeight="'50px'" />
                    </div>
                </div>
            </ScrollView>
        </Transition>
    </div>
</template>
<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import TableSelector from '../TableSelector.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ScrollView from "../ObjectViews/ScrollView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';

import { stores } from '../../Objects/Stores';
import { CSVHeaderPropertyMapperModel } from "../../Types/Models";
import { defaultInputTextColor } from '../../Types/Colors';
import { buildCSVPropertyMappers } from "../../Helpers/ImportExportHelper";

export default defineComponent({
    name: "WorkflowPopup",
    components:
    {
        TableSelector,
        TextInputField,
        PopupButton,
        ScrollView,
        EnumInputField
    },
    props: ['color', 'csvHeaders', 'properties'],
    emits: ['onConfirm'],
    setup(props, ctx)
    {
        const mockHeadersEnum = computed(() => Object.assign({}, props.csvHeaders));
        const csvHeaderPropertyMappers: ComputedRef<CSVHeaderPropertyMapperModel[]> = computed(() => props.properties.map(p => 
        {
            return {
                property: p,
                csvHeader: undefined
            }
        }));

        function onConfirm()
        {
            stores.popupStore.showRequestAuthentication(props.color, buildAndEmit, () => { });
        }

        function buildAndEmit(masterKey: string)
        {
            const [groupIndex, csvHeadersToPropertiesDict] = buildCSVPropertyMappers(csvHeaderPropertyMappers.value);
            ctx.emit('onConfirm', masterKey, csvHeadersToPropertiesDict, groupIndex);
        }

        return {
            mockHeadersEnum,
            csvHeaderPropertyMappers,
            defaultInputTextColor
        }
    }
})
</script>

<style>
.importSelectionPopup {
    position: absolute;
    top: 10%;
    width: 100%;
    height: 95%;
}

.importSelectionPopup__sections {
    position: relative;
    color: v-bind(defaultInputTextColor);
    margin-left: auto;
    margin-right: auto;
    margin-top: 0;
    width: 90%;
    height: 90%;
    padding: 5px;
}

.importSelectionPopup__headerPropertyPicker {
    display: flex;
    justify-content: center;
    column-gap: 20px;
}
</style>
