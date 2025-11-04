<template>
    <VaulticButton :color="color" :minSize="minSize" :preferredSize="preferredSize" :maxSize="maxSize" :tooltipMessage="tooltipMessage" >
        <IonIcon class="addTableItemButtonIcon" :name="'add-outline'" :tooltip="'Add'" />
    </VaulticButton>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import VaulticButton from "../../InputFields/VaulticButton.vue"
import IonIcon from '../../Icons/IonIcon.vue';

export default defineComponent({
    name: "AddButton",
    props: ['color', 'minSize', 'preferredSize', 'maxSize', 'tooltipMessage'],
    components:
    {
        VaulticButton,
        IonIcon
    },
    setup()
    {
        return {

        }
    }
})
</script>

<style></style>
