<template>
    <div class="accountSetupPopupContainer">
        <ObjectPopup ref="objectPopup" :height="'40%'" :width="'30%'" :minHeight="'400px'" :minWidth="'550px'"
            :preventClose="true" :glassOpacity="1" :showPulsing="true">
            <Transition name="fade" mode="out-in">
                <div v-if="navigationStack.length > 0 && !disableBack" class="accountSetupPopupContainer__backButton"
                    @click="navigateBack">
                    <IonIcon :name="'arrow-back-outline'" />
                </div>
            </Transition>
            <Transition name="fade" mode="out-in">
                <SignInView v-if="accountSetupModel.currentView == AccountSetupView.SignIn" :color="primaryColor"
                    :infoMessage="accountSetupModel.infoMessage"
                    :reloadAllDataIsToggled="accountSetupModel.reloadAllDataIsToggled"
                    :clearAllDataOnLoad="accountSetupModel.clearAllDataOnLoad"
                    @onKeySuccess="closeWithAnimation" @onMoveToCreateAccount="moveToCreateAccount"
                    @onMoveToSetupPayment="moveToCreatePayment"
                    @onNotClearedData="() => accountSetupModel.clearAllDataOnLoad = true" />
                <CreateAccountView v-else-if="accountSetupModel.currentView == AccountSetupView.CreateAccount"
                    :color="primaryColor" :account="account" @onSuccess="onCreateAccoutViewSucceeded" />
                <VerifyEmailView v-else-if="accountSetupModel.currentView == AccountSetupView.VerifyEmail"
                    :creating="true" :color="primaryColor" :account="account" @onSuccess="onVerifyEmailSuccess"
                    @onInvalidPendingUser="onInvalidPendingUser" />
                <CreateMasterKeyView v-else-if="accountSetupModel.currentView == AccountSetupView.CreateMasterKey"
                    :color="primaryColor" :account="account" @onSuccess="onCreateMasterKeySuccess"
                    @onLoginFailed="onLoginFailedAfterRegistration"
                    @onInvalidPendingUser="onInvalidPendingUser" />
                <CreateSubscriptionView v-else-if="accountSetupModel.currentView == AccountSetupView.SetupPayment ||
                    accountSetupModel.currentView == AccountSetupView.UpdatePayment ||
                    accountSetupModel.currentView == AccountSetupView.ReActivate" :color="primaryColor"
                    :creating="creatingAccount" @onFinish="onFinish" />
            </Transition>
        </ObjectPopup>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, onUnmounted, provide, ref, watch } from 'vue';

import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import CreateAccountView from './CreateAccountView.vue';
import SignInView from './SignInView.vue';
import CreateSubscriptionView from './CreateSubscriptionView.vue';
import CreateMasterKeyView from './CreateMasterKeyView.vue';
import IonIcon from '../Icons/IonIcon.vue';
import VerifyEmailView from './VerifyEmailView.vue';

import { Account, AccountSetupModel, AccountSetupView } from '../../Types/Models';
import { popups } from '../../Objects/Stores/PopupStore';
import app from "../../Objects/Stores/AppStore";
import { DisableBackButtonFunctionKey, EnableBackButtonFunctionKey } from '../../Constants/Keys';

