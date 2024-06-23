<template>
    <IconCard :icon="'lock-closed-outline'" :text="'Lock'" @click="lockApp" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import IconCard from "../../IconCard.vue"

import { stores } from '../../../Objects/Stores';

export default defineComponent({
    name: "LockIconCard",
    components:
    {
        IconCard
    },
    setup()
    {
        function lockApp()
        {
            stores.appStore.lock();
        }

        return {
            lockApp
        }
    }
})
</script>
<style></style>
