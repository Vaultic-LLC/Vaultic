<template>
    <div class="colorPalettesContainer">
        <ColorPaletteDisplay class="colorPalettesContainer__displayOne" :colorPalette="cpOne" :index="0" />
        <ColorPaletteDisplay class="colorPalettesContainer__displayTwo" :colorPalette="cpTwo" :index="1" />
        <ColorPaletteDisplay class="colorPalettesContainer__displayThree" :colorPalette="cpThree" :index="2" />
        <ColorPaletteDisplay class="colorPalettesContainer__displayFour" :colorPalette="cpFour" :index="3" />
        <ColorPaletteDisplay class="colorPalettesContainer__displayFive" :colorPalette="cpFive" :index="4" />
        <ColorPaletteDisplay class="colorPalettesContainer__displaySix" :colorPalette="cpSix" :index="5" />
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from "vue";
import { ColorPalette } from '../../Types/Colors';
import ColorPaletteDisplay from "./ColorPaletteDisplay.vue";
import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "ColorPaletteContainer",
    components: {
        ColorPaletteDisplay
    },
    setup()
    {
        const cpOne: ComputedRef<ColorPalette> = computed(() => app.colorPalettes[0].value);
        const cpTwo: ComputedRef<ColorPalette> = computed(() => app.colorPalettes[1].value);
        const cpThree: ComputedRef<ColorPalette> = computed(() => app.colorPalettes[2].value);
        const cpFour: ComputedRef<ColorPalette> = computed(() => app.colorPalettes[3].value);
        const cpFive: ComputedRef<ColorPalette> = computed(() => app.colorPalettes[4].value);
        const cpSix: ComputedRef<ColorPalette> = computed(() => app.colorPalettes[5].value);

        return {
            cpOne,
            cpTwo,
            cpThree,
            cpFour,
            cpFive,
            cpSix
        }
    }
})
</script>

<style>
.colorPalettesContainer {
    position: absolute;
    display: grid;
    flex-direction: column;
    width: 20%;
    min-width: 228px;
    min-height: 120px;
    height: 20%;
    top: max(30px, 5%);
    /* left: max(11px, 2%); */
    left: max(11px, 12%);
    column-gap: 10%;
    row-gap: 10%;
    z-index: 1;
    grid-template-rows: repeat(3, max(30px, 5vh));
    grid-template-columns: repeat(2, max(91px, 8vw));
    transition: 0.3s;
}

/* @media (max-width: 1300px) {
    .colorPalettesContainer {
        left: 1%;
    }
} */

.colorPalettesContainer__displayOne {
    grid-row: 1;
    grid-column: 1;
}

.colorPalettesContainer__displayTwo {
    grid-row: 2;
    grid-column: 1;
}

.colorPalettesContainer__displayThree {
    grid-row: 3;
    grid-column: 1;
}

.colorPalettesContainer__displayFour {
    grid-row: 1;
    grid-column: 2;
}

.colorPalettesContainer__displayFive {
    grid-row: 2;
    grid-column: 2;
}

.colorPalettesContainer__displaySix {
    grid-row: 3;
    grid-column: 2;
}
</style>