export default defineComponent({
    name: "AccountSetupPopup",
    components:
    {
        ObjectPopup,
        CreateAccountView,
        VerifyEmailView,
        SignInView,
        CreateSubscriptionView,
        CreateMasterKeyView,
        IonIcon
    },
    emits: ['onClose'],
    props: ['model'],
    setup(props, ctx)
    {
        const objectPopup: Ref<null> = ref(null);
        const popupInfo = popups.accountSetup;

        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const accountSetupModel: Ref<AccountSetupModel> = ref(props.model);
        const navigationStack: Ref<AccountSetupView[]> = ref([]);
        const disableBack: Ref<boolean> = ref(false);

        const creatingAccount: Ref<boolean> = ref(false);
        const account: Ref<Account> = ref({
            firstName: '',
            lastName: '',
            email: '',
            masterKey: '',
        });

        provide(DisableBackButtonFunctionKey, disableBackButtonFunction);
        provide(EnableBackButtonFunctionKey, enableBackButtonFunction);

        function moveToCreateAccount()
        {
            account.value.firstName = '';
            account.value.lastName = '';
            account.value.email = '';
            account.value.masterKey = '';
            
            navigationStack.value.push(AccountSetupView.SignIn);
            accountSetupModel.value.currentView = AccountSetupView.CreateAccount;
        }

        function onCreateAccoutViewSucceeded(firstName: string, lastName: string, email: string, pendingUserToken: string)
        {
            navigationStack.value.push(AccountSetupView.CreateAccount);

            account.value.firstName = firstName;
            account.value.lastName = lastName;
            account.value.email = email;
            account.value.pendingUserToken = pendingUserToken;

            creatingAccount.value = true;
            accountSetupModel.value.currentView = AccountSetupView.VerifyEmail;
        }

        function onVerifyEmailSuccess()
        {
            accountSetupModel.value.currentView = AccountSetupView.CreateMasterKey;
        }

        function moveToCreatePayment()
        {
            navigationStack.value.push(AccountSetupView.SignIn);
            accountSetupModel.value.currentView = AccountSetupView.SetupPayment;
        }

        function onCreateMasterKeySuccess()
        {
            navigationStack.value = [];
            navigationStack.value.push(AccountSetupView.SignIn);
            accountSetupModel.value.currentView = AccountSetupView.SetupPayment;
        }

        function onLoginFailedAfterRegistration()
        {
            navigationStack.value = [];
            accountSetupModel.value.currentView = AccountSetupView.SignIn;
        }

        function onFinish()
        {
            navigationStack.value = [];
            closeWithAnimation();
        }

        function navigateBack()
        {
            const view: AccountSetupView | undefined = navigationStack.value.pop();
            if (view)
            {
                if (view == AccountSetupView.SignIn)
                {
                    navigationStack.value = [];
                }

                accountSetupModel.value.currentView = view;
            }
        }

        function disableBackButtonFunction()
        {
            disableBack.value = true;
        }

        function enableBackButtonFunction()
        {
            disableBack.value = false;
        }

        async function closeWithAnimation()
        {
            app.popups.hideLoadingIndicator();
            ctx.emit('onClose');
        }

        function close()
        {
            ctx.emit('onClose');
        }

        // make sure we didn't trap the user on a screen. Like if they need to update their payment info but
        // just want to use the app offline instead. We can exclude the download deactivation key screen since
        // the user will never go back to it besides the inital setup
        function checkSetBackNavigation()
        {
            if (accountSetupModel.value.currentView != AccountSetupView.SignIn &&
                navigationStack.value.length == 0)
            {
                navigationStack.value.push(AccountSetupView.SignIn);
            }
            else if (accountSetupModel.value.currentView == AccountSetupView.SignIn)
            {
                navigationStack.value = [];
            }
        }

        function onInvalidPendingUser()
        {
            app.popups.showAlert('Error', 'An unrecoverable error has occured, please try again. If the issue persists', true);
            account.value.email = '';
            account.value.firstName = '';
            account.value.lastName = '';
            account.value.masterKey = '';
            account.value.pendingUserToken = '';

            navigationStack.value = [];
            accountSetupModel.value.currentView = AccountSetupView.SignIn;
        }

        watch(() => props.model.currentView, () =>
        {
            accountSetupModel.value = props.model;
            checkSetBackNavigation();
        });

        onMounted(() =>
        {
            checkSetBackNavigation();
        });

        onUnmounted(() =>
        {
            accountSetupModel.value.infoMessage = "";
        });

        return {
            objectPopup,
            AccountSetupView,
            accountSetupModel,
            creatingAccount,
            account,
            primaryColor,
            navigationStack,
            disableBack,
            zIndex: popupInfo.zIndex,
            moveToCreateAccount,
            onCreateAccoutViewSucceeded,
            onVerifyEmailSuccess,
            moveToCreatePayment,
            navigateBack,
            close,
            closeWithAnimation,
            onCreateMasterKeySuccess,
            onFinish,
            onLoginFailedAfterRegistration,
            onInvalidPendingUser
        }
    }
})
</script>

<style>
.accountSetupPopupContainer {
    width: 100%;
    height: 100%;
    top: 0%;
    position: fixed;
    z-index: v-bind(zIndex);
}

.accountSetupPopupContainer__backButton {
    color: v-bind(primaryColor);
    font-size: clamp(20px, 1.5vw, 25px);
    position: absolute;
    top: 5%;
    left: 5%;
    transition: 0.3s;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    aspect-ratio: 1 /1;
    cursor: pointer;
    border: 1.5px solid v-bind(primaryColor);
}

.accountSetupPopupContainer__backButton::before {
    content: '';
    position: absolute;
    width: 90%;
    height: 90%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background-color: var(--app-color);
}

.accountSetupPopupContainer__backButton:hover {
    box-shadow: 0 0 25px v-bind(primaryColor);

}
</style>
