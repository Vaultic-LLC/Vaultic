<template>
    <div class="signInViewContainer" ref="container">
        <AccountSetupView :color="color" :title="'Sign In'" :buttonText="'Sign In'"
            :titleMargin="'clamp(15px, 0.8vw, 18px)'" :titleMarginTop="'clamp(15px, 0.8vw, 20px)'" @onSubmit="onSubmit">
            <Transition name="fade" mode="out-in">
                <div class="signInViewContainer__contentContainer" :key="refreshKey">
                    <div class="signInViewContainer__content">
                        <div v-if="showEmailField" class="signInViewContainer__inputs">
                            <TextInputField ref="emailField" :color="color" :label="'Email'" v-model="email"
                                :width="'70%'" :maxWidth="'300px'" :isEmailField="true" />
                            <EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
                                v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
                                :showUnlock="true" :required="true" :showCopy="false" :width="'70%'" :maxWidth="'300px'" />
                        </div>
                        <div class="signInContainer__offlineMode">
                            <CheckboxInputField :label="'Online Mode'"
                                :color="color" v-model="onlineMode" :width="'100%'" :height="'1.25vh'"
                                :minHeight="'15px'" :fontSize="'clamp(11px, 1vh, 20px)'" />
                        </div>
                        <div v-if="reloadAllDataIsToggled" class="signInContainer__restoreLastBackup">
                            <CheckboxInputField :label="'Restore Last Backup'"
                                :color="color" v-model="reloadAllData" :width="'100%'" :height="'1.25vh'"
                                :minHeight="'15px'" :fontSize="'clamp(11px, 1vw, 20px)'" />
                            <ToolTip :message="'Restore last backup from the server. Will override all local data'"
                                :size="'20px'" :color="color" />
                        </div>
                        <!-- <div v-else class="signInViewContainer__inputs">
                            <EncryptedInputField ref="masterKeyField" :colorModel="colorModel" :label="'Master Key'"
                                v-model="masterKey" :initialLength="0" :isInitiallyEncrypted="false" :showRandom="false"
                                :showUnlock="true" :required="true" :showCopy="false" :width="'70%'" :maxWidth="'300px'"
                                :height="'4vh'" :minHeight="'35px'" />
                    </div> -->
                        <!-- <div class="signInViewContainer__navigation">
                            <div v-if="showEmailField" class="signInViewContainer__arrow signInViewContainer__arrowLeft"
                                @click="navigateLeft">
                                <ion-icon name="chevron-back-outline"></ion-icon>
                            </div>
                            <div class="signInViewContainer__dots">
                                <div class="signInViewContainer__dot"
                                    :class="{ 'signInViewContainer__dot--active': !showEmailField }">
                                </div>
                                <div class="signInViewContainer__dot"
                                    :class="{ 'signInViewContainer__dot--active': showEmailField }">
                                </div>
                            </div>
                            <div v-if="!showEmailField"
                                class="signInViewContainer__arrow signInViewContainer__arrowRight"
                                @click="navigateRight">
                                <ion-icon name="chevron-forward-outline"></ion-icon>
                            </div>
                        </div> -->
                    </div>
                </div>
            </Transition>
            <template #footer>
                <div class="signInViewContainer__contentBottom">
                    <div class="signInViewContainer__divider">
                        <div class="signInViewContainer__divider__line"></div>
                        <div class="signInViewContainer__divider__text">Or</div>
                        <div class="signInViewContainer__divider__line"></div>
                    </div>
                    <div class="signInViewContainer__createAccountLink">Don't have an account?
                        <ButtonLink :color="color" :text="'Create One'" :fontSize="'clamp(15px, 1vw, 20px)'" @onClick="moveToCreateAccount" />
                    </div>
                </div>
            </template>
        </AccountSetupView>
        <Teleport to="#body">
			<Transition name="fade">
				<EnterMFACodePopup ref="mfaView" v-if="mfaIsShowing" @onConfirm="onSubmit" @onClose="onMFAClose" />
			</Transition>
		</Teleport>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import AccountSetupView from './AccountSetupView.vue';
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import CheckboxInputField from "../InputFields/CheckboxInputField.vue";
import ButtonLink from '../InputFields/ButtonLink.vue';
import ToolTip from "../ToolTip.vue";
import EnterMFACodePopup from './EnterMFACodePopup.vue';

import { InputColorModel, defaultInputColorModel } from '../../Types/Models';
import { EncryptedInputFieldComponent, InputComponent } from '../../Types/Components';
import app from "../../Objects/Stores/AppStore";
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { api } from '../../API';

