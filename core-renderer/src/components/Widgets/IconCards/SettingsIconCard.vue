<template>
    <div>
        <IconCard :icon="'settings-outline'" :text="'Settings'" @click="showEditSettingsPopup = true" />
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditSettingsPopup" :closePopup="closeSettings" :minWidth="'800px'"
                    :minHeight="'480px'">
                    <EditSettingsPopup />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from "../../ObjectPopups/ObjectPopup.vue"
import EditSettingsPopup from "../../ObjectPopups/EditPopups/EditSettingsPopup.vue"


export default defineComponent({
    name: "SettingsIconCard",
    components:
    {
        IconCard,
        ObjectPopup,
        EditSettingsPopup
    },
    setup()
    {
        const showEditSettingsPopup: Ref<boolean> = ref(false);

        function closeSettings()
        {
            showEditSettingsPopup.value = false;
        }

        return {
            showEditSettingsPopup,
            closeSettings
        }
    }
})
</script>
<style></style>
