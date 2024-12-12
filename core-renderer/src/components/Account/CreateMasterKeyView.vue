<template>
    <div class="createMasterKeyViewContainer">
        <Transition name="fade" mode="out-in">
            <AccountSetupView :color="color" :title="'Create Master Key'" :buttonText="'Submit'" :titleMargin="'0%'"
                :titleMarginTop="'1.5%'" @onSubmit="onSubmit">
                <div class="createMasterKeyViewContainer__content">
                    <div class="createMasterKeyViewContainer__inputs">
                        <EncryptedInputField ref="encryptedInputField"
                            :label="'Master Key'" :colorModel="colorModel" v-model="key" :required="true"
                            :width="'70%'" :maxWidth="''"/>
                        <div class="createMasterKeyViewContainer__keyRequirements">
                            <CheckboxInputField class="greaterThanTwentyCharacters" :label="'20 Characters'"
                                :color="color" v-model="greaterThanTwentyCharacters" :fadeIn="true" :width="'100%'"
                                :height="'1.25vh'" :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" :disabled="true" />
                            <CheckboxInputField class="containsUpperAndLowerCaseLetters" :label="'Upper and Lower Case'"
                                :color="color" v-model="containesUpperAndLowerCase" :fadeIn="true" :width="'100%'"
                                :height="'1.25vh'" :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" :disabled="true" />
                            <CheckboxInputField class="containsNumber" :label="'Number'" :color="color"
                                v-model="hasNumber" :fadeIn="true" :width="'100%'" :height="'1.25vh'"
                                :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" :disabled="true" />
                            <CheckboxInputField class="containsSpecialCharacter" :label="'Special Character'"
                                :color="color" v-model="hasSpecialCharacter" :fadeIn="true" :width="'100%'"
                                :height="'1.25vh'" :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" :disabled="true" />
                        </div>
                        <EncryptedInputField ref="confirmEncryptedInputField"
                            :label="'Confirm Key'"
                            :colorModel="colorModel" v-model="reEnterKey" :width="'70%'" :maxWidth="''" />
                        <CheckboxInputField class="createMasterKeyViewContainer__matchesKey" :label="'Matches Key'"
                            :color="color" v-model="matchesKey" :fadeIn="true" :width="'70%'" :height="'1.25vh'"
                            :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" :disabled="true" />
                    </div>
                    <div class="createMasterKeyViewContainer__info">
                        <ButtonLink :color="color" :text="'Help Creating a Strong and Memorable Key'" :fontSize="'clamp(17px, 1vw, 20px)'"
                            @onClick="openCreateStrongAndMemorablePasswords" />
                    </div>
                </div>
            </AccountSetupView>
        </Transition>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref, watch } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';

import { InputComponent } from '../../Types/Components';
import app from "../../Objects/Stores/AppStore";
import { Account, InputColorModel, defaultInputColorModel } from '../../Types/Models';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';
import errorCodes from '@vaultic/shared/Types/ErrorCodes';
import { Field } from '@vaultic/shared/Types/Fields';

