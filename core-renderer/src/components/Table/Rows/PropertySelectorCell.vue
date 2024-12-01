<template>
    <div class="propertySelectorCellContainer">
        <PropertySelectorInputField v-model="modelField.value" :label="label" :color="color" :displayFieldOptions="displayFieldOptions" 
            @propertyTypeChanged="onPropertyTypeChanged"  />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import PropertySelectorInputField from '../../InputFields/PropertySelectorInputField.vue';
import { Field } from '@vaultic/shared/Types/Fields';
import { DisplayField, PropertyType } from '../../../Types/Fields';
import { EqualFilterConditionType, FilterConditionType } from '../../../Types/DataTypes';

export default defineComponent({
	name: "PropertySelectorCell",
	components:
	{
		PropertySelectorInputField
	},
	props: ["model", "field", "data", "state"],
	setup(props)
	{
        const modelField: Ref<Field<any>> = ref(props.model.value[props.field]);
        const displayFieldOptions: Ref<DisplayField[]> = computed(() => props.data["properties"]);
        const color: ComputedRef<string> = computed(() => props.data["color"]);
        const state: ComputedRef<any> = computed(() => props.state);
        const label: ComputedRef<string> = computed(() => props.data["label"]);

        function onPropertyTypeChanged(type: PropertyType, typeEnum?: { [key: string]: string | number })
        {
            switch (type)
            {
                case PropertyType.String:
                    state.value.value = "";
                    state.value.inputType = PropertyType.String;
                    state.value.filterConditionType = FilterConditionType;
                    state.value.inputEnumType = undefined;
                    break;
                case PropertyType.Enum:
                    state.value.value = "";
                    state.value.inputType = PropertyType.Enum;
                    state.value.filterConditionType = EqualFilterConditionType;
                    if (state.value.filterType != "Equal To")
                    {
                        state.value.filterType = undefined;
                    }

                    state.value.inputEnumType = typeEnum;
            }
        }

        watch(() => modelField.value, () => 
        {
            
        });

		return {
            color,
            modelField,
            displayFieldOptions,
            label,
            onPropertyTypeChanged
		};
	},
})
</script>
<style scoped>

</style>
