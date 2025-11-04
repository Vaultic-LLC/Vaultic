<template>
    <div class="verifyEmailContainer">
        <AccountSetupView :color="color" :title="title" :buttonText="'Verify'" :titleMargin="'3%'"
            :titleMarginTop="'1.5%'" @onSubmit="verify">
            <div class="verifyEmailContainer__message">
                A verification code has been sent to your email. Please enter the code below and then click Verify
            </div>
            <VaulticOTP ref="otp" :color="color" v-model="otpModel" />
        </AccountSetupView>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, ref, Ref } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import VaulticOTP from './VaulticOTP.vue';
import { api } from '../../API';
import { Account } from '../../Types/Models';
import { VerifyEmailResponse } from '@vaultic/shared/Types/Responses';
import app from '../../Objects/Stores/AppStore';

export default defineComponent({
    name: "CreateAccountView",
    components:
    {
        AccountSetupView,
        VaulticOTP
    },
    emits: ['onSuccess', 'onInvalidPendingUser'],
    props: ['creating', 'color', 'account'],
    setup(props, ctx)
    {
        const otpModel: Ref<string> = ref('');
        const otp: Ref<any> = ref();

        const account: ComputedRef<Account> = computed(() => props.account);
        const title: ComputedRef<string> = computed(() => props.creating ? 'Verify Email' : 'Verify New Email');
            
        async function verify()
        {
            app.popups.showLoadingIndicator(props.color, "Verifying");
            if (!otpModel.value)
            {
                app.popups.hideLoadingIndicator();
                otp.value.invalidate('Please enter a valid code');
                
                return;
            }

            let response: VerifyEmailResponse | undefined;
            if (props.creating)
            {
                response = await api.server.user.verifyEmail(account.value.pendingUserToken!, otpModel.value);
            }
            else
            {
                response = await api.server.user.finishEmailVerification(otpModel.value);
            }

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

            app.popups.hideLoadingIndicator();
        }

        onMounted(() =>
        {
            app.popups.hideLoadingIndicator();
        });

        return {
            otp,
            otpModel,
            title,
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
