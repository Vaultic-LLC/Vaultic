<template>
    <VaulticIcon :fontSize="fontSize">
        <ion-icon name="person-circle-outline"></ion-icon>
    </VaulticIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticIcon from "./VaulticIcon.vue"

export default defineComponent({
    name: "CloudExportIcon",
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