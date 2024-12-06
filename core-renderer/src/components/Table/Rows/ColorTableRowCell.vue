<template>
    <div class="colorTableRowValueContainer">
        <ColorPicker v-model="pickedColor" :disabled="true" />    
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import ColorPicker from 'primevue/colorpicker';

export default defineComponent({
	name: "ColorTableRowCell",
	components:
	{
		ColorPicker
	},
	props: ["model", "data"],
	setup(props)
	{
        const pickedColor: ComputedRef<string> = computed(() => props.model.value.color.value);

		return {
            pickedColor
		};
	},
})
</script>
<style scoped>

</style>
