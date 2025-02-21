<template>
    <div>
        <IconCard :icon="'settings-outline'" :text="'Settings'" @click="showEditSettingsPopup = true" />
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditSettingsPopup" :closePopup="closeSettings" :width="'50%'" :minWidth="'600px'" :minHeight="'480px'">
                    <EditSettingsPopup />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref, watch } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from "../../ObjectPopups/ObjectPopup.vue"
import EditSettingsPopup from "../../ObjectPopups/EditPopups/EditSettingsPopup.vue"
import app from '../../../Objects/Stores/AppStore';

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

        watch(() => app.loadedUser.value, () =>
        {
            showEditSettingsPopup.value = false;
        });

        return {
            showEditSettingsPopup,
            closeSettings
        }
    }
})
</script>
<style></style>
