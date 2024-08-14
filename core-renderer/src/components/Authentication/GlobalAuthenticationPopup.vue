<template>
    <div class="globalAuthContainer" :class="{ unlocked: unlocked }">
        <div class="mainUICover"></div>
        <div class="globalAuthGlass" :class="{ unlocked: unlocked }"></div>
        <AuthenticationPopup ref="authPopup" @onAuthenticationSuccessful="authenticationSuccessful"
            @onCanceled="onCancel" :allowCancel="true" :rubberbandOnUnlock="true" :showPulsing="true"
            :color="primaryColor" :beforeEntry="true" :iconOnly="iconOnly" :popupIndex="enterOrder"
            :focusOnShow="focusInput" />
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import AuthenticationPopup from "./AuthenticationPopup.vue"
import { stores } from '../../Objects/Stores';
import { AuthPopup } from '../../Types/Components';
import { popups } from '../../Objects/Stores/PopupStore';
import { AccountSetupView } from '../../Types/Models';

export default defineComponent({
    name: "GlobalAuthenticationPopup",
    components:
    {
        AuthenticationPopup
    },
    emits: ['onAuthenticationSuccessful'],
    props: ['playUnlockAnimation', 'iconOnly', 'focusInput'],
    setup(props, ctx)
    {
        const popupInfo = popups.globalAuth;

        const authPopup: Ref<AuthPopup | null> = ref(null);
        const primaryColor: ComputedRef<string> = computed(() => stores.userPreferenceStore.currentPrimaryColor.value);
        const unlocked: Ref<boolean> = ref(false);

        // TODO: can probably remove this entire component for something more graceful like just a toggle on the main
        // popup
        async function authenticationSuccessful(key: string)
        {
            stores.loadStoreData(key).then(async () =>
            {
                await stores.appStore.recordLogin(key, Date.now());

                playUnlockAnimation();
            });
        }

        function playUnlockAnimation()
        {
            authPopup.value?.playUnlockAnimation();
            unlocked.value = true;

            setTimeout(() =>
            {
                ctx.emit('onAuthenticationSuccessful');
            }, 2500);
        }

        function onCancel()
        {
            stores.popupStore.showAccountSetup(AccountSetupView.SignIn);
        }

        onMounted(() =>
        {
            if (props.playUnlockAnimation === true)
            {
                playUnlockAnimation();
            }
        });

        watch(() => props.playUnlockAnimation, (newValue) =>
        {
            if (newValue)
            {
                playUnlockAnimation();
            }
        });

        return {
            unlocked,
            primaryColor,
            authPopup,
            zIndex: popupInfo.zIndex,
            enterOrder: popupInfo.enterOrder,
            authenticationSuccessful,
            playUnlockAnimation,
            onCancel
        }
    }
})
</script>
<style>
.globalAuthContainer {
    position: absolute;
    width: 100%;
    height: 100%;
    z-index: v-bind(zIndex);
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
    will-change: transform;
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
