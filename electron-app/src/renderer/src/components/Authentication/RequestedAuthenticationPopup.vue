<template>
	<div class="requestAuthContainer">
		<div class="requestAuthGlass" @click="onCancel"></div>
		<AuthenticationPopup ref="authPopup" @onAuthenticationSuccessful="onAuthSuccessful" :rubberbandOnUnlock="false"
			:showPulsing="false" :allowCancel="true" @onCanceled="onCancel" :setupKey="needsToSetupKey" :title="title"
			:color="color" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import AuthenticationPopup from "./AuthenticationPopup.vue"
import { stores } from '../../Objects/Stores';

export default defineComponent({
	name: "RequestedAuthenticationPopup",
	components:
	{
		AuthenticationPopup
	},
	props: ["authenticationSuccessful", "authenticationCanceled", "setupKey", "color"],
	setup(props)
	{
		const authPopup: Ref<null> = ref(null);
		const needsToSetupKey: ComputedRef<boolean> = computed(() => props.setupKey ?? false);
		const title: ComputedRef<string> = computed(() => props.setupKey ? "Please create your Master Key" : "");

		function onAuthSuccessful(key: string)
		{
			if (needsToSetupKey.value)
			{
				stores.appStore.authenticated = true;
			}

			if (authPopup.value)
			{
				//@ts-ignore
				authPopup.value.playUnlockAnimation();
			}

			setTimeout(() =>
			{
				props.authenticationSuccessful(key)
			}, 500);
		}

		function onCancel()
		{
			props.authenticationCanceled();
		}

		return {
			needsToSetupKey,
			title,
			authPopup,
			onAuthSuccessful,
			onCancel
		}
	}
})
</script>
<style>
.reqAuthFade-enter-active,
.reqAuthFade-leave-active {
	transition: opacity 0.3s linear;
	z-index: 100;
}

.reqAuthFade-enter-from,
.reqAuthFade-leave-to {
	opacity: 0;
	z-index: 100;
}

.requestAuthGlass {
	position: absolute;
	width: 100%;
	height: 100%;
	background: rgba(17, 15, 15, 0.92);
	z-index: 90;
	top: 0;
	left: 0;
}

.requestAuthContainer {
	position: absolute;
	z-index: 100;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
}
</style>
