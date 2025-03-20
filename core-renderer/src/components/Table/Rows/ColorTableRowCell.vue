<template>
    <div class="colorTableRowValueContainer">
        <ColorPicker v-model="pickedColor" :disabled="true"
            :pt="{
                root: 'colorPickerIcon',
                preview: {
                    class: 'colorTableRowValueContainer__colorPreview'
                }
            }" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from 'vue';

import ColorPicker from 'primevue-vaultic/colorpicker';

export default defineComponent({
	name: "ColorTableRowCell",
	components:
	{
		ColorPicker
	},
	props: ["model", "data"],
	setup(props)
	{
        const pickedColor: ComputedRef<string> = computed(() => props.model.color);

		return {
            pickedColor
		};
	},
})
</script>
<style scoped>
:deep(.colorTableRowValueContainer__colorPreview) {
    height: clamp(15px, 1vw, 24px) !important;
    width: clamp(15px, 1vw, 24px) !important;
}
</style>
