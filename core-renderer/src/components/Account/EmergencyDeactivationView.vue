<template>
    <div class="emergencyDeactivationView__header">
        <h2>Emergency Deactivation</h2>
    </div>
    <div class="emergencyDeactivationView__content">
        <ObjectView :buttonText="'Deactivate'" :defaultSave="deactivateSubscription" :skipOnSaveFunctionality="true"
            :color="currentPrimaryColor">
                <div class="emergencyDeactivationView__text">
                    If you are unable to access your subscription via the 'View Subscription' button on the dashboard, and wish to cancel your subscription, you can do so by entering your
                    email and deactivation key and clicking 'Deactivate'.
                </div>
                <VaulticFieldset :centered="true">
                    <TextInputField ref="emailField" :color="currentPrimaryColor" :label="'Email'" v-model="email"
                        :width="'50%'" :maxWidth="''" :minWidth="'330px'" :height="'4vh'" :minHeight="'35px'"
                        :isEmailField="true" />
                </VaulticFieldset>
                <VaulticFieldset :centered="true">
                    <TextInputField ref="deactivationField" :color="currentPrimaryColor" :label="'Deactivation Key'"
                        v-model="deactivationKey" :width="'50%'" :maxWidth="''" :minWidth="'330px'"
                        :height="'4vh'" :minHeight="'35px'" :additionalValidationFunction="isValidGuid" />
                </VaulticFieldset>
        </ObjectView>
    </div>
</template>
<script lang="ts">
import { computed, ComputedRef, defineComponent, ref, Ref } from 'vue';

import ButtonLink from "../InputFields/ButtonLink.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';
import ObjectView from '../ObjectViews/ObjectView.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';

import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { InputComponent } from '../../Types/Components';
import { api } from "../../API";
import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "emergencyDeactivationView",
    components:
    {
        ButtonLink,
        TextInputField,
        PopupButton,
        ObjectView,
        VaulticFieldset
    },
    setup()
    {
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const emailField: Ref<InputComponent | null> = ref(null);
        const deactivationField: Ref<InputComponent | null> = ref(null);

        const deactivationKey: Ref<string> = ref('');
        const email: Ref<string> = ref('');

        async function deactivateSubscription()
        {
            app.popups.showLoadingIndicator(currentPrimaryColor.value, "Deactivating");
            const response = await api.server.user.deactivateUserSubscription(email.value, deactivationKey.value);

            app.popups.hideLoadingIndicator();

            if (!response.Success)
            {
                if (response.UnknownEmail)
                {
                    emailField.value?.invalidate("Incorrect email");
                }
                else if (response.IncorrectDeactivationKey)
                {
                    deactivationField.value?.invalidate("Incorrect deactivation key");
                }
                else
                {
                    defaultHandleFailedResponse(response);
                }

                return;
            }

            email.value = "";
            deactivationKey.value = "";
            app.popups.showToast("Deactivated", true);
            app.popups.hideEmergencyDeactivationPopup();
        }

        function isValidGuid(value: string): [boolean, string]
        {
            const isMatch = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(value);
            if (!isMatch)
            {
                return [false, "Pleaes ener a valid deactivation key"];
            }

            return [true, ''];
        }

        return {
            currentPrimaryColor,
            emailField,
            deactivationField,
            deactivationKey,
            email,
            deactivateSubscription,
            isValidGuid
        }
    }
})
</script>

<style>
.emergencyDeactivationView__header {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.emergencyDeactivationView__content {
    position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}

.emergencyDeactivationView__text {
    width: 70%;
    margin-bottom: 3%;
}
</style>
