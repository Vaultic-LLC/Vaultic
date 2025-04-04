<template>
    <div class="deviceView__header">
        <h2 v-if="creating">Register This Device</h2>
        <h2 v-else>Edit Device</h2>
    </div>
    <div class="deviceView__content">
        <ObjectView :title="'Device'" :buttonText="buttonText" :color="color" :creating="false" :defaultSave="onSave" :key="refreshKey"
            :skipOnSaveFunctionality="true">
            <VaulticFieldset :centered="true">
                <TextInputField :color="color" :label="'Name'"
                    v-model="deviceState.Name" :width="'50%'" :maxWidth="''" :maxHeight="''" />
            </VaulticFieldset>
            <VaulticFieldset :centered="true">
                <TextInputField :color="color" :label="'Model'" :disabled="true" v-model="deviceState.Model"
                    :width="'50%'" :maxWidth="''" :maxHeight="''" />
            </VaulticFieldset>
            <VaulticFieldset :centered="true">
                <TextInputField :color="color" :label="'Version'" :disabled="true" v-model="deviceState.Version"
                    :width="'50%'" :maxWidth="''" :maxHeight="''" />
            </VaulticFieldset>
            <VaulticFieldset :centered="true">
                <EnumInputField :color="color" :label="'Requires MFA'" :optionsEnum="DisplayRequiresMFA" v-model="requiresMFA"
                    :width="'50%'" :maxWidth="''" :maxHeight="''" />
            </VaulticFieldset>
        </ObjectView>
    </div>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, onMounted, inject } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';

import app from "../../Objects/Stores/AppStore";
import { DisplayRequiresMFA, ClientDevice, requiresMFAToDisplay, displayRequiresMFAToRequiresMFA, defaultClientDevice } from '@vaultic/shared/Types/Device';
import { ClosePopupFuncctionKey } from '../../Constants/Keys';

export default defineComponent({
    name: "PasswordView",
    components: {
        ObjectView,
        TextInputField,
        VaulticFieldset,
        EnumInputField
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const deviceState: Ref<ClientDevice> = ref(props.model ? JSON.parse(JSON.stringify(props.model)) : defaultClientDevice());
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.p.p);

        const buttonText: ComputedRef<string> = computed(() => props.creating ? 'Register': 'Save');
        const requiresMFA: Ref<DisplayRequiresMFA> = ref(requiresMFAToDisplay(deviceState.value.RequiresMFA));

        const closePopupFunction: ComputedRef<(saved: boolean) => void> | undefined = inject(ClosePopupFuncctionKey);

        async function onSave()
        {
            app.popups.showLoadingIndicator(color.value, props.creating ? 'Registering Device' : 'Saving Device');

            deviceState.value.RequiresMFA = displayRequiresMFAToRequiresMFA(requiresMFA.value);
            let succeeded: boolean = false;

            if (props.creating)
            {
                succeeded = await app.devices.addDevice(deviceState.value);
            }
            else
            {
                succeeded = await app.devices.updateDevice(deviceState.value);
            }

            if (succeeded)
            {
                app.popups.showToast(props.creating ? 'Registered' : 'Saved Successfully', true);
                closePopupFunction?.value?.(true);
            }
            else
            {
                app.popups.showToast(props.creating ? 'Register Failed' : 'Saved Failed', false);
                closePopupFunction?.value?.(false);
            }

            app.popups.hideLoadingIndicator();
        }

        onMounted(async() =>
        {
            if (props.creating)
            {
                const deviceInfo = app.devices.currentDeviceInfo;
                if (!deviceInfo)
                {
                    app.popups.showAlert("Error", "Unable to load device info. If the issue persists", true);
                    app.popups.hideDevicePopup();

                    return;
                }

                deviceState.value.Name = deviceInfo.deviceName;
                deviceState.value.Model = deviceInfo.model;
                deviceState.value.Version = deviceInfo.version;
            }
        });

        return {
            color,
            deviceState,
            refreshKey,
            DisplayRequiresMFA,
            requiresMFA,
            buttonText,
            onSave,
        };
    },
})
</script>

<style>
.deviceView__header {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.deviceView__content {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
