<template>
    <div class="toastContainer">
        <div class="toastContainerIcons">
            <ion-icon v-if="isSuccess" class="toastIcon success" name="checkmark-outline"></ion-icon>
            <ion-icon v-else class="toastIcon error" name="close-circle-outline"></ion-icon>
        </div>
        <div class="toastContainterText">
            {{ toastText }}
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import { popups } from '../Objects/Stores/PopupStore';

export default defineComponent({
    name: 'ToastPopup',
    props: ['color', 'text', 'success'],
    setup(props)
    {
        const popupInfo = popups.toast;
        const primaryColor: ComputedRef<string> = computed(() => props.color);
        const toastText: ComputedRef<string> = computed(() => props.text);
        const isSuccess: ComputedRef<boolean> = computed(() => props.success);

        return {
            toastText,
            isSuccess,
            primaryColor,
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
    border: 2px solid v-bind('primaryColor');
    border-radius: min(1vw, 1rem);
    background-color: var(--app-color);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 25px v-bind('primaryColor');
    z-index: v-bind(zIndex);
}

.toastContainerIcons {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: clamp(30px, 2vw, 40px);
    width: 20%;
}

.toastContainerIcons .toastIcon.success {
    color: v-bind('primaryColor');
}

.toastContainerIcons .toastIcon.error {
    color: v-bind('primaryColor');
}

.toastContainer .toastContainterText {
    font-size: clamp(11px, 0.8vw, 16px);
    color: white;
    width: 70%;
}
</style>