export default defineComponent({
    name: "SignInView",
    components:
    {
        TextInputField,
        EncryptedInputField,
        AccountSetupView,
        ButtonLink,
        CheckboxInputField,
        ToolTip,
        EnterMFACodePopup,
    },
    emits: ['onMoveToCreateAccount', 'onKeySuccess', 'onUsernamePasswordSuccess', 'onMoveToSetupPayment', 'onNotClearedData'],
    props: ['color', 'infoMessage', 'reloadAllDataIsToggled', 'clearAllDataOnLoad'],
    setup(props, ctx)
    {
        const refreshKey: Ref<string> = ref('');
        const container: Ref<HTMLElement | null> = ref(null);
        const resizeHandler: ResizeObserver = new ResizeObserver(checkWidthHeightRatio);
        const onlineMode: Ref<boolean> = ref(true);
        const reloadAllData: Ref<boolean> = ref(props.reloadAllDataIsToggled != undefined ? props.reloadAllDataIsToggled : false);

        const masterKeyField: Ref<EncryptedInputFieldComponent | null> = ref(null);
        const masterKey: Ref<string> = ref('');

        const emailField: Ref<InputComponent | null> = ref(null);
        const email: Ref<string> = ref('');

        const showEmailField: Ref<boolean> = ref(true);
        const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(props.color));

        const contentBottomRowGap: Ref<string> = ref(showEmailField.value ? "min(1.5vh, 25px)" : "min(2.5vh, 20px)");
        const contentBottomMargin: ComputedRef<string> = computed(() => showEmailField.value ? "15px" : "130px");

        const mfaView: Ref<any> = ref();
        const mfaIsShowing: Ref<boolean> = ref(false);

        function moveToCreateAccount()
        {
            ctx.emit('onMoveToCreateAccount');
        }

        async function onSubmit(mfaCode?: string)
        {
            masterKeyField.value?.toggleMask(true);
            app.popups.showLoadingIndicator(props.color, "Signing In");

            if (onlineMode.value)
            {          
                const response = await api.helpers.server.logUserIn(masterKey.value, email.value, false, reloadAllData.value, mfaCode);
                if (response.success && response.value!.Success)
                {
                    mfaIsShowing.value = false;
                    app.isOnline = true;
                    
                    if (await app.loadUserData(masterKey.value))
                    {
                        ctx.emit('onKeySuccess');                   
                    }            
                }
                else if (response.value?.FailedMFA)
                {
                    handleMFAFailed();
                }
                else
                {
                    handleFailedResponse(response);
                }
            }
            else 
            {
                const response = await api.repositories.users.verifyUserMasterKey(masterKey.value, email.value);

                // check if the method call succeeded
                if (response.success)
                {
                    // check if key is correct
                    if (response.value)
                    {
                        const setUserResponse = await api.repositories.users.setCurrentUser(masterKey.value, email.value);
                        if (setUserResponse.success)
                        {
                            if (await app.loadUserData(masterKey.value))
                            {
                                ctx.emit('onKeySuccess');
                            }
                        }
                        else 
                        {
                            handleFailedResponse(setUserResponse);
                        }
                    }
                    else 
                    {
                        handleFailedResponse(response);
                    }
                }
                else 
                {
                    app.popups.showAlert("Unable to verify master key", "We were unable to verify your master key, please make sure it was entered correctly. If the issue persists, try signing into online mode instead.", false);
                }
            }
            
            app.popups.hideLoadingIndicator();
        }

        function handleMFAFailed()
        {
            if (mfaIsShowing.value)
            {
                mfaView.value.invalidate('Incorrect code, please try again');
                return;
            }

            mfaIsShowing.value = true;
        }

        function handleFailedResponse(response: any)
        {
            mfaIsShowing.value = false;
            app.popups.hideLoadingIndicator();

            if (response.value?.UnknownEmail)
            {
                app.popups.hideLoadingIndicator();

                if (!showEmailField.value)
                {
                    showEmailField.value = true;
                    app.popups.showAlert("Unable to sign in", "The Email you entered is not correct. Please try again", false);
                }

                emailField.value?.invalidate("Incorrect Email. Please try again");
            }
            else if (response.value?.RestartOpaqueProtocol)
            {
                app.popups.hideLoadingIndicator();
                app.popups.showAlert("Unable to sign in", "Please check your Email and Master Key, and try again", false);
            }
            else
            {
                defaultHandleFailedResponse(response);
                if (response.value)
                {
                    defaultHandleFailedResponse(response.value);
                }
            }
        }

        function navigateLeft()
        {
            showEmailField.value = false;
            refreshKey.value = Date.now().toString();
        }

        function navigateRight()
        {
            showEmailField.value = true;
            refreshKey.value = Date.now().toString();
        }

        function checkWidthHeightRatio()
        {
            if (container.value)
            {
                const containerDimensions = container.value.getBoundingClientRect();
                // min dimensions of popup
                if (containerDimensions.width < 225 && containerDimensions.height <= 345)
                {
                    contentBottomRowGap.value = "min(2.5vh, 40px)"
                    return;
                }
            }

            if (window.innerHeight < 1200)
            {
                const ratio = window.innerWidth / window.innerHeight;
                if (ratio > 2)
                {
                    contentBottomRowGap.value = "min(0.5vh, 10px)";
                }
                else if (ratio > 1.5)
                {
                    contentBottomRowGap.value = "min(1.5vh, 25px)";
                }
                else
                {
                    contentBottomRowGap.value = "min(2.5vh, 40px)"
                }
            }
            else
            {
                contentBottomRowGap.value = "min(2.5vh, 40px)"
            }
        }

        async function onMFAClose()
        {
            await api.cache.clear();
            mfaIsShowing.value = false;
        }

        watch(() => props.reloadAllDataIsToggled, (newValue) => 
        {
            reloadAllData.value = newValue;
        });

        onMounted(async() =>
        {
            // Make sure we clear the cache in case the user was set when creating the master key, but the 
            // request failed and we navivated back to the sign in page
            if (props.clearAllDataOnLoad !== false)
            {
                await app.clearAllData();
            }
            else
            {
                ctx.emit("onNotClearedData");
            }

            api.environment.hasConnection().then((result: boolean) =>
            {
                onlineMode.value = result;
            });

            api.repositories.users.getLastUsedUserEmail().then((lastUsedEmail) =>
            {
                if (lastUsedEmail)
                {
                    email.value = lastUsedEmail;
                    // TODO: set user profile pic
                }
            });

            if (props.infoMessage)
            {
                app.popups.showAlert("Alert", props.infoMessage, false);
            }

            const body = document.getElementById('body');
            if (body)
            {
                resizeHandler.observe(body);
            }
        });

        return {
            refreshKey,
            container,
            onlineMode,
            reloadAllData,
            masterKeyField,
            masterKey,
            emailField,
            email,
            colorModel,
            showEmailField,
            contentBottomRowGap,
            contentBottomMargin,
            mfaView,
            mfaIsShowing,
            moveToCreateAccount,
            onSubmit,
            navigateLeft,
            navigateRight,
            onMFAClose
        };
    }
})
</script>

