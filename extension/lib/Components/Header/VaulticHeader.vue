<template>
    <div class="vaulticHeader">
      <img class="vaulticHeader__logo" :src="Logo" alt="Logo" />
      <div class="vaulticHeader__content">
          <div class="vaulticHeader__dropdowns">
              <VaultDropDown />
              <FilterDropDown />
          </div>
          <div class="vaulticHeader__actions">
              <VaulticButton @click="lock" :color="primaryColor" :preferredSize="'25px'" :fontSize="'15px'" :tooltipMessage="'Lock'">
                  <IonIcon :name="'lock-closed-outline'"/>
              </VaulticButton>
              <VaulticButton @click="sync" :color="primaryColor" :preferredSize="'25px'" :fontSize="'15px'" :tooltipMessage="'Sync'">
                  <IonIcon :name="'sync-outline'" />
              </VaulticButton>
              <OverlayBadge v-if="vaultsWithOtherBreaches > 0" :value="vaultsWithOtherBreaches" :severity="'danger'" :size="'small'" 
                :pt="{
                    pcBadge: {
                        root: 'vaulticHeader__notificationsBadge'
                    }
                }">
                <VaulticButton @click="showNotifications" :color="primaryColor" :preferredSize="'25px'" :fontSize="'15px'" :tooltipMessage="'Notifications'">
                    <IonIcon :name="'notifications-outline'" />
                </VaulticButton>
              </OverlayBadge>
              <VaulticButton v-else @click="showNotifications" :color="primaryColor" :preferredSize="'25px'" :fontSize="'15px'" :tooltipMessage="'Notifications'">
                    <IonIcon :name="'notifications-outline'" />
              </VaulticButton>
              <OverlayBadge v-if="app.activePasswordValuesTable == DataType.Passwords && thisVaultBreaches > 0" :value="thisVaultBreaches" :severity="'danger'" :size="'small'" 
                :pt="{
                    pcBadge: {
                        root: 'vaulticHeader__notificationsBadge'
                    }
                }">
                <VaulticButton :active="isBreachedPasswordsActive" @click="toggleBreachedPasswords" :color="primaryColor" :preferredSize="'25px'" :fontSize="'15px'" :tooltipMessage="'Breached Passwords'">
                    <IonIcon :name="'alert-outline'" />
                </VaulticButton>
              </OverlayBadge>
          </div>
      </div>
    </div>
</template>

<script lang="ts" setup>
import Logo from '@/src/Vaultic_Primary_Color.png';
import app from '@/lib/renderer/Objects/Stores/AppStore';

import VaultDropDown from './VaultDropDown.vue';
import FilterDropDown from './FilterDropDown.vue';
import VaulticButton from '@/lib/renderer/components/InputFields/VaulticButton.vue';
import IonIcon from '@/lib/renderer/components/Icons/IonIcon.vue';
import { RuntimeMessages } from '@/lib/Types/RuntimeMessages';
import syncManager from '@/lib/Utilities/SyncManager';
import OverlayBadge from 'primevue/overlaybadge';
import { AtRiskType, DataType } from '@/lib/renderer/Types/DataTypes';

const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
const thisVaultBreaches: Ref<number> = ref(app.vaultDataBreaches.vaultDataBreachCountByVaultID[app.currentVault.vaultID] ?? 0);
const vaultsWithOtherBreaches: Ref<number> = ref(Object.keys(app.vaultDataBreaches.vaultDataBreachCountByVaultID).filter(v => v != app.currentVault.vaultID.toString()).length);
const isBreachedPasswordsActive: ComputedRef<boolean> = computed(() => app.currentVault.passwordStore.activeAtRiskPasswordType == AtRiskType.Breached);

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
    else
    {
        app.popups.showAlert("Unable to Sync", "An unknown error occurred. Please try again.", true);
    }
}

function showNotifications()
{

}

function toggleBreachedPasswords()
{
    app.currentVault.passwordStore.toggleAtRiskType(DataType.Passwords, AtRiskType.Breached);
}

watch(() => app.vaultDataBreaches.vaultDataBreaches.length, () =>
{
    thisVaultBreaches.value = app.vaultDataBreaches.vaultDataBreachCountByVaultID[app.currentVault.vaultID] ?? 0;
    vaultsWithOtherBreaches.value = Object.keys(app.vaultDataBreaches.vaultDataBreachCountByVaultID).filter(v => v != app.currentVault.vaultID.toString()).length;
});

</script>
<style scoped>
.vaulticHeader {
    width: 100%;
    padding: 10px;
    position: relative;
}

.vaulticHeader__dropdowns {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.vaulticHeader__logo {
    position: absolute;
    top: 5px;
    left: 50%;
    transform: translateX(-50%);
    object-fit: contain;
    height: 50%;
}

.vaulticHeader__content {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
}

.vaulticHeader__actions {
    display: flex;
    gap: 10px;
    height: 20px;
}

:deep(.vaulticHeader__notificationsBadge) {
    background: red !important;
    color: white !important;
}
</style>
