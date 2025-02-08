<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <VaulticFieldset :centered="true">
            <ColorPickerInputField :label="'Error Color'" :color="color"
                v-model="colorPaletteState.errorColor.value" :width="'50%'" :height="'4vh'" :minHeight="'30px'"
                :minWidth="'125px'" />
            <ColorPickerInputField :label="'Success Color'" :color="color"
                v-model="colorPaletteState.successColor.value" :width="'50%'" :height="'4vh'" :minHeight="'30px'"
                :minWidth="'125px'" />
        </VaulticFieldset>
        <VaulticFieldset :centered="true">
            <ColorPickerInputField :label="'Sub Color One'" :color="color"
                v-model="colorPaletteState.filtersColor.value" :width="'50%'" :height="'4vh'" :minHeight="'30px'"
                :minWidth="'125px'" />
            <ColorPickerInputField :label="'Sub Color Two'" :color="color"
                v-model="colorPaletteState.groupsColor.value" :width="'50%'" :height="'4vh'" :minHeight="'30px'"
                :minWidth="'125px'" />
        </VaulticFieldset>
        <VaulticFieldset :centered="true">
            <div class="colorPaletteView__groupedColorPickers colorPaletteView__passwordColors">
                <label class="colorPaletteView__groupedColorPickerLabels">Main Colors One</label>
                <ColorPickerInputField :label="'Primary'" :color="color"
                    v-model="colorPaletteState.passwordsColor.value.primaryColor.value" :width="'8vw'" :height="'4vh'"
                    :minHeight="'30px'" :minWidth="'125px'" />
                <ColorPickerInputField :label="'Secondary One'" :color="color"
                    v-model="colorPaletteState.passwordsColor.value.secondaryColorOne.value" :width="'8vw'" :height="'4vh'"
                    :minHeight="'30px'" :minWidth="'125px'" />
                <ColorPickerInputField :label="'Seconday Two'" :color="color"
                    v-model="colorPaletteState.passwordsColor.value.secondaryColorTwo.value" :width="'8vw'" :height="'4vh'"
                    :minHeight="'30px'" :minWidth="'125px'" />
                <ToolTip :color="color" :message="'Secondary Colors are used for the border of popups'"
                    :size="'clamp(18px, 1.7vw, 28px)'" />
            </div>
        </VaulticFieldset>
        <VaulticFieldset :centered="true">
            <div class="colorPaletteView__groupedColorPickers colorPaletteView__valueColors">
                <label class="colorPaletteView__groupedColorPickerLabels">Main Colors Two</label>
                <ColorPickerInputField :label="'Primary'" :color="color"
                    v-model="colorPaletteState.valuesColor.value.primaryColor.value" :width="'8vw'" :height="'4vh'" :minHeight="'30px'"
                    :minWidth="'125px'" />
                <ColorPickerInputField :label="'Secondary One'" :color="color"
                    v-model="colorPaletteState.valuesColor.value.secondaryColorOne.value" :width="'8vw'" :height="'4vh'"
                    :minHeight="'30px'" :minWidth="'125px'" />
                <ColorPickerInputField :label="'Secondary Two'" :color="color"
                    v-model="colorPaletteState.valuesColor.value.secondaryColorTwo.value" :width="'8vw'" :height="'4vh'"
                    :minHeight="'30px'" :minWidth="'125px'" />
                <ToolTip :color="color" :message="'Secondary Colors are used for the border of popups'"
                    :size="'clamp(18px, 1.7vw, 28px)'" />
            </div>
        </VaulticFieldset>
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ToolTip from '../ToolTip.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';

import { GridDefinition } from '../../Types/Models';
import { ColorPalette } from '../../Types/Colors';
import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "ColorPaletteView",
    components: {
        ObjectView,
        ColorPickerInputField,
        ToolTip,
        VaulticFieldset
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const colorPaletteState: Ref<ColorPalette> = ref(props.model);
        const color: ComputedRef<string> = computed(() => '#d0d0d0');
        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const gridDefinition: GridDefinition =
        {
            rows: 15,
            rowHeight: 'clamp(10px, 3vh, 50px)',
            columns: 11,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        function onSave()
        {
            app.popups.showRequestAuthentication(primaryColor.value, doSave, onAuthCancelled);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function doSave(key: string)
        {
            app.popups.showLoadingIndicator(primaryColor.value, "Saving Color Palette");
            colorPaletteState.value.isCreated.value = true;
            colorPaletteState.value.editable.value = true;

            await app.updateColorPalette(key, colorPaletteState.value);

            refreshKey.value = Date.now().toString();

            app.popups.hideLoadingIndicator();
            saveSucceeded(true);
        }

        function onAuthCancelled()
        {
            saveFailed(false);
        }

        watch(() => props.model, (newValue) =>
        {
            colorPaletteState.value = newValue;
            refreshKey.value = Date.now().toString();
        });

        return {
            colorPaletteState,
            color,
            refreshKey,
            gridDefinition,
            onSave
        };
    },
})
</script>

<style>
.colorPaletteView__groupedColorPickers {
    position: relative;
    display: flex;
    justify-content: space-around;
    align-items: center;
    border: 1.5px solid #d0d0d0;
    border-radius: min(1vw, 1rem);
    min-width: 493px;
    min-height: 60px;
    height: 90px;
    width: 50%;
    margin-top: 20px;
}

.colorPaletteView__groupedColorPickerLabels {
    position: absolute;
    color: #d0d0d0;
    left: 10px;
    top: 0;
    transform: translateY(-80%);
    background: var(--app-color);
    padding: 0 .2em;
    font-size: clamp(11px, 1.2vh, 25px);
}
</style>
