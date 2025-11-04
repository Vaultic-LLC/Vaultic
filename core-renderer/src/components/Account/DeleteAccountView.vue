<template>
    <div class="deleteAccountView">
        <div class="deleteAccountView__Header">
            <h2 class="deleteAccountView__Header__Title">Delete Account</h2>
            <p class="deleteAccountView__Header__Description">This action is irreversible, will permanently delete all of your data, and unsubscribe you from any subscriptions. Please type "DELETE" to confirm.</p>
        </div>
        <div class="deleteAccountView__Content">
            <TextInputField :color="currentPrimaryColor" v-model="inputText" :label="'Confirmation'" :width="'40%'" :maxHeight="''" :maxWidth="''" />
        </div>
        <div class="deleteAccountView__Footer">
            <PopupButton :color="currentPrimaryColor" :text="'Delete'"
                    :width="'6vw'" :minWidth="'90px'" :maxWidth="'200px'" :height="'3vh'" :minHeight="'30px'"
                    :maxHeight="'45px'" :fontSize="'clamp(13px, 1vw, 20px)'" :disabled="disabled" @onClick="onDeleteAccount" />
        </div>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import TextInputField from '../InputFields/TextInputField.vue';
import PopupButton from '../InputFields/PopupButton.vue';

import app from '../../Objects/Stores/AppStore';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper'; 

export default defineComponent({
    name: "DeleteAccountView",
    components:
    {
        TextInputField,
        PopupButton
    },
    setup()
    {
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const inputText: Ref<string> = ref('');
        const disabled: ComputedRef<boolean> = computed(() => inputText.value !== "DELETE");

        async function onDeleteAccount()
        {
            app.popups.showLoadingIndicator(currentPrimaryColor.value, "Deleting Account");
            const response = await api.repositories.users.deleteAccount();

            app.popups.hideLoadingIndicator();

            if (!response.success || !response.value)
            {
                app.popups.hideDeleteAccountPopup();
                defaultHandleFailedResponse(response);

                return;
            }

            app.popups.showToast("Account Deleted", true);
            await app.lock(true, false, false);
            app.popups.hideDeleteAccountPopup();
        }

        return {
            currentPrimaryColor,
            inputText,
            disabled,
            onDeleteAccount
        }
    }
});

</script>
<style>
.deleteAccountView {
    position:relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.deleteAccountView__Header {
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    flex-direction: column;
}

.deleteAccountView__Header__Title {
    font-size: clamp(18px, 1vw, 25px);
}

.deleteAccountView__Header__Description {
    font-size: clamp(13px, 0.7vw, 17px);
}

.deleteAccountView__Content {
    flex-grow: 1;
    justify-content: center;
    display: flex;
    align-items: start;
    padding-top: 5%;
}

.deleteAccountView__Footer {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 3%;
}
</style>
