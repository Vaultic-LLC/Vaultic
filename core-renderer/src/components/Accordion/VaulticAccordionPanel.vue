<template>
    <AccordionPanel :value="value"
        :pt="{
            root: () =>
            {
                let panelClass = 'vaulticAcordionPanel';
                if (final)
                {
                    panelClass += ' vaulticAccordionPanel--final';
                }

                return panelClass;
            }
        }">
        <slot></slot>
    </AccordionPanel>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

import AccordionPanel from 'primevue/accordionpanel';

export default defineComponent({
    name: "VaulticAccordionPanel",
    components:
    {
        AccordionPanel,
    },
    props: ['value', 'final'],
    setup()
    {
        return {
        };
    },
})
</script>

<style>
.vaulticAccordionPanel--final {
    border: none !important;
}
</style>
