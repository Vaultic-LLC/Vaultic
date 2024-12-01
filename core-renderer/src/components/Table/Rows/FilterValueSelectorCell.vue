<template>
    <div class="filterValueSelectorCell">
        <TextInputField v-if="inputType == 0" :label="'Value'" :color="color"
            v-model="modelField.value" :fadeIn="true" :isOnWidget="true" :width="'100%'"
            :height="'3.8vh'" :minHeight="'33px'" :minWidth="'100px'" :maxHeight="'49px'" />
        <EnumInputField v-if="inputType == 1" :label="'Value'" :color="color"
            v-model="modelField.value" :optionsEnum="inputEnumType" fadeIn="true" :isOnWidget="true"
            :width="'100%'" :height="'4vh'" :minHeight="'35px'" :minWidth="'100px'" :maxHeight="'50px'" />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import TextInputField from '../../InputFields/TextInputField.vue';
import EnumInputField from '../../InputFields/EnumInputField.vue';

import { Field } from '@vaultic/shared/Types/Fields';
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
        const modelField: Ref<Field<any>> = ref(props.model.value[props.field]);
        const color: ComputedRef<string> = computed(() => props.data["color"]);
        const state: ComputedRef<any> = computed(() => props.state);

        const inputType: ComputedRef<PropertyType> = computed(() => props.state["inputType"]);
        const value: Ref<string> = ref(state.value.value);
        const inputEnumType: ComputedRef<any> = computed(() => state.value.inputEnumType);

        watch(() => inputType.value, () =>
        {
            modelField.value.value = "";
        })

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

</style>
