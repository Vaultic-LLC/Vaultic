<template>
    <div class="enterMFACodePopup">
        <ObjectPopup :minWidth="'500px'" :minHeight="'200px'" :width="'31%'" :height="'24%'"
            :closePopup="() => $.emit('onClose')">
            <div class="enterMFACodePopup__container">
                <div class="mfaView__header">
                    <h2>Enter Multifactor Authentication Code</h2>
                </div>
                <div class="mfaView__content">
                    <ObjectView :color="color" :creating="false" :buttonText="'Confirm'" :defaultSave="onConfirm" :skipOnSaveFunctionality="true"
                        :minButtonHeight="'30px'">
                        <div class="flex flex-col gap-1">
                            <InputOtp ref="otp" name="mfaCode" v-model="mfaCode" integerOnly mask :length="6"
                                :pt="{
                                    pcInputText: 
                                    {
                                        root: 'mfaView__OTPInputs'
                                    }
                                }" />
                            <Message v-if="!isValid" severity="error" size="small" variant="simple"
                                :pt="{
                                    root: 'mfaView__message'
                                }">{{ invalidMessage }}</Message>
                        </div>
                    </ObjectView>
                </div>
            </div>
        </ObjectPopup>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, onUnmounted, Ref, ref } from 'vue';

import ObjectView from '../ObjectViews/ObjectView.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import InputOtp from "primevue/inputotp";
import Message from 'primevue/message';

import app from '../../Objects/Stores/AppStore';
import { popups } from '../../Objects/Stores/PopupStore';
import { widgetBackgroundHexString } from '../../Constants/Colors';

export default defineComponent({
    name: "EnterMFACodePopup",
    components:
    {
        ObjectView,
        ObjectPopup,
        InputOtp,
        Message
    },
    emits: ['onConfirm', 'onClose'],
    setup(_, ctx)
    {
        const otp: Ref<any> = ref(null);
        const currentErrorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.errorColor.value);
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const popupInfo = popups.enterMFACode;
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.passwordsColor.value.primaryColor.value);
        const mfaCode: Ref<string> = ref('');

        const isValid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const background: Ref<string> = ref(widgetBackgroundHexString());

        async function onConfirm()
        {
            otp;
            isValid.value = true;
            if (!mfaCode.value || mfaCode.value.length != 6)
            {
                invalidate('Please enter a valid code');
                return;
            }

            ctx.emit('onConfirm', mfaCode.value);
        }

        function invalidate(message: string)
        {
            mfaCode.value = '';
            isValid.value = false;
            invalidMessage.value = message;

            otp.value.$el.children[0].focus();
        }

        onMounted(() =>
        {
            otp.value.$el.children[0].focus();
            app.popups.addOnEnterHandler(popupInfo.enterOrder!, onConfirm);
        });

        onUnmounted(() =>
        {
            app.popups.removeOnEnterHandler(popupInfo.enterOrder!);
        });

        return {
            color,
            mfaCode,
            isValid,
            invalidMessage,
            zIndex: popupInfo.zIndex,
            background,
            currentPrimaryColor,
            currentErrorColor,
            otp,
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
