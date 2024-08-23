<template>
    <div>
        <IconCard :icon="'settings-outline'" :text="'Settings'" @click="showEditSettingsPopup = true" />
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showEditSettingsPopup" :closePopup="closeSettings" :minWidth="'800px'"
                    :minHeight="'480px'">
                    <EditSettingsPopup :model="settingsState" />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from "../../ObjectPopups/ObjectPopup.vue"
import EditSettingsPopup from "../../ObjectPopups/EditPopups/EditSettingsPopup.vue"

import app, { AppSettings } from "../../../Objects/Stores/AppStore";

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
        const settingsState: ComputedRef<AppSettings> = computed(() => app.settings);

        function closeSettings()
        {
            showEditSettingsPopup.value = false;
        }

        return {
            settingsState,
            showEditSettingsPopup,
            closeSettings
        }
    }
})
</script>
<style></style>
