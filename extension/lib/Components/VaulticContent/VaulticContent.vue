<template>
    <div class="vaulticContent">
        <PasswordValueTable :key="key" class="passwordValueTable" />
    </div>
</template>

<script lang="ts" setup>
import syncManager from '@/lib/Utilities/SyncManager';

import PasswordValueTable from '@/lib/renderer/components/Table/PasswordValueTable.vue';

const key = ref('');

onMounted(async() => 
{
    syncManager.addAfterSyncCallback(2, async () => {
        key.value = Date.now().toString();
    });
});
</script>

<style scoped>
.vaulticContent {
    width: 100%;
    height: 90%;
    padding: 0px 10px 10px 10px;
    overflow: hidden;
}

.passwordValueTable {
    height: 94%;
    margin-top: 10px;
}
</style>
