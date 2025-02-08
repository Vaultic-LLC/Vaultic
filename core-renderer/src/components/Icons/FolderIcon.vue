<template>
    <VaulticIcon :fontSize="fontSize">
        <IonIcon :name="'folder-outline'" />
    </VaulticIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticIcon from "./VaulticIcon.vue"
import IonIcon from './IonIcon.vue';

export default defineComponent({
    name: "FolderIcon",
    components: {
        VaulticIcon,
        IonIcon
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