<script lang="ts" setup>
import { RuntimeMessages } from '../../Types/RuntimeMessages';
import syncManager from '../../Utilities/SyncManager';

import ObjectSingleSelect from '../../renderer/components/InputFields/ObjectSingleSelect.vue';
import { ObjectSelectOptionModel } from '../../renderer/Types/Models';
import { DisplayVault } from '@vaultic/shared/Types/Entities';
import app from '../../renderer/Objects/Stores/AppStore';

const selectedVault: Ref<ObjectSelectOptionModel | null> = ref(null);
const vaults: Ref<ObjectSelectOptionModel[]> = ref([]);

const groupColor: ComputedRef<string> = computed(() => app.userPreferences.currentColorPalette.g);

async function setVaults(): Promise<void>
{
    vaults.value = (await browser.runtime.sendMessage({ 
        type: RuntimeMessages.GetVaults,
    }) as DisplayVault[]).map(v => ({
        id: v.vaultID.toString(),
        label: v.name,
        backingObject: v
    })) ?? [];

    selectedVault.value = vaults.value.find(v => v.backingObject?.vaultID == app.currentVault.vaultID) ?? null;
}

function onVaultSelected(model: ObjectSelectOptionModel)
{
    
}

onMounted(async() => 
{
    setVaults();
    syncManager.addAfterSyncCallback(1, setVaults);
});

</script>

<template>
  <div class="vaultDropDownContainer">
    <ObjectSingleSelect :label="'Vault'" :color="groupColor" v-model="selectedVault"
        :options="vaults" :width="'100%'" :minWidth="''" :maxWidth="''" :height="'100%'" :minHeight="''" :maxHeight="''" @update:model-value="onVaultSelected" />
  </div>
</template>

<style scoped>
.vaultDropDownContainer {
    width: 150px;
    height: 30px
}

</style>
