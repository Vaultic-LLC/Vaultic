<template>
    <AccordionHeader 
        :pt="{
            root: 'vaulticAccordionHeader'
        }">
            {{ title }}
    </AccordionHeader>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

import AccordionHeader from 'primevue/accordionheader';

export default defineComponent({
    name: "VaulticAccordionHeader",
    components:
    {
        AccordionHeader,
    },
    props: ['title'],
    setup()
    {
        return {
        };
    },
})
</script>

<style>
.vaulticAccordionHeader {
    background: var(--app-color) !important;
    border: 1px solid #4d4b4b !important;
    padding: clamp(9px, 0.8vw, 18px) !important;
    font-size: clamp(8px, 0.9vw, 16px) !important;
}
</style>
