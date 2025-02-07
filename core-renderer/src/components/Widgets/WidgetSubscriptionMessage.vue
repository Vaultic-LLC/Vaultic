<template>
    <div class="widgetSubscriptionMessage">
        <div class="widgetSubscriptionMessage__content">
            <div v-if="isLoading" class="widgetSubscriptionMessage__loadingContainer">
                <LoadingIndicator :color="color" />
            </div>
            <div v-else class="widgetSubscriptionMessage__messageContent">
                <div class="widgetSubscriptionMessage__iconContainer">
                    <i class="pi pi-exclamation-triangle widgetSubscriptionMessage__icon"></i>
                </div>
                <div class="widgetSubscriptionMessage__message">
                    {{ message }}
                </div>
                <div class="widgetSubscriptionMessage__buttons" v-if="isOnline">
                    <PopupButton :color="color" :text="'Subscribe'" :width="'5vw'" :minWidth="'75px'" :minHeight="'23px'" @onClick="subscribe" />
                    <PopupButton :color="color" :text="'Refresh'" :width="'5vw'" :minWidth="'75px'" :minHeight="'23px'" @onClick="refresh" />                              
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';
import VaulticButton from '../InputFields/VaulticButton.vue';
import LoadingIndicator from '../Loading/LoadingIndicator.vue';

import app from '../../Objects/Stores/AppStore';
import { LicenseStatus } from '@vaultic/shared/Types/ClientServerTypes';
import { api } from '../../API';

export default defineComponent({
    name: "WidgetSubscriptionMessage",
    components:
    {
        PopupButton,
        VaulticButton,
        LoadingIndicator
    },
    setup()
    {
        const isLoading: Ref<boolean> = ref(false);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const isOnline: ComputedRef<boolean> = computed(() => app.isOnline);
        const message: ComputedRef<string> = computed(() => !isOnline.value ? "Please sign into Online Mode to view this Widget" 
            : app.userLicense != LicenseStatus.Active ? "Please subscribe to view this Widget" : "");

        async function refresh()
        {
            isLoading.value = true;
            await app.getUserInfo();
            isLoading.value = false;
        }

        async function subscribe()
        {
            if (!app.isOnline)
            {
                return;
            }

            isLoading.value = true;
            const response = await api.server.user.createCheckout();

            if (response.Success && !response.AlreadyCreated)
            {
                window.open(response.Url);
            }
            else if (response.AlreadyCreated)
            {
                await app.getUserInfo();
            }

            isLoading.value = false;
        }
        
        return {
            isLoading,
            message,
            color,
            isOnline,
            refresh,
            subscribe
        }
    }
})
</script>
<style>
.widgetSubscriptionMessage {
    width: 100%;
    height: 100%;
    display: flex;
    color: white;
    flex-direction: column;
}

.widgetSubscriptionMessage__content {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.widgetSubscriptionMessage__loadingContainer {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 10%;
}

.widgetSubscriptionMessage__loadingText {
    font-size: 20px;
}

.widgetSubscriptionMessage__messageContent {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    row-gap: clamp(15px, 1vw, 30px);
    position: relative;
}

.widgetSubscriptionMessage__iconContainer {
    margin-top: 1.5vw;
}

.widgetSubscriptionMessage__icon {
    font-size: clamp(30px, 2vw,50px) !important;
}

.widgetSubscriptionMessage__buttons {
    display: flex;
    justify-content: center;
    flex-grow: 1;
    align-items: center;
    column-gap: 15px;
}

.widgetSubscriptionMessage__message {
    padding-left: 10px;
    padding-right: 10px;
    font-size: clamp(10px, 0.7vw, 16px);
}
</style>
