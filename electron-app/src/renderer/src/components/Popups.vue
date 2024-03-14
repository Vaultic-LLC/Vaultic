<template>
	<div class="popups">
		<Transition name="fade" mode="out-in">
			<LoadingPopup v-if="popupStore.loadingIndicatorIsShowing"
				:color="popupStore.color" :text="popupStore.loadingText"
				:glassOpacity="popupStore.loadingOpacity" />
		</Transition>
		<Teleport to="#body">
			<Transition name="fade" mode="out-in">
				<UnknownResponsePopup v-if="popupStore.unknownErrorIsShowing"
				:statusCode="popupStore.statusCode" :logID="popupStore.logID"
				@onOk="popupStore.hideUnkonwnError()"  />
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="fade" mode="out-in">
				<IncorrectDevicePopup v-if="popupStore.incorrectDeviceIsShowing"
				:response="popupStore.response" @onClose="popupStore.hideIncorrectDevice()"  />
			</Transition>
		</Teleport>
		<Transition name="fade">
			<RequestedAuthenticationPopup v-if="popupStore.requestAuthenticationIsShowing"
			:authenticationSuccessful="popupStore.onSuccess" :authenticationCanceled="popupStore.onCancel"
			:setupKey="popupStore.needsToSetupKey" :color="popupStore.color" />
		</Transition>
		<Teleport to="#body">
			<Transition name="fade" mode="out-in">
				<AccountSetupPopup v-if="popupStore.accountSetupIsShowing"
				:model="popupStore.accountSetupModel"
				@onClose="popupStore.hideAccountSetup()" />
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="lockFade" mode="out-in">
				<GlobalAuthenticationPopup v-if="needsAuthentication"
				@onAuthenticationSuccessful="onGlobalAuthSuccessful" />
			</Transition>
		</Teleport>
		<Transition name="fade" mode="out-in">
			<ToastPopup v-if="popupStore.toastIsShowing" :color="popupStore.color" :text="popupStore.toastText"
				:success="popupStore.toastSuccess" />
		</Transition>
	</div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from 'vue';

import GlobalAuthenticationPopup from './Authentication/GlobalAuthenticationPopup.vue';
import ToastPopup from './ToastPopup.vue';
import RequestedAuthenticationPopup from './Authentication/RequestedAuthenticationPopup.vue';
import LoadingPopup from './Loading/LoadingPopup.vue';
import AccountSetupPopup from "./Account/AccountSetupPopup.vue"
import IncorrectDevicePopup from './IncorrectDevice/IncorrectDevicePopup.vue';
import UnknownResponsePopup from './UnknownResponsePopup.vue';

import { stores } from '..//Objects/Stores';

export default defineComponent({
	name: 'App',
	components:
	{
		GlobalAuthenticationPopup,
		ToastPopup,
		RequestedAuthenticationPopup,
		LoadingPopup,
		AccountSetupPopup,
		UnknownResponsePopup,
		IncorrectDevicePopup
	},
	setup()
	{
		const needsAuthentication: Ref<boolean> = ref(stores.needsAuthentication);

		function onGlobalAuthSuccessful()
		{
			stores.needsAuthentication = false;
		}

		watch(() => stores.needsAuthentication, (newValue) =>
		{
			needsAuthentication.value = newValue;
		});

		return {
			popupStore: stores.popupStore,
			needsAuthentication,
			onGlobalAuthSuccessful
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
