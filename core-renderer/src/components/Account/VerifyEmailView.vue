<template>
    <div class="verifyEmailContainer">
        <AccountSetupView :color="color" :title="'Verify Email'" :buttonText="'Verify'" :titleMargin="'3%'"
            :titleMarginTop="'1.5%'" @onSubmit="verify">
            <div class="verifyEmailContainer__message">
                A verification code has been sent to your email. Please enter the code below and then click Verify
            </div>
            <VaulticOTP ref="otp" :color="color" v-model="otpModel" />
        </AccountSetupView>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, ref, Ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import VaulticOTP from './VaulticOTP.vue';
import { api } from '../../API';
import { Account } from '../../Types/Models';

export default defineComponent({
    name: "CreateAccountView",
    components:
    {
        AccountSetupView,
        VaulticOTP
    },
    emits: ['onSuccess', 'onInvalidPendingUser'],
    props: ['color', 'account'],
    setup(props, ctx)
    {
        const otpModel: Ref<string> = ref('');
        const otp: Ref<any> = ref();

        const account: ComputedRef<Account> = computed(() => props.account);
            
        async function verify()
        {
            if (!otpModel.value)
            {
                otp.value.invalidate('Please enter a valid code');
            }

            const response = await api.server.user.verifyEmail(account.value.pendingUserToken!, otpModel.value);
            if (response.Success)
            {
                ctx.emit('onSuccess');
            }
            else
            {
                if (response.IncorrectEmailVerificationCode)
                {
                    otp.value.invalidate('Incorrect Code. Please try again');
                }
                else if (response.InvalidPendingUser) 
                {
                    ctx.emit('onInvalidPendingUser');
                }
            }
        }

        return {
            otp,
            otpModel,
            verify,
        };
    }
})
</script>

<style>
.verifyEmailContainer {
    height: 100%;
}
</style>
