<template>
    <div class="vaulticOTPContainer">
        <InputOtp ref="otp" name="mfaCode" v-model="otpModel" integerOnly mask :length="6"
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
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, onMounted, onUnmounted, ref, Ref } from 'vue';

import InputOtp from 'primevue/inputotp';
import Message from 'primevue/message';

import { widgetBackgroundHexString } from '../../Constants/Colors';
import app from '../../Objects/Stores/AppStore';
import { ValidationFunctionsKey } from '../../Constants/Keys';

export default defineComponent({
    name: "VaulticOTP",
    components:
    {
        InputOtp,
        Message
    },
    emits: ["update:modelValue"],
    props: ['modelValue', 'color'],
    setup(props, ctx)
    {
        const otpModel: Ref<string> = ref(props.modelValue);
        const otp: Ref<any> = ref();
        const background: Ref<string> = ref(widgetBackgroundHexString());
        const currentErrorColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.r);

        const isValid: Ref<boolean> = ref(false);
        const invalidMessage: Ref<string> = ref('');

        const validationFunction: Ref<{ (): boolean; }[]> | undefined = inject(ValidationFunctionsKey, ref([]));

        function validate(): boolean
        {
            if (!otpModel.value)
            {
                invalidate('Please enter a valid code');
                return false;
            }

            ctx.emit('update:modelValue', otpModel.value);
            return true;
        }
        
        function invalidate(message: string)
        {
            otpModel.value = "";
            isValid.value = false;
            invalidMessage.value = message;

            otp.value.$el.children[0].focus();
        }

        onMounted(() =>
        {
            otp.value.$el.children[0].focus();
            validationFunction.value.push(validate);
        });

        onUnmounted(() =>
        {
            validationFunction?.value.splice(validationFunction?.value.indexOf(validate), 1);
        });

        return {
            otp,
            otpModel,
            background,
            currentErrorColor,
            isValid,
            invalidMessage,
            invalidate
        };
    }
})
</script>

<style>
.vaulticOTPContainer {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
}
.mfaView__message {
    display: flex;
    justify-content: center;
    margin-top: 5px;
    color: v-bind(currentErrorColor) !important;
}

.mfaView__OTPInputs {
    background: v-bind(background) !important;
}

.mfaView__OTPInputs:focus {
    border-color: v-bind(color) !important;
}
</style>
