<template>
	<div class="popups">
		<Transition name="fade" mode="out-in">
			<LoadingPopup v-if="popupStore.loadingIndicatorIsShowing" :color="popupStore.color"
				:text="popupStore.loadingText" :glassOpacity="popupStore.loadingOpacity" />
		</Transition>
		<Teleport to="#body">
			<Transition name="fade" mode="out-in">
				<AlertPopup v-if="popupStore.alertIsShowing" :showContactSupport="popupStore.showContactSupport"
					:title="popupStore.alertTitle" :message="popupStore.alertMessage"
					:statusCode="popupStore.statusCode" :logID="popupStore.logID" :axiosCode="popupStore.axiosCode"
					@onOk="popupStore.hideAlert()" />
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="fade" mode="out-in">
				<IncorrectDevicePopup v-if="popupStore.incorrectDeviceIsShowing" :response="popupStore.response"
					@onClose="popupStore.hideIncorrectDevice()" />
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="lockFade" mode="out-in">
				<GlobalAuthenticationPopup ref="globalAuthPopup" v-if="popupStore.globalAuthIsShowing"
					:playUnlockAnimation="popupStore.playingUnlockAnimation" :iconOnly="popupStore.onlyShowLockIcon"
					@onAuthenticationSuccessful="popupStore.hideGlobalAuthentication" />
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
		<Transition name="fade" mode="out-in">
			<ToastPopup v-if="popupStore.toastIsShowing" :color="popupStore.color" :text="popupStore.toastText"
				:success="popupStore.toastSuccess" />
		</Transition>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import GlobalAuthenticationPopup from './Authentication/GlobalAuthenticationPopup.vue';
import ToastPopup from './ToastPopup.vue';
import RequestedAuthenticationPopup from './Authentication/RequestedAuthenticationPopup.vue';
import LoadingPopup from './Loading/LoadingPopup.vue';
import AccountSetupPopup from "./Account/AccountSetupPopup.vue"
import IncorrectDevicePopup from './IncorrectDevice/IncorrectDevicePopup.vue';
import AlertPopup from './AlertPopup.vue';

import { stores } from '..//Objects/Stores';

export default defineComponent({
	name: 'Popups',
	components:
	{
		GlobalAuthenticationPopup,
		ToastPopup,
		RequestedAuthenticationPopup,
		LoadingPopup,
		AccountSetupPopup,
		AlertPopup,
		IncorrectDevicePopup
	},
	setup()
	{
		return {
			popupStore: stores.popupStore,
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
