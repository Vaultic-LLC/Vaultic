<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <ColorPickerInputField class="colorPaletteView__filterColor" :label="'Filter Color'" :color="color"
            v-model="colorPaletteState.filtersColor.value" :width="'8vw'" :height="'4vh'" :minHeight="'30px'"
            :minWidth="'125px'" />
        <ColorPickerInputField class="colorPaletteView__groupColor" :label="'Group Color'" :color="color"
            v-model="colorPaletteState.groupsColor.value" :width="'8vw'" :height="'4vh'" :minHeight="'30px'"
            :minWidth="'125px'" />
        <div class="colorPaletteView__groupedColorPickers colorPaletteView__passwordColors">
            <label class="colorPaletteView__groupedColorPickerLabels">Password Colors</label>
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
        <div class="colorPaletteView__groupedColorPickers colorPaletteView__valueColors">
            <label class="colorPaletteView__groupedColorPickerLabels">Value Colors</label>
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
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, watch } from 'vue';

import ObjectView from "./ObjectView.vue"
import ColorPickerInputField from '../InputFields/ColorPickerInputField.vue';
import ToolTip from '../ToolTip.vue';

import { GridDefinition } from '../../Types/Models';
import { ColorPalette } from '../../Types/Colors';
import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "ColorPaletteView",
    components: {
        ObjectView,
        ColorPickerInputField,
        ToolTip
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

.colorPaletteView__filterColor {
    grid-row: 1 / span 2;
    grid-column: 2 / span 2;
}

.colorPaletteView__groupColor {
    grid-row: 4 / span 2;
    grid-column: 2 / span 2;
}

.colorPaletteView__passwordColors {
    grid-row: 7 / span 3;
    grid-column: 2 / span 9;
}

.colorPaletteView__valueColors {
    grid-row: 12 / span 3;
    grid-column: 2 / span 9;
}
</style>
