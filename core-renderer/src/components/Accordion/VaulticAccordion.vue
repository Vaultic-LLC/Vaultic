<template>
    <Accordion :value="value"
        :pt="{
            root: 'vaulticAccordion'
        }">
        <slot></slot>
    </Accordion>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

import Accordion from 'primevue-vaultic/accordion';

export default defineComponent({
    name: "VaulticAccordion",
    components:
    {
        Accordion,
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
.vaulticAccordion {
    width: 80%;
}
</style>
