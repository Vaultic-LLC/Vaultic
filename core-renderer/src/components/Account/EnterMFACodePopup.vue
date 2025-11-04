<template>
    <div class="enterMFACodePopup">
        <ObjectPopup :minWidth="'500px'" :minHeight="'200px'" :width="'31%'" :height="'24%'"
            :closePopup="() => $.emit('onClose')" :popupInfoOverride="PopupNames.EnterMFACode">
            <div class="enterMFACodePopup__container">
                <div class="mfaView__header">
                    <h2>Enter Multifactor Authentication Code</h2>
                </div>
                <div class="mfaView__content">
                    <ObjectView :color="color" :creating="false" :buttonText="'Confirm'" :defaultSave="onConfirm" :skipOnSaveFunctionality="true"
                        :minButtonHeight="'30px'" :popupInfoOverride="PopupNames.EnterMFACode">
                        <div class="flex flex-col gap-1">
                            <VaulticOTP ref="otp" v-model="mfaCode" :color="color" />
                        </div>
                    </ObjectView>
                </div>
            </div>
        </ObjectPopup>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import ObjectView from '../ObjectViews/ObjectView.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import InputOtp from "primevue/inputotp";
import Message from 'primevue/message';
import VaulticOTP from './VaulticOTP.vue';

import app from '../../Objects/Stores/AppStore';
import { popups } from '../../Objects/Stores/PopupStore';
import { widgetBackgroundHexString } from '../../Constants/Colors';
import { PopupNames } from '../../Objects/Stores/PopupStore';

export default defineComponent({
    name: "EnterMFACodePopup",
    components:
    {
        ObjectView,
        ObjectPopup,
        InputOtp,
        Message,
        VaulticOTP
    },
    emits: ['onConfirm', 'onClose'],
    setup(_, ctx)
    {
        const otp: Ref<any> = ref();
        const currentErrorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.r);
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const popupInfo = popups.enterMFACode;
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.p.p);
        const mfaCode: Ref<string> = ref('');

        const background: Ref<string> = ref(widgetBackgroundHexString());

        async function onConfirm()
        {
            ctx.emit('onConfirm', mfaCode.value);
        }

        function invalidate(message: string)
        {
            otp.value.invalidate(message);
        }

        // onMounted(() =>
        // {
        //     app.popups.addOnEnterHandler(popupInfo.enterOrder!, onConfirm);
        // });

        // onUnmounted(() =>
        // {
        //     app.popups.removeOnEnterHandler(popupInfo.enterOrder!);
        // });

        return {
            otp,
            color,
            mfaCode,
            zIndex: popupInfo.zIndex,
            background,
            currentPrimaryColor,
            currentErrorColor,
            PopupNames,
            onConfirm,
            invalidate
        }
    }
});

</script>
<style scoped>
.enterMFACodePopup {
    color: white;
    z-index: v-bind(zIndex);
    width: 100%;
    height: 100%;
    top: 0%;
    position: fixed;
}

.enterMFACodePopup__container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.mfaView__header {
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.mfaView__content {
    flex-grow: 1;
    margin-bottom: 3%;
}

:deep(.mfaView__message) {
    display: flex;
    justify-content: center;
    margin-top: 5px;
    color: v-bind(currentErrorColor) !important;
}

:deep(.mfaView__OTPInputs) {
    background: v-bind(background) !important;
}

:deep(.mfaView__OTPInputs:focus) {
    border-color: v-bind(currentPrimaryColor) !important;
}
</style>
