<template>
    <div class="breachedPasswordPopup">
        <ObjectPopup :height="'35%'" :width="'20%'" :minHeight="'300px'" :minWidth="'230px'" :preventClose="false"
            :showPulsing="false" :closePopup="closePopup">
            <div class="breachedPasswordPopup__content">
                <h2 class="breachedPasswordPopup__title">Breached Data</h2>
                <div class="breachedPasswordPopup__infoRows">
                    <ul class="breachedPasswordPopup__infoRowsList">
                        <li class="breachedPasswordPopup__listRow">
                            <div class="breachedPasswordPopup__row">
                                <div class="breachedPasswordPopup__rowTitle">Domain:</div>
                                <div class="breachedPasswordPopup__rowValue">{{ password?.d }}</div>
                            </div>
                        </li>
                        <li class="breachedPasswordPopup__listRow">
                            <div class="breachedPasswordPopup__row">
                                <div class="breachedPasswordPopup__rowTitle">Date:</div>
                                <div class="breachedPasswordPopup__rowValue">{{ dateString }}</div>
                            </div>
                        </li>
                        <li class="breachedPasswordPopup__listRow">
                            <div class="breachedPasswordPopup__row">
                                <div class="breachedPasswordPopup__rowTitle">Data:</div>
                                <div class="breachedPasswordPopup__rowValue">{{ vaultDataBreach?.BreachedDataTypes }}
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                <ButtonLink class="breachedPasswordPopup__link" :color="primaryColor" :text="'What to do after a data breach'"
                    :fontSize="'clamp(10px, 0.7vw, 20px)'" @onClick="whatToDoAfterADataBreach" />
                <div class="breachedPasswordPopup__footer" v-if="!readonly">
                    <div class="breachedPasswordPopup__dismissMessage">
                        Once all necessary precautions have been taken you can click 'Dismiss Breach'
                    </div>
                    <PopupButton :color="primaryColor" :fadeIn="false" :disabled="disabled" :text="'Dismiss Breach'"
                        :width="'7vw'" :minWidth="'100px'" :maxWidth="'175px'" :height="'3vh'" :minHeight="'25px'"
                        :maxHeight="'45px'" :fontSize="'clamp(11px, 0.8vw, 20px)'" @onClick="onDismissBreach" />
                </div>
            </div>
        </ObjectPopup>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, onMounted, ref, watch } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';
import ObjectPopup from '../ObjectPopups/ObjectPopup.vue';
import ButtonLink from '../InputFields/ButtonLink.vue';

import app from "../../Objects/Stores/AppStore";
import { ReactivePassword } from '../../Objects/Stores/ReactivePassword';
import { popups } from '../../Objects/Stores/PopupStore';
import { VaultDataBreach } from "@vaultic/shared/Types/ClientServerTypes";

export default defineComponent({
    name: "DeviceView",
    components:
    {
        ObjectPopup,
        PopupButton,
        ButtonLink
    },
    emits: ['onClose'],
    props: ['passwordID'],
    setup(props, ctx)
    {
        const popupInfo = popups.breachedPasswords;

        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const vaultDataBreach: Ref<VaultDataBreach | undefined> = ref(undefined);
        const password: Ref<ReactivePassword | undefined> = ref(undefined);
        const disabled: Ref<boolean> = ref(false);
        const dateString: Ref<string> = ref('');

        const readonly: ComputedRef<boolean> = computed(() => app.currentVault.isReadOnly.value);

        function closePopup()
        {
            ctx.emit('onClose');
        }

        async function onDismissBreach()
        {
            app.popups.showLoadingIndicator(primaryColor.value);
            disabled.value = true;

            const succeeded = await app.runAsAsyncProcess(() => app.vaultDataBreaches.dismissVaultDataBreach(vaultDataBreach.value?.VaultDataBreachID!));
            app.popups.hideLoadingIndicator();

            if (succeeded)
            {
                app.popups.showToast("Dismissed Breach", true);
                ctx.emit('onClose');
            }

            disabled.value = false;
        }

        function whatToDoAfterADataBreach()
        {
            window.open('https://www.vaultic.org/post/what-to-do-after-a-data-breach');
        }

        onMounted(() =>
        {
            const dataBreach: VaultDataBreach | undefined = app.vaultDataBreaches.vaultBreachesByPasswordID.value.get(props.passwordID);
            if (dataBreach)
            {
                vaultDataBreach.value = dataBreach;
                const dateBreached = new Date(vaultDataBreach.value.BreachedDate);
                dateString.value = `${dateBreached.getUTCMonth() + 1}/${dateBreached.getUTCDay() + 1}/${dateBreached.getUTCFullYear()}`;
            }

            const foundPassword: ReactivePassword | undefined = app.currentVault.passwordStore.getState().p[props.passwordID];
            if (foundPassword)
            {
                password.value = foundPassword;
            }
        });

        watch(() => app.isOnline, (newValue) =>
        {
            if (!newValue)
            {
                ctx.emit('onClose');
            }
        });

        return {
            primaryColor,
            vaultDataBreach,
            password,
            disabled,
            dateString,
            zIndex: popupInfo.zIndex,
            readonly,
            closePopup,
            onDismissBreach,
            whatToDoAfterADataBreach
        }
    }
})
</script>

<style>
.breachedPasswordPopup {
    width: 100%;
    height: 100%;
    top: 0%;
    position: fixed;
    z-index: v-bind(zIndex);
}

.breachedPasswordPopup__content {
    color: white;
    width: 80%;
    margin: auto;
    margin-top: 5%;
    display: flex;
    flex-direction: column;
    height: 95%;
    align-items: center;
    row-gap: clamp(5px, 0.5vw, 15px);
}

.breachedPasswordPopup__title {
    font-size: clamp(15px, 1.5vw, 25px);
}

.breachedPasswordPopup__infoRows {
    display: flex;
    flex-direction: column;
}

.breachedPasswordPopup__listRow {
    margin: clamp(5px, 0.6vw, 15px) 0px;
}

.breachedPasswordPopup__listRow:first-child {
    margin-top: 0;
}

.breachedPasswordPopup__listRow:last-child {
    margin-bottom: 0;
}

.breachedPasswordPopup__infoRowsList {
    padding: 0;
    margin: 0;
}

.breachedPasswordPopup__row {
    display: flex;
    font-size: clamp(10px, 0.7vw, 20px);
}

.breachedPasswordPopup__rowTitle {
    width: 30%;
    text-align: left;
}

.breachedPasswordPopup__rowValue {
    width: 70%;
    text-align: left;
}

.breachedPasswordPopup__message {
    width: 80%;
    font-size: clamp(10px, 0.7vw, 20px);
    font-weight: bold;
}

.breachedPasswordPopup__link {
    flex-grow: 1;
}

.breachedPasswordPopup__footer {
    width: 95%;
    font-size: clamp(10px, 0.7vw, 20px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 5%;
    row-gap: clamp(7px, 0.4vw, 10px);
}
</style>
