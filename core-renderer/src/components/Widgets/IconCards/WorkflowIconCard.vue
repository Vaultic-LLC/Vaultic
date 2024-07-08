<template>
    <div>
        <IconCard :icon="'construct-outline'" :text="'Workflows'" @click="showWorkflowPopup = true" />
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showWorkflowPopup" :closePopup="closePopup" :minWidth="'800px'" :minHeight="'480px'">
                    <WorkflowPopup />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from "../../ObjectPopups/ObjectPopup.vue"
import WorkflowPopup from "../../ObjectPopups/WorkflowPopup.vue"

export default defineComponent({
    name: "WorkflowIconCard",
    components:
    {
        IconCard,
        ObjectPopup,
        WorkflowPopup
    },
    setup()
    {
        const showWorkflowPopup: Ref<boolean> = ref(false);
        function closePopup()
        {
            showWorkflowPopup.value = false;
        }

        return {
            showWorkflowPopup,
            closePopup
        }
    }
})
</script>
<style></style>
