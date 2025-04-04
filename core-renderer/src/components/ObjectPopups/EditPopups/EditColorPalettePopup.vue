<template>
    <div class="editColorPaletteHeader">
        <h2>Edit Color Palette</h2>
    </div>
    <div class="cloneFromColorPalettesContainer">
        <div class="cloneFromHeader">Clone From</div>
        <div class="existingColorPalettes">
            <div class="colorPalette" :class="{ hovering: hoveringColorPalette == index }"
                v-for="(cp, index) in currentColorPalettes" :key="cp.id" @click="cloneColorPalette(cp)"
                @mouseenter="hoveringColorPalette = index" @mouseleave="hoveringColorPalette = -1">
                <ColorPalettePill :leftColor="cp.p.p" :rightColor="cp.v.p"
                    :hovering="hoveringColorPalette == index" />
            </div>
        </div>
    </div>
    <div class="colorPaletteViewContainer">
        <ColorPaletteView :creating="false" :model="colorPaletteModel" />
    </div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, ref, Ref } from 'vue';

import ColorPaletteView from '../../../components/ObjectViews/ColorPaletteView.vue';
import ColorPalettePill from "../../ColorPalette/ColorPalettePill.vue"

import app from "../../../Objects/Stores/AppStore";
import { Field } from '@vaultic/shared/Types/Fields';
import { ColorPalette } from '@vaultic/shared/Types/Color';

export default defineComponent({
    name: "EditColorPalettePopup",
    components:
    {
        ColorPaletteView,
        ColorPalettePill
    },
    props: ['model'],
    setup(props)
    {
        const hoveringColorPalette: Ref<number> = ref(-1);
        // copy the object so that we don't edit the original one. Also needed for change tracking
        const colorPaletteModel: Ref<ColorPalette> = ref(JSON.parse(JSON.stringify(props.model)));
        const currentColorPalettes: ComputedRef<ColorPalette[]> = computed(() => app.colorPalettes.filter(cp => cp.i));

        function cloneColorPalette(colorPalette: ColorPalette)
        {
            colorPaletteModel.value = JSON.parse(JSON.stringify(colorPalette));
            colorPaletteModel.value.id = props.model.id;
        }

        return {
            hoveringColorPalette,
            colorPaletteModel,
            currentColorPalettes,
            cloneColorPalette
        }
    }
})
</script>

<style>
.editColorPaletteHeader {
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.colorPaletteViewContainer {
    position: absolute;
    top: 20%;
    width: 100%;
    height: 80%;
}

.cloneFromColorPalettesContainer {
    position: absolute;
    right: 15%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    flex-wrap: wrap;
    color: white;
    border: 1px solid white;
    border-radius: min(1vw, 1rem);
    z-index: 20;
}

.cloneFromColorPalettesContainer .cloneFromHeader {
    position: absolute;
    top: 0;
    left: 10%;
    transform: translateY(-95%);
    background-color: var(--app-color);
    padding: 0 .2em;
    font-size: clamp(11px, 1.2vh, 25px);
}

.cloneFromColorPalettesContainer .existingColorPalettes {
    display: grid;
    grid-template-rows: repeat(2, auto);
    grid-template-columns: repeat(3, auto);
    padding: 5px;
}
</style>
