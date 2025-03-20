<template>
    <div class="enumInputCellContainer">
        <EnumInputField v-model="modelField" :label="label" :color="color" :optionsEnum="state['filterConditionType']"
            :width="''" :minWidth="''" @update:modelValue="onUpdate"/>
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref } from 'vue';

import EnumInputField from '../../InputFields/EnumInputField.vue';

export default defineComponent({
	name: "EnumInputCell",
	components:
	{
		EnumInputField
	},
	props: ["model", "field", "data", "state", "isFielded"],
	setup(props)
	{
        const modelField: Ref<any> = ref(props.isFielded === false ? props.model[props.field] : props.model[props.field]);
        const color: ComputedRef<string> = computed(() => props.data["color"]);
        const state: ComputedRef<any> = computed(() => props.state);
        const label: ComputedRef<string> = computed(() => props.data["label"]);

        function onUpdate(val: string)
        {
            state.value.filterType = val;
        }

		return {
            color,
            modelField,
            state,
            label,
            onUpdate
		};
	},
})
</script>
<style scoped>
.enumInputCellContainer {
    width: 100%;
}
</style>
