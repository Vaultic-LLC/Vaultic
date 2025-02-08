<template>
    <VaulticIcon :fontSize="fontSize">
        <IonIcon :name="'cloud-upload-outline'" />
    </VaulticIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticIcon from "./VaulticIcon.vue"
import IonIcon from './IonIcon.vue';

export default defineComponent({
    name: "CloudExportIcon",
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