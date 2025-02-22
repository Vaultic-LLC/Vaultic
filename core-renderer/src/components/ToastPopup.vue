<template>
    <div class="toastContainer">
        <div class="toastContainerIcons">
            <IonIcon v-if="isSuccess" class="toastIcon success" :name="'checkmark-outline'" />
            <IonIcon v-else class="toastIcon error" :name="'close-circle-outline'" />
        </div>
        <div class="toastContainterText">
            {{ toastText }}
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import IonIcon from './Icons/IonIcon.vue';

import { popups } from '../Objects/Stores/PopupStore';
import app from '../Objects/Stores/AppStore';

export default defineComponent({
    name: 'ToastPopup',
    components:
    {
        IonIcon
    },
    props: ['text', 'success'],
    setup(props)
    {
        const popupInfo = popups.toast;
        const colorToUse: ComputedRef<string> = computed(() => 
            props.success ? app.userPreferences.currentColorPalette.successColor.value : app.userPreferences.currentColorPalette.errorColor.value);

        const toastText: ComputedRef<string> = computed(() => props.text);
        const isSuccess: ComputedRef<boolean> = computed(() => props.success);

        return {
            toastText,
            isSuccess,
            colorToUse,
            zIndex: popupInfo.zIndex
        }
    }
});
</script>

<style>
.toastContainer {
    position: fixed;
    width: 11%;
    min-width: 150px;
    max-width: 235px;
    height: 5%;
    min-height: 40px;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    border: 1.5px solid color-mix(in srgb, v-bind(colorToUse), #101010  50%);
    border-radius: min(1vw, 1rem);
    background-color: color-mix(in srgb, v-bind(colorToUse), #101010  85%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: v-bind(zIndex);
}

.toastContainerIcons {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: clamp(30px, 2vw, 40px);
    width: 20%;
    color: v-bind('colorToUse');
}

.toastContainer .toastContainterText {
    font-size: clamp(11px, 0.8vw, 16px);
    color: white;
    width: 70%;
}
</style>
