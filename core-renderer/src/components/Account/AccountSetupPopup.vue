<template>
    <div class="accountSetupPopupContainer">
        <ObjectPopup ref="objectPopup" :height="'40%'" :width="'30%'" :minHeight="'350px'" :minWidth="'230px'"
            :preventClose="true" :glassOpacity="1" :showPulsing="true">
            <Transition name="fade" mode="out-in">
                <div v-if="navigationStack.length > 0 && !disableBack" class="accountSetupPopupContainer__backButton"
                    @click="navigateBack">
                    <ion-icon name="arrow-back-outline"></ion-icon>
                </div>
            </Transition>
            <Transition name="fade" mode="out-in">
                <SignInView v-if="accountSetupModel.currentView == AccountSetupView.SignIn" :color="primaryColor"
                    :infoMessage="accountSetupModel.infoMessage"
                    :reloadAllDataIsToggled="accountSetupModel.reloadAllDataIsToggled"
                    @onKeySuccess="closeWithAnimation" @onMoveToCreateAccount="moveToCreateAccount"
                    @onMoveToLimitedMode="close" @onMoveToSetupPayment="moveToCreatePayment" />
                <CreateAccountView v-else-if="accountSetupModel.currentView == AccountSetupView.CreateAccount"
                    :color="primaryColor" :account="account" @onSuccess="onCreateAccoutViewSucceeded" />
                <CreateMasterKeyView v-else-if="accountSetupModel.currentView == AccountSetupView.CreateMasterKey"
                    :color="primaryColor" :account="account" @onSuccess="onCreateMasterKeySuccess"
                    @onLoginFailed="onLoginFailedAfterRegistration" />
                <CreateSubscriptionView v-else-if="accountSetupModel.currentView == AccountSetupView.SetupPayment ||
            accountSetupModel.currentView == AccountSetupView.UpdatePayment ||
            accountSetupModel.currentView == AccountSetupView.ReActivate" :color="primaryColor"
                    :creating="creatingAccount" @onSubscriptionCreated="onSubscriptionCreated" />
                <DownloadDeactivationKeyView :color="primaryColor"
                    v-else-if="accountSetupModel.currentView == AccountSetupView.DownloadDeactivationKey"
                    @onDownloaded="closeWithAnimation" @onFailed="onDownloadFailed" />
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
import DownloadDeactivationKeyView from "./DownloadDeactivationKeyView.vue"

import { AccountSetupModel, AccountSetupView } from '../../Types/Models';
import { Account } from '../../Types/SharedTypes';
import { DisableBackButtonFunctionKey, EnableBackButtonFunctionKey } from '../../Types/Keys';
import { popups } from '../../Objects/Stores/PopupStore';
import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "AccountSetupPopup",
    components:
    {
        ObjectPopup,
        CreateAccountView,
        SignInView,
        CreateSubscriptionView,
        CreateMasterKeyView,
        DownloadDeactivationKeyView
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
            navigationStack.value.push(AccountSetupView.SignIn);
            accountSetupModel.value.currentView = AccountSetupView.CreateAccount;
        }

        function onCreateAccoutViewSucceeded(firstName: string, lastName: string, email: string)
        {
            navigationStack.value.push(AccountSetupView.CreateAccount);

            account.value.firstName = firstName;
            account.value.lastName = lastName;
            account.value.email = email;

            creatingAccount.value = true;
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

        function onSubscriptionCreated()
        {
            // clear the navigation stack so the user can't go back without downloading their deactivation key
            navigationStack.value = [];
            accountSetupModel.value.currentView = AccountSetupView.DownloadDeactivationKey;
        }

        function onDownloadFailed()
        {
            navigationStack.value.push(AccountSetupView.SignIn);
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
            app.popups.showGlobalAuthWithLockIcon(primaryColor.value);

            ctx.emit('onClose');
            await new Promise((resolve) => setTimeout(resolve, 1000));

            app.popups.hideLoadingIndicator();
            app.popups.playUnlockAnimation();
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
                accountSetupModel.value.currentView != AccountSetupView.DownloadDeactivationKey &&
                navigationStack.value.length == 0)
            {
                navigationStack.value.push(AccountSetupView.SignIn);
            }
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
            moveToCreatePayment,
            navigateBack,
            close,
            closeWithAnimation,
            onCreateMasterKeySuccess,
            onSubscriptionCreated,
            onLoginFailedAfterRegistration,
            onDownloadFailed
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
    font-size: clamp(15px, 2vw, 25px);
    position: absolute;
    top: 5%;
    left: 5%;
    transition: 0.3s;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: v-bind(primaryColor);
    width: clamp(20px, 2vw, 30px);
    /* height: 30px; */
    aspect-ratio: 1 /1;
    cursor: pointer;
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
