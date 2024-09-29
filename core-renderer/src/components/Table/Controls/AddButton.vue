<template>
    <VaulticButton :color="color" :minSize="minSize" :preferredSize="preferredSize" :maxSize="maxSize">
        <ion-icon class="addTableItemButtonIcon" name="add-outline"></ion-icon>
    </VaulticButton>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticButton from "../../InputFields/VaulticButton.vue"

export default defineComponent({
    name: "AddButton",
    props: ['color', 'minSize', 'preferredSize', 'maxSize'],
    components:
    {
        VaulticButton
    },
    setup()
    {
        return {

        }
    }
})
</script>

<style></style>
