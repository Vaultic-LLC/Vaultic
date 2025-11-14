<script lang="ts" setup>
import Logo from '@/src/Vaultic_Primary_Color.png';
import app from '@/lib/renderer/Objects/Stores/AppStore';

import VaultDropDown from './VaultDropDown.vue';
import VaulticButton from '@/lib/renderer/components/InputFields/VaulticButton.vue';
import IonIcon from '@/lib/renderer/components/Icons/IonIcon.vue';
import { RuntimeMessages } from '@/lib/Types/RuntimeMessages';
import syncManager from '@/lib/Utilities/SyncManager';

const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);

function lock()
{
    app.lock(false, false, false);
    browser.runtime.sendMessage({ type: RuntimeMessages.Lock });
}

async function sync()
{
    const success = await browser.runtime.sendMessage({ type: RuntimeMessages.Sync });
    if (success)
    {
        syncManager.syncData();
    }
}

function openSettings()
{

}
</script>

<template>
  <div class="vaulticHeader">
    <VaultDropDown />
    <img class="vaulticHeader__logo" :src="Logo" alt="Logo" />
    <div class="vaulticHeader__actions">
        <VaulticButton @click="lock" :color="primaryColor" :preferredSize="'20px'" :fontSize="'15px'" :tooltipMessage="'Lock'">
            <IonIcon :name="'lock-closed-outline'"/>
        </VaulticButton>
        <VaulticButton @click="sync" :color="primaryColor" :preferredSize="'20px'" :fontSize="'15px'" :tooltipMessage="'Sync'">
            <IonIcon :name="'sync-outline'" />
        </VaulticButton>
        <VaulticButton @click="openSettings" :color="primaryColor" :preferredSize="'20px'" :fontSize="'15px'" :tooltipMessage="'Settings'">
            <IonIcon :name="'settings-outline'" />
        </VaulticButton>
    </div>
  </div>
</template>

<style scoped>
.vaulticHeader {
    width: 100%;
    height: 10%;
    display: flex;
    justify-content: space-between;
    padding: 10px
}

.vaulticHeader__logo {
    object-fit: contain;
}

.vaulticHeader__actions {
    display: flex;
    gap: 10px;
}

</style>
