<script lang="ts" setup>
import app from '@/lib/renderer/Objects/Stores/AppStore';
import { defaultInputColorModel, InputColorModel } from '@/lib/renderer/Types/Models';
import Logo from '@/src/Vaultic_Primary_Color.png';
import { RuntimeMessages } from '@/lib/Types/RuntimeMessages';
import { TypedMethodResponse } from '@vaultic/shared/Types/MethodResponse';
import { LogUserInResponse } from '@vaultic/shared/Types/Responses';

import EnterMFACodePopup from '@/lib/renderer/components/Account/EnterMFACodePopup.vue';
import PopupButton from '@/lib/renderer/components/InputFields/PopupButton.vue';
import TextInputField from '@/lib/renderer/components/InputFields/TextInputField.vue';
import EncryptedInputField from '@/lib/renderer/components/InputFields/EncryptedInputField.vue';

const mfaView: Ref<any> = ref();

const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(primaryColor.value));

const isSignedIn: Ref<boolean> = ref(false);
const isSigningIn: Ref<boolean> = ref(false);
const mfaIsShowing: Ref<boolean> = ref(false);

const email = ref('');
const masterKey = ref('');

async function signIn(mfaCode?: string)
{
    const response: TypedMethodResponse<LogUserInResponse | undefined> = await browser.runtime.sendMessage({ 
        type: RuntimeMessages.SignIn, 
        email: email.value, 
        masterKey: masterKey.value, 
        mfaCode: mfaCode 
    });

    if (response.success)
    {
        isSignedIn.value = true;
        isSigningIn.value = false;
    }
    else 
    {
        if (response.value?.IsSyncing)
        {
            app.popups.showAlert("Unable to Login", "Syncing is in progress. To prevent data corruption, you will not be able to log in until completed. Please try again in a few seconds. If this persists", true);
        }
        else if (response.value?.FailedMFA)
        {
            if (mfaIsShowing.value)
            {
                mfaView.value.invalidate('Incorrect code, please try again');
                return;
            }

            mfaIsShowing.value = true;
        }
        else
        {
            app.popups.showAlert("Unable to Login", "An unknown error occurred. Please try again.", true);
        }
    }
}

onMounted(async() => 
{
    console.log('Checking if user is signed in');
    const response = await browser.runtime.sendMessage({ type: RuntimeMessages.IsSignedIn });
    console.log(`User is signed in: ${response}`);
    isSignedIn.value = response;
});

</script>

<template>
  <div class="app" :class="{ isSigningIn: isSigningIn }">
    <img class="app__logo" :src="Logo" alt="Logo" />
    <div v-if="!isSignedIn && !isSigningIn">
        <PopupButton :text="'Sign In'" @onClick="isSigningIn = true" :color="primaryColor" />
    </div>
    <div v-if="isSigningIn" class="app__signInContainer">
        <TextInputField :color="primaryColor" :label="'Email'" v-model="email"
            :width="'100%'" :maxWidth="'300px'" :isEmailField="true" />
        <EncryptedInputField :colorModel="colorModel" :label="'Master Key'"
            v-model="masterKey" :isInitiallyEncrypted="false" :showRandom="false"
            :showUnlock="true" :required="true" :showCopy="false" :width="'100%'" :maxWidth="'300px'" />
        <PopupButton class="app__signInButton" :text="'Sign In'" @onClick="signIn" :color="primaryColor" :height="'30px'" :width="'70%'" />
    </div>
    <div v-if="isSignedIn">
        Signed In
    </div>
    <Teleport to="body">
        <Transition name="fade">
            <EnterMFACodePopup ref="mfaView" v-if="mfaIsShowing" @onConfirm="signIn" @onClose="mfaIsShowing = false" />
        </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.app {
    width: 150px;
    height: 150px;
    background-color: #0f111d;
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: 0.3s;
}

.app.isSigningIn {
    width: 250px;
    height: 300px;
}

.app__logo {
    width: 75%;
    object-fit: contain;
    margin-top: 10px;
}

.app__signInContainer {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: column;
    gap: 10px;
    flex-grow: 1;
    margin-top: 20px;
}

.app__signInButton {
    margin-top: 60px;
}

</style>
