<template>
    <div class="vaulticContent">
        <PasswordValueTable :key="key" class="passwordValueTable" />
    </div>
</template>

<script lang="ts" setup>
import PasswordValueTable from '@/lib/renderer/components/Table/PasswordValueTable.vue';
import syncManager from '@/lib/Utilities/SyncManager';

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
    padding: 20px 10px 10px 10px;
}

.passwordValueTable {
    height: 100%;
}

</style>
