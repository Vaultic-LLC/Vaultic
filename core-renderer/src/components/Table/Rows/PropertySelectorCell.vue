<template>
    <div class="propertySelectorCellContainer">
        <PropertySelectorInputField v-model="modelField" :defaultType="inputType" :label="label" :color="color" :displayFieldOptions="displayFieldOptions" 
            :width="''" :minWidth="''" @propertyTypeChanged="onPropertyTypeChanged"  />
    </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from 'vue';

import PropertySelectorInputField from '../../InputFields/PropertySelectorInputField.vue';
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
        const modelField: Ref<any> = ref(props.model[props.field]);
        const displayFieldOptions: Ref<DisplayField[]> = computed(() => props.data["properties"]);
        const color: ComputedRef<string> = computed(() => props.data["color"]);
        const state: ComputedRef<any> = computed(() => props.state);
        const label: ComputedRef<string> = computed(() => props.data["label"]);
        const inputType: ComputedRef<PropertyType> = computed(() => state.value.inputType);

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

        watch(() => modelField.value, (newValue) =>
        {
            props.model[props.field] = newValue;
        });

		return {
            color,
            modelField,
            displayFieldOptions,
            label,
            inputType,
            onPropertyTypeChanged
		};
	},
})
</script>
<style scoped>
.propertySelectorCellContainer {
    width: 100%;
}
</style>
