<template>
    <div class="loadingPopupContainer">
        <div class="loadingPopupContainer__glass"></div>
        <div class="loadingPopupContainer__popup">
            <div class="loadingPopupContainer__text"> {{ textToUse }}</div>
            <LoadingIndicator :color="primaryColor" />
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import LoadingIndicator from './LoadingIndicator.vue';
import { popups } from '../../Objects/Stores/PopupStore';

export default defineComponent({
    name: "LoadingPopup",
    components:
    {
        LoadingIndicator
    },
    props: ['color', 'text', 'glassOpacity'],
    setup(props)
    {
        const primaryColor: ComputedRef<string> = computed(() => props.color ? props.color : "#bb29ff");
        const textToUse: ComputedRef<string> = computed(() => props.text ? props.text : "Loading...");
        const computedGlassOpacity: ComputedRef<number> = computed(() => props.glassOpacity ? props.glassOpacity : 0.92);

        const zIndex: number = popups.loading.zIndex;

        return {
            primaryColor,
            textToUse,
            computedGlassOpacity,
            zIndex
        }
    }
})
</script>
<style>
.loadingPopupContainer {
    position: fixed;
    width: 100%;
    left: 100%;
    top: 0;
    left: 0;
    z-index: v-bind(zIndex);
}

.loadingPopupContainer__popup {
    background-color: var(--app-color);
    border: 2px solid v-bind(primaryColor);
    position: fixed;
    width: 10%;
    aspect-ratio: 1 / 0.75;
    min-width: 150px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    row-gap: 10px;
    z-index: 90;
    border-radius: 10%;
}

.loadingPopupContainer__text {
    color: white;
    font-size: clamp(13px, 1vw, 20px);
}

.loadingPopupContainer__glass {
    position: fixed;
    width: 100%;
    height: 100%;
    background: rgba(17, 15, 15, v-bind(computedGlassOpacity));
    z-index: 90;
    top: 0;
    left: 0;
}
</style>
