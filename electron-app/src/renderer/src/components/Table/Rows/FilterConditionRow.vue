<template>
	<TableRow :rowNumber="rowNumber" :model="tableRowData" :color="color" :allowDelete="true" :zIndexing="true"
		:animateDelete="true" :hideAtRisk="true">
		<td class="filterConditionCellOne">
			<PropertySelectorInputField :label="'Property'" :color="color" v-model="filterCondition.property"
				:model="filterCondition.property" :displayFieldOptions="displayFieldOptions" :isOnWidget="true"
				:fadeIn="true" @propertyTypeChanged="onPropertyTypeChanged" :width="'8vw'" :height="'4vh'"
				:minHeight="'35px'" :maxHeight="'50px'" :minWidth="'100px'" />
		</td>
		<td>
			<EnumInputField :label="'Condition Type'" :color="color" v-model="filterCondition.filterType"
				:optionsEnum="filterConditionType" fadeIn="true" :isOnWidget="true" :width="'8vw'" :height="'4vh'"
				:minHeight="'35px'" :minWidth="'100px'" :maxHeight="'50px'" />
		</td>
		<td :class="{ 'filterConditionCell__center': inputType == 0 }">
			<TextInputField v-if="inputType == 0" :label="'Value'" :color="color" v-model="filterCondition.value"
				:fadeIn="true" :isOnWidget="true" :width="'8vw'" :height="'4vh'" :minHeight="'35px'"
				:minWidth="'100px'" />
			<EnumInputField v-if="inputType == 1" :label="'Value'" :color="color" v-model="filterCondition.value"
				:optionsEnum="inputEnumType" fadeIn="true" :isOnWidget="true" :width="'8vw'" :height="'4vh'"
				:minHeight="'35px'" :minWidth="'100px'" :maxHeight="'50px'" />
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
import { TableRowData } from '@renderer/Types/Models';

export default defineComponent({
	name: 'FilterConditionRow',
	components:
	{
		TableRow,
		TextInputField,
		PropertySelectorInputField,
		EnumInputField
	},
	emits: ['onDelete'],
	props: ["model", "color", "rowNumber", 'displayFieldOptions'],
	setup(props, ctx)
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

		const tableRowData: Ref<TableRowData> = ref(
			{
				id: '',
				values: [],
				onDelete: function ()
				{
					ctx.emit("onDelete", filterCondition.value.id);
				}
			}
		);

		return {
			filterCondition,
			filterConditionType,
			inputType,
			inputEnumType,
			tableRowData,
			onPropertyTypeChanged
		}
	}
});
</script>

<style>
.filterConditionCellOne {
	padding-top: clamp(5px, 0.5vw, 10px);
	padding-bottom: clamp(5px, 0.5vw, 10px);
	padding-left: clamp(5px, 0.5vw, 10px);
}

/* hacky fix to get the value input cell to be closer to the center to match the property and condition type cell */
.filterConditionCell__center {
	display: flex;
	transform: translateY(12%);
}
</style>
