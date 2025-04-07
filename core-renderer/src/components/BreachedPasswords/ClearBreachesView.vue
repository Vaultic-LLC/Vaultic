<template>
    <div class="clearBreachesPopup">
        <h2>Clear Vault Data Breaches</h2>
    </div>
    <div class="clearBreachesPopup__content">
        <ObjectView :color="color" :creating="false" :buttonText="'Clear'" :defaultSave="deleteConfirm" :skipOnSaveFunctionality="true">
            <VaulticFieldset :centered="true">
                <ObjectMultiSelect :label="'Vaults to Clear'" :color="color" v-model="selectedVaults" :options="allVaults" 
                    :width="'50%'" :maxWidth="''" />
            </VaulticFieldset>
        </ObjectView>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, onMounted, Ref, ref } from 'vue';

import ObjectView from '../ObjectViews/ObjectView.vue';
import VaulticFieldset from '../InputFields/VaulticFieldset.vue';
import ObjectMultiSelect from '../InputFields/ObjectMultiSelect.vue';
import app from '../../Objects/Stores/AppStore';
import { ObjectSelectOptionModel } from '../../Types/Models';
import { UserVaultIDAndVaultID } from '@vaultic/shared/Types/Entities';
import { useConfirm } from 'primevue-vaultic/useconfirm';

export default defineComponent({
    name: "ClearBreachesView",
    components:
    {
        ObjectView,
        VaulticFieldset,
        ObjectMultiSelect
    },
    setup()
    {
        const color: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        const selectedVaults: Ref<ObjectSelectOptionModel[]> = ref([]);
        const allVaults: Ref<ObjectSelectOptionModel[]> = ref([]);

        async function onClear()
        {
            app.popups.showLoadingIndicator(color.value, "Clearing Data Breaches");

            const vaultIDs: number[] = selectedVaults.value.map(v => v.backingObject.vaultID);
            const success = await app.runAsAsyncProcess(() => app.vaultDataBreaches.clearDataBreaches(vaultIDs));

            if (success)
            {
                app.popups.showToast("Clear Succeeded", true);
            }
            else
            {
                app.popups.showToast("Clear Failed", false);
            }

            app.popups.hideLoadingIndicator();
            app.popups.hideClearDataBreachesPopup();
        }

        const confirm = useConfirm();
        const deleteConfirm = async () => 
        {
            confirm.require({
                message: `Are you sure you want to clear all Data Breaches for the selected Vaults?`,
                header: `Clear Data Breaches`,
                icon: 'pi pi-info-circle',
                rejectLabel: 'Cancel',
                rejectProps: {
                    label: 'Cancel',
                    severity: 'secondary',
                    outlined: true
                },
                acceptProps: {
                    label: 'Clear',
                    severity: 'danger'
                },
                accept: () => {
                    onClear();
                },
                reject: () => { }
            });
        };

        onMounted(() =>
        {
            allVaults.value = app.userVaults.value.filter(v => !v.isReadOnly).map(v => 
            {
                const ids: UserVaultIDAndVaultID = 
                {
                    userVaultID: v.userVaultID,
                    vaultID: v.vaultID
                };

                const model: ObjectSelectOptionModel =
                {
                    id: v.vaultID.toString(),
                    label: v.name,
                    backingObject: ids
                };

                return model;
            });
        });
        
        return {
            color,
            selectedVaults,
            allVaults,
            deleteConfirm
        }
    }
});

</script>
<style>
.clearBreachesPopup {
    height: 5%;
    display: flex;
    justify-content: center;
    color: white;
    animation: fadeIn 1s linear forwards;
    margin: 5%;
    margin-bottom: 0;
    font-size: clamp(15px, 1vw, 25px);
}

.clearBreachesPopup__content {
	position: absolute;
	top: 15%;
	width: 100%;
	height: 85%;
}
</style>
