<template>
    <div>
        <IconCard :icon="'build-outline'" :text="'Workflows'" @click="showWorkflowPopup = true" />
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showWorkflowPopup" :closePopup="closePopup" :width="'50%'" :minWidth="'600px'" :minHeight="'480px'">
                    <WorkflowPopup />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from "../../ObjectPopups/ObjectPopup.vue"
import WorkflowPopup from "../../ObjectPopups/WorkflowPopup.vue"
import app from '../../../Objects/Stores/AppStore';

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

        watch(() => app.loadedUser.value, () =>
        {
            showWorkflowPopup.value = false;
        });

        return {
            showWorkflowPopup,
            closePopup
        }
    }
})
</script>
<style></style>
