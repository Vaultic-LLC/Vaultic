<template>
    <ScrollPanel style="width: 100%; height: 100%"
        :pt="{
            content: 'scrollView__content',
            barY: 'scrollView__barY'
        }">
        <slot></slot>
    </ScrollPanel>
</template>

<script lang="ts">
import { ComputedRef, computed, defineComponent } from 'vue';

import ScrollPanel from 'primevue-vaultic/scrollpanel';

export default defineComponent({
	name: 'ScrollView',
    components:
    {
        ScrollPanel
    },
	props: ['color', 'onlyShowOnHover'],
	setup(props)
	{
        const primaryColor: ComputedRef<string> = computed(() => props.color);
        const opacity: ComputedRef<number> = computed(() => props.onlyShowOnHover === false ? 1 : 0);

		return {
            primaryColor,
            opacity
		}
	}
});
</script>

<style scoped>
:deep(.scrollView__content) {
    height: 100% !important;
    width: 100% !important;
}

:deep(.scrollView__barY) {
    width: clamp(5px, .5vw, 9px) !important;
}

:deep(.p-scrollpanel-bar) {
    background: v-bind(primaryColor) !important;
}

:deep(.p-scrollpanel-bar-y) {
    opacity: v-bind(opacity);
}
</style>
