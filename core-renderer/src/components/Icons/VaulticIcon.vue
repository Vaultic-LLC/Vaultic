<template>
    <div class="vaulticIcon">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import app from "../../Objects/Stores/AppStore";

export default defineComponent({
    name: "VaulticIcon",
    components: {
    },
    props: ['fontSize'],
    setup(props)
    {
        const primaryColor: ComputedRef<string> = computed(() => app.userPreferences.currentPrimaryColor.value);
        return {
            primaryColor,
        };
    }
})
</script>
<style>
.vaulticIcon {
    font-size: v-bind(fontSize);
    transition: 300ms;
    display: flex;
    align-items: center;
    justify-content: center;
}

.vaulticIcon:hover {
    color: v-bind(primaryColor);
}
</style>