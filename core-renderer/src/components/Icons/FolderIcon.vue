<template>
    <VaulticIcon :fontSize="fontSize">
        <ion-icon name="folder-outline"></ion-icon>
    </VaulticIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticIcon from "./VaulticIcon.vue"

export default defineComponent({
    name: "FolderIcon",
    components: {
        VaulticIcon
    },
    props: ["fontSize"],
    setup()
    {
        return {
        };
    }
})
</script>
<style></style>