<template>
    <ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
        :gridDefinition="gridDefinition">
        <TextInputField :label="'Name'" v-model="vaultName" class="vaultView__nameInput" :color="color" />
    </ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';

import { GridDefinition } from '../../Types/Models';
import app from "../../Objects/Stores/AppStore";
import { DisplayVault } from '../../Types/APITypes';

export default defineComponent({
    name: "VaultView",
    components: {
        ObjectView,
        TextInputField
    },
    props: ['creating', 'model'],
    setup(props)
    {
        const refreshKey: Ref<string> = ref("");
        const vaultState: Ref<DisplayVault> = ref(props.model);
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

        const vaultName: Ref<string> = ref('');

        let saveSucceeded: (value: boolean) => void;
        let saveFailed: (value: boolean) => void;

        const gridDefinition: GridDefinition =
        {
            rows: 12,
            rowHeight: 'clamp(10px, 2vw, 50px)',
            columns: 14,
            columnWidth: 'clamp(20px, 4vw, 100px)'
        };

        function onSave()
        {
            app.popups.showRequestAuthentication(color.value, doSave, onAuthCancelled);
            return new Promise((resolve, reject) =>
            {
                saveSucceeded = resolve;
                saveFailed = reject;
            });
        }

        async function doSave(key: string)
        {
            app.popups.showLoadingIndicator(color.value, "Saving Vault");
            if (props.creating)
            {
                handleSaveResponse((await app.createNewVault(key, vaultName.value, true)))
            }
            else
            {
            }
        }

        function handleSaveResponse(succeeded: boolean)
        {
            app.popups.hideLoadingIndicator();
            if (succeeded)
            {
                if (saveSucceeded)
                {
                    saveSucceeded(true);
                }
            }
            else
            {
                if (saveFailed)
                {
                    saveFailed(true);
                }
            }
        }

        function onAuthCancelled()
        {
            saveFailed(false);
        }

        return {
            vaultName,
            color,
            refreshKey,
            gridDefinition,
            onSave,
        };
    },
})
</script>

<style>
.vaultView__nameInput {
    grid-row: 1 / span 2;
    grid-column: 1 / span 4;
}
</style>
