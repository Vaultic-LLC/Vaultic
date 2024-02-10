<template>
	<div class="globalAuthContainer">
		<div class="globalAuthGlass" :class="{ unlocked: unlocked }"></div>
		<AuthenticationPopup @onAuthenticationSuccessful="authenticationSuccessful" :rubberbandOnUnlock="true"
			:showPulsing="true" :color="primaryColor" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';
import AuthenticationPopup from "./AuthenticationPopup.vue"
import { stores } from '../../Objects/Stores';

export default defineComponent({
	name: "GlobalAuthenticationPopup",
	components:
	{
		AuthenticationPopup
	},
	setup()
	{
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);

		const unlocked: Ref<boolean> = ref(false);

		function authenticationSuccessful(key: string)
		{
			stores.loadStoreData(key);

			unlocked.value = true;
			setTimeout(() =>
			{
				stores.appStore.authenticated = true;
				setTimeout(() => stores.appStore.reloadMainUI = true, 100);
				stores.appStore.recordLogin(key, Date.now());
			}, 1000);
		}

		return {
			unlocked,
			primaryColor,
			authenticationSuccessful
		}
	}
})
</script>
<style>
.globalAuthContainer {
	position: absolute;
	width: 100%;
	height: 100%;
	z-index: 90;
	top: 0;
	left: 0;
}

.globalAuthGlass {
	position: absolute;
	width: 100%;
	height: 100%;
	background-color: transparent;
	background: rgba(17, 15, 15, 1);
	background-position: center;
	background-repeat: no-repeat;
	z-index: 90;
	top: 0;
	left: 0;
}

.globalAuthGlass.unlocked {
	animation: ripple 2s 0.8s cubic-bezier(0, .5, .5, 1);
}

@keyframes ripple {
	0% {
		transform: scale(0);
		background: radial-gradient(circle at center, rgba(17, 15, 15, 0.92), v-bind('primaryColor'),
				rgba(17, 15, 15, 0.92), v-bind('primaryColor'), rgba(17, 15, 15, 0.92),
				rgba(17, 15, 15, 0.92), rgba(17, 15, 15, 0.92));
	}

	100% {
		transform: scale(5);
		background: radial-gradient(circle at center, rgba(17, 15, 15, 0.92), v-bind('primaryColor'),
				rgba(17, 15, 15, 0.92), v-bind('primaryColor'), rgba(17, 15, 15, 0.92),
				rgba(17, 15, 15, 0.92), rgba(17, 15, 15, 0.92));

	}
}
</style>
