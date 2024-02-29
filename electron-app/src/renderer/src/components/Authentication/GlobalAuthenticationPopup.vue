<template>
	<div class="globalAuthContainer" :class="{ unlocked: unlocked }">
		<div class="mainUICover"></div>
		<div class="globalAuthGlass" :class="{ unlocked: unlocked }"></div>
		<AuthenticationPopup ref="authPopup" @onAuthenticationSuccessful="authenticationSuccessful"
			:rubberbandOnUnlock="true" :showPulsing="true" :color="primaryColor" :beforeEntry="true" />
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import AuthenticationPopup from "./AuthenticationPopup.vue"
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "GlobalAuthenticationPopup",
	components:
	{
		AuthenticationPopup
	},
	emits: ['onAuthenticationSuccessful'],
	setup(_, ctx)
	{
		const authPopup: Ref<null> = ref(null);
		const primaryColor: ComputedRef<string> = computed(() => stores.settingsStore.currentPrimaryColor.value);
		const unlocked: Ref<boolean> = ref(false);

		async function authenticationSuccessful(key: string)
		{
			stores.loadStoreData(key).then(async () =>
			{
				await stores.appStore.recordLogin(key, Date.now());
				stores.appStore.authenticated = true;

				//@ts-ignore
				authPopup.value?.playUnlockAnimation();
				unlocked.value = true;

				setTimeout(() =>
				{
					ctx.emit('onAuthenticationSuccessful');
				}, 2500);
			});
		}

		return {
			unlocked,
			primaryColor,
			authPopup,
			authenticationSuccessful,
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

.globalAuthContainer.unlocked {
	animation-delay: 1.5s;
	animation-duration: 1.5s;
	animation-name: fadeOut;
	animation-direction: linear;
}

.mainUICover {
	position: absolute;
	width: 100%;
	height: 100%;
	background: rgba(17, 15, 15, 1);
	z-index: 89;
}

.globalAuthContainer.unlocked .mainUICover {
	animation-delay: 1.5s;
	animation-duration: 1.5s;
	animation-name: fadeOut;
	animation-direction: linear;
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
