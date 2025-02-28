<template>
    <AccordionContent
        :pt="{
            content: 'vaulticAccordionContent'
        }">
        <slot></slot>
    </AccordionContent>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

import AccordionContent from 'primevue/accordioncontent';

export default defineComponent({
    name: "VaulticAccordionContent",
    components:
    {
        AccordionContent,
    },
    props: ['value'],
    setup()
    {
        return {
        };
    },
})
</script>

<style>
.vaulticAccordionContent {
    background: var(--app-color)!important;
    padding: 10px !important;
}
</style>
