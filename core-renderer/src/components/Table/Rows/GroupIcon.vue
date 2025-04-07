<template>
    <div class="vaulticTableContainer__groupIconContainer" 
        :style="{ background: `color-mix(in srgb, ${model.color}, transparent 84%)`}">
        <span class="vaulticTableContainer__groupIconSpan">
            <i v-if="model.icon" :class='`pi ${model.icon} vaulticTableContainer__groupIcon`' :style="{color: model.color}"></i>
            <template v-else class="vaulticTableContainer__groupIcon" :style="{color: model.color}">{{ model.toolTipText[0] }}</template>
        </span>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

export default defineComponent({
	name: "GroupIcon",
	props: ["model", "data"],
	setup(props)
	{

		return {
		};
	},
})
</script>
<style scoped>
</style>
