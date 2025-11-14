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
import { ColorPalette } from '@vaultic/shared/Types/Color';
import StoreUpdateTransaction from '@/lib/renderer/Objects/StoreUpdateTransaction';
import VaulticHeader from '@/lib/Components/Header/VaulticHeader.vue';
import VaulticContent from '@/lib/Components/VaulticContent/VaulticContent.vue';
import { CondensedVaultData } from '@vaultic/shared/Types/Entities';
import syncManager from '@/lib/Utilities/SyncManager';

const mfaView: Ref<any> = ref();

const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(primaryColor.value));

const isSignedIn: Ref<boolean> = ref(false);
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
        await setData();
        isSignedIn.value = true;

        email.value = '';
        masterKey.value = '';
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

async function setData()
{
    const data: { colorPalette: ColorPalette, vaultData: CondensedVaultData } = await browser.runtime.sendMessage({ 
        type: RuntimeMessages.GetVaultData, 
    });

    app.isOnline = true;

    // This will update the color palette but not commit it since we just need it for themeing
    await app.userPreferences.updateCurrentColorPalette(new StoreUpdateTransaction(), data.colorPalette);
    await app.currentVault.setReactiveVaultStoreData(masterKey.value, data.vaultData, true);
}

watch(() => app.isOnline, () =>
{
    if (!app.isOnline)
    {
        isSignedIn.value = false;
    }
});

onMounted(async() => 
{
    app.isBrowserExtension = true;
    document.getElementsByTagName('html')?.item(0)?.classList.add('darkMode');
    const body = document.getElementsByTagName('body').item(0);
    if (body)
    {
        body.id = 'body';
    }

    syncManager.addAfterSyncCallback(0, async() => setData());
    const response = await browser.runtime.sendMessage({ type: RuntimeMessages.IsSignedIn });

    if (response)
    {
        await setData();
        isSignedIn.value = true;
    }
});

</script>

<template>
  <div class="app" :class="{ isSignedIn: isSignedIn }">
    <div v-if="!isSignedIn" class="app__signInContent">
        <img class="app__logo" :src="Logo" alt="Logo" />
        <div class="app__signInContainer">
            <TextInputField :color="primaryColor" :label="'Email'" v-model="email"
                :width="'100%'" :maxWidth="'300px'" :isEmailField="true" />
            <EncryptedInputField :colorModel="colorModel" :label="'Master Key'"
                v-model="masterKey" :isInitiallyEncrypted="false" :showRandom="false"
                :showUnlock="true" :required="true" :showCopy="false" :width="'100%'" :maxWidth="'300px'" />
            <PopupButton class="app__signInButton" :text="'Sign In'" @onClick="signIn" :color="primaryColor" :height="'30px'" :width="'70%'" />
        </div>
    </div>
    <div v-if="isSignedIn" class="app__content">
        <VaulticHeader />
        <VaulticContent />
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
    width: 250px;
    height: 250px;
    background-color: #0f111d;
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: 0.3s;
}

.app__signInContent {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
}

.app.isSignedIn {
    width: 500px;
    height: 400px;
}

.app__logo {
    width: 75%;
    object-fit: contain;
    margin-top: 10px;
    max-height: 40px;
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

.app__doSignInButton {
    margin-bottom: 10px;
}

.app__signInButton {
    margin-top: 40px;
}

.app__content {
    width: 100%;
    height: 100%;
}

.tippy-box[data-theme~='material'] {
    text-align: center;
}

.tippy-box[data-theme~='material'][data-placement^='bottom-start']>.tippy-arrow {
    left: 10px !important;
    transform: translate(0, 0) !important;
}

ion-icon {
    visibility: unset !important;
}
</style>
