<template>
    <div class="createAccountViewContainer">
        <AccountSetupView :color="color" :title="'Create Account'" :buttonText="'Create'" :titleMargin="'3%'"
            :titleMarginTop="'1.5%'" @onSubmit="createAccount">
            <Transition name="fade" mode="out-in">
                <div :key="refreshKey" class="createAccountViewContainer__content">
                    <div class="createAccountViewContainer__inputs">
                        <TextInputField :color="color" :label="'First Name'" v-model="firstName" :width="'80%'"
                            :maxWidth="'300px'" />
                        <TextInputField :color="color" :label="'Last Name'" v-model="lastName" :width="'80%'"
                            :maxWidth="'300px'" />
                        <TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email" :width="'80%'"
                            :maxWidth="'300px'" :isEmailField="true" />
                        <TextInputField :color="color" :label="'Confirm Email'" v-model="reEnterEmail"
                            :width="'80%'" :maxWidth="'300px'" :isEmailField="true"
                            :additionalValidationFunction="emailsMatch" />
                    </div>
                </div>
            </Transition>
            <template #footer>
                <div class="createAccountViewContainer__terms">
                    By continuing, you agree to the 
                    <ButtonLink :color="color" :text="'Terms of Service'" :fontSize="'clamp(12px, 0.55vw, 17px)'"
                        @onClick="openTermsOfService" /> 
                    and 
                    <ButtonLink :color="color" :text="'Privacy Policy'" :fontSize="'clamp(12px, 0.55vw, 17px)'"
                        @onClick="openPrivacyPolicy" />.
                </div>
            </template>
        </AccountSetupView>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import AccountSetupView from './AccountSetupView.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';

import { InputColorModel, defaultInputColorModel } from '../../Types/Models';
import { InputComponent } from '../../Types/Components';
import app from "../../Objects/Stores/AppStore";
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';

export default defineComponent({
    name: "CreateAccountView",
    components:
    {
        TextInputField,
        AccountSetupView,
        ButtonLink
    },
    emits: ['onSuccess'],
    props: ['color', 'account'],
    setup(props, ctx)
    {
        const refreshKey: Ref<string> = ref('');

        const emailField: Ref<InputComponent | null> = ref(null);

        const firstName: Ref<string> = ref(props.account.firstName);
        const lastName: Ref<string> = ref(props.account.lastName);
        const email: Ref<string> = ref(props.account.email);
        const reEnterEmail: Ref<string> = ref('');

        const alertMessage: Ref<string> = ref('');
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

        async function createAccount()
        {
            app.popups.showLoadingIndicator(props.color, 'Loading');
            const response = await api.server.user.validateEmail(email.value);
            app.popups.hideLoadingIndicator();

            if (response.Success)
            {
                ctx.emit('onSuccess', firstName.value, lastName.value, email.value, response.PendingUserToken);
            }
            else
            {
                if (response.EmailIsTaken)
                {
                    emailField.value?.invalidate("Email is already in use");
                }
                else
                {
                    defaultHandleFailedResponse(response);
                }
            }
        }

        function emailsMatch()
        {
            return [email.value === reEnterEmail.value, "Email does not match"];
        }

        function openTermsOfService()
        {
            window.open("https://vaultic.org/terms-of-service");
        }

        function openPrivacyPolicy()
        {
            window.open("https://vaultic.org/privacy-policy");
        }

        return {
            refreshKey,
            firstName,
            lastName,
            email,
            colorModel,
            emailField,
            alertMessage,
            reEnterEmail,
            createAccount,
            emailsMatch,
            openTermsOfService,
            openPrivacyPolicy
        };
    }
})
</script>

<style>
.createAccountViewContainer {
    height: 100%;
}

.createAccountViewContainer__row {
    display: flex;
}

.createAccountViewContainer__content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    row-gap: 30px;
    width: 100%;
}

.createAccountViewContainer__inputs {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    row-gap: clamp(20px, 2vh, 30px);
    width: 100%;
}

.createAccountViewContainer__nameInputs {
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 20px;
}

.createAccountViewContainer__terms {
    font-size: clamp(12px, 0.55vw, 17px);
}
</style>
