<template>
    <div class="filterValueSelectorCell">
        <TextInputField v-if="inputType == 0" :label="'Value'" :color="color"
            v-model="modelField" :fadeIn="false" :isOnWidget="true" :width="''"
            :minWidth="'100px'" :maxWidth="''" />
        <EnumInputField v-if="inputType == 1" :label="'Value'" :color="color"
            v-model="modelField" :optionsEnum="inputEnumType" :fadeIn="false" :isOnWidget="true"
            :width="''" :minWidth="'100px'" :maxWidth="''" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import TextInputField from '../../InputFields/TextInputField.vue';
import EnumInputField from '../../InputFields/EnumInputField.vue';

import { PropertyType } from '../../../Types/Fields';

export default defineComponent({
	name: "FilterValueSelectorCell",
	components:
	{
        TextInputField,
		EnumInputField
	},
	props: ["model", "field", "data", "state"],
	setup(props)
	{
        const modelField: Ref<any> = ref(props.model[props.field]);
        const color: ComputedRef<string> = computed(() => props.data["color"]);
        const state: ComputedRef<any> = computed(() => props.state);

        const inputType: ComputedRef<PropertyType> = computed(() => props.state["inputType"]);
        const value: Ref<string> = ref(state.value.value);
        const inputEnumType: ComputedRef<any> = computed(() => state.value.inputEnumType);

        watch(() => inputType.value, () =>
        {
            modelField.value.value = "";
        });

		return {
            color,
            modelField,
            state,
            inputType,
            value,
            inputEnumType
		};
	},
})
</script>
<style scoped>
.filterValueSelectorCell {
    width: 100%;
}
</style>
