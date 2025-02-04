<template>
    <div class="accountInfoWidget">
        <div class="accountInfoWidget__userInfo accountInfoWidget__centered">
            <PersonOutlineIcon :fontSize="'clamp(80px, 5vw, 125px)'" />
            <div class="accountInfoWidget__userTextInfo">
                <div>Tyler Wanta</div>
                <div>tylerwanta123@gmail.com</div>
            </div>
        </div>
        <div class="accountInfoWidget__divider accountInfoWidget__centered"></div>
        <div class="accountInfoWidget__section accountInfoWidget__centered">
            <div class="accountInfoWidget__sectionHeader">
                Subscription: {{ subscriptionStatus }}
            </div>
            <PopupButton :color="currentPrimaryColor" :text="buttonText"
                :width="'6vw'" :minWidth="'70px'" :maxWidth="'200px'" :height="'3vh'" :minHeight="'30px'"
                :maxHeight="'45px'" :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="openPaymentInfoLink" />
        </div>
        <div class="accountInfoWidget__divider accountInfoWidget__centered"></div>
        <div class="accountInfoWidget__section accountInfoWidget__centered">
            <div class="accountInfoWidget__sectionHeader">Deactivation Key</div>
            <PopupButton :color="currentPrimaryColor" :text="'Download'"
                :width="'6vw'" :minWidth="'70px'" :maxWidth="'200px'" :height="'3vh'" :minHeight="'30px'"
                :maxHeight="'45px'" :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="downloadDeactivationKey" />
        </div>
        <div class="accountInfoWidget__divider accountInfoWidget__centered"></div>
        <div class="accountInfoWidget__section accountInfoWidget__centered">
            <div class="accountInfoWidget__sectionHeader">Emergency Deactivation</div>
            <PopupButton :color="currentPrimaryColor" :text="'Deactivate'"
                    :width="'6vw'" :minWidth="'70px'" :maxWidth="'200px'" :height="'3vh'" :minHeight="'30px'"
                    :maxHeight="'45px'" :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="openDeactivationPopup" />
        </div>
        <div class="accountInfoWidget__divider accountInfoWidget__centered"></div>
        <div class="accountInfoWidget__section accountInfoWidget__centered">
            <div class="accountInfoWidget__sectionHeader">MFA Key</div>
            <PopupButton :color="currentPrimaryColor" :text="'Show Key'"
                    :width="'6vw'" :minWidth="'70px'" :maxWidth="'200px'" :height="'3vh'" :minHeight="'30px'"
                    :maxHeight="'45px'" :fontSize="'clamp(13px, 1vw, 20px)'" @onClick="onShowMFAKey" />
        </div>
    </div>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';
import PersonOutlineIcon from '../Icons/PersonOutlineIcon.vue';

import app from '../../Objects/Stores/AppStore';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';
import { LicenseStatus } from '@vaultic/shared/Types/ClientServerTypes';

export default defineComponent({
    name: "AccountInfoWidget",
    components: 
    {
        PopupButton,
        PersonOutlineIcon
    },
    setup()
    {
        const currentPrimaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const subscriptionStatus: ComputedRef<string> = computed(() => {
            switch (app.userInfo.license)
            {
                case LicenseStatus.Active:
                    return "Active";
                case LicenseStatus.Inactive:
                    return "Inactive";
                case LicenseStatus.Cancelled:
                    return "Cancelled";
                case LicenseStatus.NotActivated:
                    return "Not Activate";
                case LicenseStatus.Unknown:
                    return "Unknown";
            }
        });

        const hasLicense: ComputedRef<boolean> = computed(() => app.userInfo.license == LicenseStatus.Active || 
            app.userInfo.license == LicenseStatus.Cancelled || app.userInfo.license == LicenseStatus.Inactive);
        
        const buttonText: ComputedRef<string> = computed(() => hasLicense.value ? "View" : "Subscribe");

        async function openPaymentInfoLink()
        {
            if (hasLicense.value)
            {
                window.open('https://billing.stripe.com/p/login/28ocOR6vqa0Yeli5kk');         
            }
            else
            {
                const response = await api.server.user.createCheckout();
                if (response.Success && !response.AlreadyCreated)
                {
                    window.open(response.Url);
                }
                else if (response.AlreadyCreated)
                {
                    window.open('https://billing.stripe.com/p/login/28ocOR6vqa0Yeli5kk');         
                }
            }
        }

        async function downloadDeactivationKey()
        {
            app.popups.showLoadingIndicator(currentPrimaryColor.value, "Downloading");

            const result = await api.helpers.vaultic.downloadDeactivationKey();

            app.popups.hideLoadingIndicator();

            if (!result.Success)
            {
                defaultHandleFailedResponse(result);
                return;
            }
        }

        function openDeactivationPopup()
        {
            app.popups.showEmergencyDeactivationPopup();
        }

        function onShowMFAKey()
        {
            app.popups.showMFAKeyPopup();
        }

        return {
            buttonText,
            currentPrimaryColor,
            subscriptionStatus,
            openPaymentInfoLink,
            downloadDeactivationKey,
            openDeactivationPopup,
            onShowMFAKey
        }
    }
})
</script>
<style>
.accountInfoWidget {
    background: var(--widget-background-color);
    position: absolute;
    top: 42%;
    color: white;
    left: 11%;
    width: 23%;
    height: 44%;
    border-radius: clamp(10px, 1vw, 1.2rem);
}

.accountInfoWidget__centered {
    width: 87%;
    margin: auto;
}

.accountInfoWidget__userInfo {
    display: flex;
    justify-content: flex-start;
    column-gap: clamp(5px, 1vw, 40px);
    margin-top: 2%;
    margin-bottom: clamp(10px, 1vw, 20px);
}

.accountInfoWidget__userTextInfo {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    row-gap: clamp(2px, 0.5vw, 10px);
    font-size: clamp(12px, 0.6vw, 17px);
}

.accountInfoWidget__divider {
    height: 1px;
    background: #80808059;
}

.accountInfoWidget__section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: clamp(10px, 1vw, 20px);
    margin-bottom: clamp(10px, 1vw, 20px);
    font-size: clamp(12px, 0.6vw, 17px);
}

.accountInfoWidget__sectionHeader {
    margin-left: 2%;
}
</style>
