<template>
    <VaulticIcon :fontSize="fontSize">
        <ion-icon name="trash-bin-outline"></ion-icon>
    </VaulticIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticIcon from "./VaulticIcon.vue"

export default defineComponent({
    name: "ArchivedIcon",
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