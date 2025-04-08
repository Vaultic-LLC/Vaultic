<template>
    <div class="updateKSFParamsPopup">
        <ObjectPopup :closePopup="onClose" :width="'50%'" :minWidth="'600px'" :minHeight="'480px'">
            <ObjectView :color="color" :creating="false" :defaultSave="onConfirm"
                :buttonText="'Confirm'" :skipOnSaveFunctionality="true">
                <h2>Update Argon2id Parameters</h2>
                <div class="updateKSFParamsPopup__content">
                    <TextInputField :color="color" :label="'Argon2 Iterations'"
                        v-model.number="ksfParams.iterations" :inputType="'number'" :width="'10vw'"
                        :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" 
                        :additionalValidationFunction="enforceArgonIterations" />
                    <TextInputField :color="color" :label="'Argon2 Memory'"
                        v-model.number="ksfParams.memory" :inputType="'number'" :width="'10vw'"
                        :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" 
                        :additionalValidationFunction="enforceArgonMemory" />
                    <TextInputField :color="color" :label="'Argon2 Parallelism'"
                        v-model.number="ksfParams.parallelism" :inputType="'number'" :width="'10vw'"
                        :minWidth="'190px'" :maxWidth="'300px'" :height="'4vh'" :minHeight="'35px'" 
                        :additionalValidationFunction="enforceArgonParallelism" />
                </div>
            </ObjectView>
        </ObjectPopup>
    </div>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import PopupButton from '../InputFields/PopupButton.vue';
import TextInputField from '../InputFields/TextInputField.vue';
import ObjectPopup from "../ObjectPopups/ObjectPopup.vue";
import ObjectView from "../ObjectViews/ObjectView.vue";

import app from "../../Objects/Stores/AppStore";
import { defaultInputTextColor } from '../../Types/Colors';
import { popups } from "../../Objects/Stores/PopupStore";
import { KSFParams } from '@vaultic/shared/Types/Keys';
import { api } from '../../API';
import { defaultHandleFailedResponse } from '../../Helpers/ResponseHelper';

export default defineComponent({
    name: "UpdateKSFParams",
    components:
    {
        TextInputField,
        PopupButton,
        ObjectPopup,
        ObjectView
    },
    emits: ['onConfirm', 'onClose'],
    setup(props, ctx)
    {
        const popupInfo = popups.importSelection;
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const originalKSFParams:KSFParams = JSON.parse(app.userInfo!.ksfParams!);
        const ksfParams: Ref<KSFParams> = ref(JSON.parse(JSON.stringify(originalKSFParams)));

        function enforceArgonIterations(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1 || numb > 4294967295)
            {
                return [false, "Value must be between 1 and 4,294,967,295"];
            }

            return [true, ""];        
        }

        function enforceArgonMemory(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1024 || numb > 2097151)
            {
                return [false, "Value must be between 1024 and 2,097,151"];
            }

            return [true, ""];        
        }

        function enforceArgonParallelism(input: string): [boolean, string]
        {
            const numb: number = Number.parseInt(input);
            if (!numb)
            {
                return [false, "Not a valid number"];
            }

            if (numb < 1 || numb > 16777215)
            {
                return [false, "Value must be between 1 and 16,777,215"];
            }

            return [true, ""];        
        }

        function onClose()
        {
            ctx.emit('onClose');
        }

        async function onConfirm()
        {
            app.popups.showLoadingIndicator(color.value);

            if (ksfParams.value.iterations != originalKSFParams.iterations || 
                ksfParams.value.memory != originalKSFParams.memory || 
                ksfParams.value.parallelism != originalKSFParams.parallelism)
            {
                const response = await api.helpers.server.updateKSFParams(JSON.stringify(ksfParams.value));
                if (!response.success)
                {
                    defaultHandleFailedResponse(response);
                    return;
                }
            }

            app.popups.hideLoadingIndicator();
            app.popups.showToast("Updated", true);
            onClose();
        }

        return {
            color,
            defaultInputTextColor,
            zIndex: popupInfo.zIndex,
            ksfParams,
            enforceArgonIterations,
            enforceArgonMemory,
            enforceArgonParallelism,
            onClose,
            onConfirm
        }
    }
})
</script>

<style>
.updateKSFParamsPopup {
    position: fixed;
    z-index: v-bind(zIndex);
    width: 100%;
    height: 100%;
}

.updateKSFParamsPopup__content {
    display: flex;
    column-gap: 20px;
}
</style>