export default defineComponent({
    name: "CreateMasterKeyView",
    components:
    {
        AccountSetupView,
        EncryptedInputField,
        CheckboxInputField,
        ButtonLink,
    },
    emits: ['onSuccess', 'onLoginFailed'],
    props: ['color', 'account'],
    setup(props, ctx)
    {
        const refreshKey: Ref<string> = ref('');

        const key: Ref<string> = ref('');
        const reEnterKey: Ref<string> = ref('');

        const account: ComputedRef<Account> = computed(() => props.account);

        const encryptedInputField: Ref<InputComponent | null> = ref(null);
        const confirmEncryptedInputField: Ref<InputComponent | null> = ref(null);

        const greaterThanTwentyCharacters: Ref<boolean> = ref(false);
        const containesUpperAndLowerCase: Ref<boolean> = ref(false);
        const hasNumber: Ref<boolean> = ref(false);
        const hasSpecialCharacter: Ref<boolean> = ref(false);
        const matchesKey: Ref<boolean> = ref(false);

        const alertMessage: Ref<string> = ref('');

        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

        async function showAlertMessage(message: string, title: string = 'Unable to create master key', showContactSupport: boolean = false)
        {
            app.popups.showAlert(title, message, showContactSupport);
            refreshKey.value = Date.now.toString();
            await new Promise((resolve) => setTimeout(resolve, 300));
            app.popups.hideLoadingIndicator();
        }

        async function onSubmit()
        {
            if (!greaterThanTwentyCharacters.value ||
                !containesUpperAndLowerCase.value ||
                !hasNumber.value ||
                !hasSpecialCharacter.value)
            {
                encryptedInputField.value?.invalidate("Please meet all the requirements below");
                return;
            }
            else if (!matchesKey.value)
            {
                confirmEncryptedInputField.value?.invalidate("Keys do not match");
                return;
            }

            app.popups.showLoadingIndicator(props.color, "Creating Account");
            const response = await api.helpers.server.registerUser(key.value, account.value.email, account.value.firstName,
                account.value.lastName);

            if (response.Success)
            {
                app.popups.showLoadingIndicator(props.color, "Signing In");

                const loginResponse = await api.helpers.server.logUserIn(key.value, account.value.email, true, false);
                if (loginResponse.success && loginResponse.value!.Success)
                {
                    const createUserResult = await api.repositories.users.createUser(key.value, account.value.email, response.PublicKey!, response.PrivateKey!);
                    if (!createUserResult.success)
                    {
                        app.popups.hideLoadingIndicator();
                        if (errorCodes.userFailedToSave(createUserResult.errorCode))
                        {
                            showAlertMessage("Unable to create local data, please try signing in. If the issue persists", "Unable to create local data", true);
                            ctx.emit('onLoginFailed');
                            return;
                        }
                    }

                    app.isOnline = true;
                    if (!(await app.loadUserData(key.value, loginResponse.value!.userDataPayload)))
                    {
                        app.popups.hideLoadingIndicator();
                        showAlertMessage("An unexpected error occured when trying to load data. Please try signing in. If the issue persists", "Unable to load data", true);
                        ctx.emit('onLoginFailed');

                        return;
                    }

                    response.VaulticPassword.password = key.value;

                    // these get messed up in the serialization process since they wern't setup property 
                    // to begin with
                    response.VaulticPassword.groups = new Map();
                    response.VaulticPassword.filters = new Map();
                    response.VaulticPassword.securityQuestions = new Map();

                    const vaulticPassword = fieldifyObject(response.VaulticPassword);

                    await app.currentVault.passwordStore.addPassword(key.value, vaulticPassword);
                    ctx.emit('onSuccess');

                    return;
                }

                showAlertMessage("Your account was created but an error occured when trying to log in." +
                    " Please try signing in again. If the issue persists", "Unable to sign in", true);
                ctx.emit('onLoginFailed');
            }
            else
            {
                app.popups.hideLoadingIndicator();
                if (response.EmailIsTaken)
                {
                    showAlertMessage("Email is already in use. Please use a different one");
                }
                else if (response.RestartOpaqueProtocol)
                {
                    showAlertMessage("Please try again. If the issue persists", "An error has occured", true);
                }
                else
                {
                    defaultHandleFailedResponse(response);
                }
            }
        }

        function fieldifyObject(obj: any)
        {
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++)
            {
                obj[keys[i]] = new Field(obj[keys[i]]);
            }

            return obj;
        }

        function openCreateStrongAndMemorablePasswords()
        {
            window.open('https://www.vaultic.org/post/creating-a-strong-and-memorable-master-key');
        }

        watch(() => key.value, async (newValue) =>
        {
            greaterThanTwentyCharacters.value = newValue.length >= 20;
            containesUpperAndLowerCase.value = await api.helpers.validation.containsUppercaseAndLowercaseNumber(newValue);
            hasNumber.value = await api.helpers.validation.containsNumber(newValue);
            hasSpecialCharacter.value = await api.helpers.validation.containsSpecialCharacter(newValue);

            matchesKey.value = newValue == reEnterKey.value;
        });

        watch(() => reEnterKey.value, (newValue) =>
        {
            if (!greaterThanTwentyCharacters.value ||
                !containesUpperAndLowerCase.value ||
                !hasNumber.value ||
                !hasSpecialCharacter.value)
            {
                return;
            }

            matchesKey.value = newValue == key.value;
        });

        return {
            refreshKey,
            key,
            reEnterKey,
            encryptedInputField,
            confirmEncryptedInputField,
            greaterThanTwentyCharacters,
            containesUpperAndLowerCase,
            hasNumber,
            hasSpecialCharacter,
            matchesKey,
            colorModel,
            alertMessage,
            onSubmit,
            openCreateStrongAndMemorablePasswords
        }
    }
})
</script>

<style>
.createMasterKeyViewContainer {
    height: 100%;
}

.createMasterKeyViewContainer__info {
    width: 100%;
    display: flex;
    flex-grow: 1;
    justify-content: center;
    align-items: center;
    margin-bottom: 15px;
}

.createMasterKeyViewContainer__content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
}

.createMasterKeyViewContainer__inputs {
    width: 100%;
    margin-top: 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    row-gap: 10px;
}

.createMasterKeyViewContainer__keyRequirements {
    width: 70%;
    min-height: 50px;
    display: flex;
    flex-direction: column;
    row-gap: clamp(7.5px, 11%, 10px);
    transform: translateX(10px);
}

.createMasterKeyViewContainer__matchesKey {
    transform: translateX(10px);
}
</style>
