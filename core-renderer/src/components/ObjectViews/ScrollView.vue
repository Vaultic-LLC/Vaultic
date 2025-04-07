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
	props: ['color'],
	setup(props)
	{
        const primaryColor: ComputedRef<string> = computed(() => props.color);

		return {
            primaryColor
		}
	}
});
</script>

<style>
.scrollView__content {
    height: 100% !important;
    width: 100% !important;
}

.scrollView__barY {
    width: clamp(5px, .5vw, 9px) !important;
}

.p-scrollpanel-bar {
    background: v-bind(primaryColor) !important;
}
</style>