<style>
.signInViewContainer {
    height: 100%;
}

.signInViewContainer__contentContainer {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    margin-bottom: 10px;
}

.signInViewContainer__content {
    row-gap: clamp(15px, 2vh, 25px);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    position: relative;
    /* set the height so that the elements below it don't jump arround when showing email field at smaller screen sizes */
    height: clamp(calc(90px + clamp(15px, 2vh, 25px) + clamp(7px, 0.5vw, 10px) + 10px),
            calc(8vh + 20px + clamp(15px, 2vh, 25px) + clamp(7px, 0.5vw, 10px) + 10px),
            calc(100px + 20px + clamp(15px, 2vh, 25px) + clamp(7px, 0.5vw, 10px) + 10px));
}

.signInViewContainer__inputs {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    row-gap: 20px;
}

.signInViewContainer__contentBottom {
    /* height: 16vh; */
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-direction: column;
    row-gap: v-bind(contentBottomRowGap);
    flex-grow: 1;
    /* margin-top: min(2vh, 30px); */
}

.signInViewContainer__limitedMode {
    color: white;
}

.signInViewContainer__createAccountLink {
    color: white;
    font-size: clamp(15px, 1vw, 20px);
}

.signInViewContainer__divider {
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 5px;
}

.signInViewContainer__divider__line {
    background-color: gray;
    height: 1px;
    border-radius: 20px;
    flex-grow: 1;
    min-width: 100%;
}

.signInViewContainer__divider__text {
    color: gray;
    font-size: clamp(13px, 1vw, 20px);
}

.signInViewContainer__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: gray;
    display: flex;
    font-size: clamp(20px, 1.8vw, 30px);
    will-change: transform;
    transition: 0.3s;
}

.signInViewContainer__arrow:hover {
    transform: translateY(-50%) scale(1.05);
    color: rgb(177, 177, 177);
}

.signInViewContainer__arrowLeft {
    left: clamp(-80px, -3vw, -40px);
}

.signInViewContainer__arrowRight {
    right: clamp(-80px, -3vw, -40px);
}

.signInViewContainer__navigation {
    display: flex;
    position: relative;
}

.signInViewContainer__dots {
    display: flex;
    column-gap: 10px;
    justify-content: center;
    align-items: center;
}

.signInViewContainer__dot {
    width: clamp(7px, 0.5vw, 10px);
    height: clamp(7px, 0.5vw, 10px);
    border: 1.5px solid v-bind(color);
    background-color: transparent;
    border-radius: 50%;
    transition: 0.3s;
}

.signInViewContainer__dot--active {
    background-color: v-bind(color);
    box-shadow: 0 0 10px v-bind(color);
}

.signInContainer__offlineMode,
.signInContainer__restoreLastBackup {
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 10px;
}
</style>
