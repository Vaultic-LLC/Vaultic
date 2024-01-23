<template>
	<TableRow :rowNumber="rowNumber" :model="model" :color="color" :allowDelete="true" :zIndexing="true">
		<td class="securityQuestion">
			<PropertySelectorInputField :label="'Property'" :color="color" v-model="filterCondition.property"
				:model="filterCondition.property" :displayFieldOptions="displayFieldOptions"
				@propertyTypeChanged="onPropertyTypeChanged" />
		</td>
		<td>
			<EnumInputField :label="'Condition Type'" :color="color" v-model="filterCondition.filterType"
				:optionsEnum="filterConditionType" fadeIn="true" />
		</td>
		<td>
			<TextInputField v-if="inputType == 0" :label="'Value'" :color="color" v-model="filterCondition.value"
				:fadeIn="true" />
			<EnumInputField v-if="inputType == 1" :label="'Value'" :color="color" v-model="filterCondition.value"
				:optionsEnum="inputEnumType" fadeIn="false" />
		</td>
	</TableRow>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TableRow from './TableRow.vue';
import TextInputField from '../../../components/InputFields/TextInputField.vue';
import PropertySelectorInputField from '../../../components/InputFields/PropertySelectorInputField.vue';
import EnumInputField from '../../../components/InputFields/EnumInputField.vue';

import { FilterCondition, FilterConditionType, EqualFilterConditionType } from '../../../Types/Table';
import { PropertyType } from '../../../Types/EncryptedData';

export default defineComponent({
	name: 'FilterConditionRow',
	components:
	{
		TableRow,
		TextInputField,
		PropertySelectorInputField,
		EnumInputField
	},
	props: ["model", "color", "rowNumber", 'displayFieldOptions'],
	setup(props)
	{
		const filterCondition: ComputedRef<FilterCondition> = computed(() => props.model);
		const inputType: Ref<PropertyType> = ref(PropertyType.String);

		const filterConditionType: Ref<{ [key: string]: string | number }> = ref(FilterConditionType);
		const inputEnumType: Ref<{ [key: string]: string | number } | undefined> = ref({});

		function onPropertyTypeChanged(type: PropertyType, typeEnum?: { [key: string]: string | number })
		{
			switch (type)
			{
				case PropertyType.String:
					filterCondition.value.value = "";
					inputType.value = PropertyType.String;
					filterConditionType.value = FilterConditionType;
					inputEnumType.value = undefined;
					break;
				case PropertyType.Enum:
					filterCondition.value.value = "";
					inputType.value = PropertyType.Enum;
					filterConditionType.value = EqualFilterConditionType;
					if (filterCondition.value.filterType != "Equal To")
					{
						filterCondition.value.filterType = undefined;
					}

					inputEnumType.value = typeEnum;
			}
		}

		return {
			filterCondition,
			filterConditionType,
			inputType,
			inputEnumType,
			onPropertyTypeChanged
		}
	}
});
</script>

<style></style>
