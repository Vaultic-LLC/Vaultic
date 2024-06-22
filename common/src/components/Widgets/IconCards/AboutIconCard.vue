<template>
    <div>
        <IconCard :icon="'alert-circle-outline'" :text="'About'" @click="showAboutPopup = true" />
        <Teleport to="#body">
            <Transition name="fade">
                <ObjectPopup v-if="showAboutPopup" :closePopup="onAboutPopupclose" :minWidth="'800px'"
                    :minHeight="'480px'">
                    <AboutPopup />
                </ObjectPopup>
            </Transition>
        </Teleport>
    </div>
</template>

<script lang="ts">
import { Ref, defineComponent, ref } from 'vue';

import IconCard from "../../IconCard.vue"
import ObjectPopup from '../../../components/ObjectPopups/ObjectPopup.vue';
import AboutPopup from '../../../components/ObjectPopups/AboutPopup.vue';

export default defineComponent({
    name: "AboutIconCard",
    components:
    {
        IconCard,
        ObjectPopup,
        AboutPopup
    },
    setup()
    {
        const showAboutPopup: Ref<boolean> = ref(false);

        function onAboutPopupclose()
        {
            showAboutPopup.value = false;
        }

        return {
            showAboutPopup,
            onAboutPopupclose
        }
    }
})
</script>
<style></style>
