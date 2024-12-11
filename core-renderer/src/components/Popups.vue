<template>
    <div class="popups">
        <Teleport to ="#body">
            <Transition name="fade" mode="out-in">
                <LoadingPopup v-if="popupStore.loadingIndicatorIsShowing" :color="popupStore.color"
                    :text="popupStore.loadingText" :glassOpacity="popupStore.loadingOpacity" />
            </Transition>
        </Teleport>
        <Teleport to="#body">
            <Transition name="fade" mode="out-in">
                <AlertPopup v-if="popupStore.alertIsShowing" :showContactSupport="popupStore.showContactSupport"
                    :title="popupStore.alertTitle" :message="popupStore.alertMessage"
                    :statusCode="popupStore.statusCode" :logID="popupStore.logID" :axiosCode="popupStore.axiosCode"
                    :leftButton="popupStore.alertLeftButton" :rightButton="popupStore.alertRightButton"
                    @onOk="popupStore.hideAlert()" />
            </Transition>
        </Teleport>
        <Transition name="fade">
            <RequestedAuthenticationPopup v-if="popupStore.requestAuthenticationIsShowing"
                :authenticationSuccessful="popupStore.onSuccess" :authenticationCanceled="popupStore.onCancel"
                :setupKey="popupStore.needsToSetupKey" :color="popupStore.color" />
        </Transition>
        <Teleport to="#body">
            <Transition name="accountSetupFade" mode="out-in">
                <AccountSetupPopup v-if="popupStore.accountSetupIsShowing" :model="popupStore.accountSetupModel"
                    @onClose="popupStore.hideAccountSetup()" />
            </Transition>
        </Teleport>
        <Teleport to="#body">
            <Transition name="fade">
                <BreachedPasswordPopup v-if="popupStore.breachedPasswordIsShowing"
                    :passwordID="popupStore.breachedPasswordID" @onClose="popupStore.hideBreachedPasswordPopup()" />
            </Transition>
        </Teleport>
        <Transition name="fade" mode="out-in">
            <ToastPopup v-if="popupStore.toastIsShowing" :color="popupStore.color" :text="popupStore.toastText"
                :success="popupStore.toastSuccess" />
        </Transition>
        <Transition name="fade">
            <ImportSelectionPopup v-if="popupStore.importPopupIsShowing" :color="popupStore.color"
                :csvHeaders="popupStore.csvImportHeaders" :properties="popupStore.importProperties"
                @onConfirm="popupStore.onImportConfirmed" @onClose="popupStore.hideImportPopup" />
        </Transition>
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="popupStore.vaultPopupIsShowing" :closePopup="popupStore.onVaultPopupClose"
                    :minWidth="'800px'" :minHeight="'480px'">
                    <VaultView :creating="popupStore.vaultModel == undefined" :model="popupStore.vaultModel" />
                </ObjectPopup>
            </Transition>
        </Teleport>
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="popupStore.organizationPopupIsShowing" :closePopup="popupStore.onOrganizationPopupClose"
                    :width="'50%'" :minWidth="'600px'" :minHeight="'480px'">
                    <OrganizationView :creating="popupStore.organizationModel == undefined" :model="popupStore.organizationModel" />
                </ObjectPopup>
            </Transition>
        </Teleport>
        <Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="popupStore.addDataTypePopupIsShowing" :minWidth="'800px'" :minHeight="'480px'"
					:closePopup="popupStore.hideAddDataTypePopup">
					<AddObjectPopup :initalActiveContent="popupStore.initialAddDataTypePopupContent" />
				</ObjectPopup>
			</Transition>
		</Teleport>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import LoadingPopup from './Loading/LoadingPopup.vue';
import AlertPopup from './AlertPopup.vue';
import AccountSetupPopup from "./Account/AccountSetupPopup.vue"
import RequestedAuthenticationPopup from './Authentication/RequestedAuthenticationPopup.vue';
import BreachedPasswordPopup from "./BreachedPasswords/BreachedPasswordPopup.vue"
import ToastPopup from './ToastPopup.vue';
import ImportSelectionPopup from "./Workflow/ImportSelectionPopup.vue"
import ObjectPopup from "./ObjectPopups/ObjectPopup.vue";
import VaultView from "./ObjectViews/VaultView.vue";
import OrganizationView from './ObjectViews/OrganizationView.vue';
import AddObjectPopup from './ObjectPopups/AddObjectPopup.vue';

import app from "../Objects/Stores/AppStore";

export default defineComponent({
    name: 'Popups',
    components:
    {
        LoadingPopup,
        AlertPopup,
        AccountSetupPopup,
        RequestedAuthenticationPopup,
        BreachedPasswordPopup,
        ToastPopup,
        ImportSelectionPopup,
        ObjectPopup,
        VaultView,
        OrganizationView,
        AddObjectPopup
    },
    setup()
    {
        return {
            popupStore: app.popups,
        }
    }
});
</script>

<style>
.tippy-box[data-theme~='material'] {
    text-align: center;
}

.tippy-box[data-theme~='material'][data-placement^='bottom-start']>.tippy-arrow {
    left: 10px !important;
    transform: translate(0, 0) !important;
}
</style>
