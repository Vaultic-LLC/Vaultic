<template>
    <TableRow :rowNumber="rowNumber" :model="tableRowData" :color="color" :allowDelete="true" :zIndexing="true"
        :animateDelete="true" :hideAtRisk="true">
        <td class="filterConditionCell">
            <div class="filterConditionCell__content">
                <PropertySelectorInputField :label="'Property'" :color="color" v-model="filterCondition.property.value"
                    :displayFieldOptions="displayFieldOptions" :isOnWidget="true"
                    :fadeIn="true" @propertyTypeChanged="onPropertyTypeChanged" :width="'8vw'" :height="'4vh'"
                    :minHeight="'35px'" :maxHeight="'50px'" :minWidth="'100px'" />
                <EnumInputField :label="'Condition'" :color="color" v-model="filterCondition.filterType.value"
                    :optionsEnum="filterConditionType" fadeIn="true" :isOnWidget="true" :width="'8vw'" :height="'4vh'"
                    :minHeight="'35px'" :minWidth="'100px'" :maxHeight="'50px'" />
                <!-- the EnumInputField is like 1.3px wider than the TextInputField at the same width, causing the other inputs to
				 shift slightly when changing. Wrap them in a div with fixed width and set their width to 100% to fix this -->
                <div class="filterConditionCell__valueInput">
                    <TextInputField v-if="inputType == 0" :label="'Value'" :color="color"
                        v-model="filterCondition.value.value" :fadeIn="true" :isOnWidget="true" :width="'100%'"
                        :height="'3.8vh'" :minHeight="'33px'" :minWidth="'100px'" :maxHeight="'49px'" />
                    <EnumInputField v-if="inputType == 1" :label="'Value'" :color="color"
                        v-model="filterCondition.value.value" :optionsEnum="inputEnumType" fadeIn="true" :isOnWidget="true"
                        :width="'100%'" :height="'4vh'" :minHeight="'35px'" :minWidth="'100px'" :maxHeight="'50px'" />
                </div>
            </div>
        </td>
    </TableRow>
    <tr class="filterConditionRowSpace"></tr>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import TableRow from './TableRow.vue';
import TextInputField from '../../../components/InputFields/TextInputField.vue';
import PropertySelectorInputField from '../../../components/InputFields/PropertySelectorInputField.vue';
import EnumInputField from '../../../components/InputFields/EnumInputField.vue';

import { TableRowData } from '../../../Types/Models';
import { EqualFilterConditionType, FilterCondition, FilterConditionType } from '../../../Types/DataTypes';
import { PropertyType } from '../../../Types/Fields';

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
                    filterCondition.value.value.value = "";
                    inputType.value = PropertyType.String;
                    filterConditionType.value = FilterConditionType;
                    inputEnumType.value = undefined;
                    break;
                case PropertyType.Enum:
                    filterCondition.value.value.value = "";
                    inputType.value = PropertyType.Enum;
                    filterConditionType.value = EqualFilterConditionType;
                    if (filterCondition.value.filterType.value != "Equal To")
                    {
                        filterCondition.value.filterType.value = undefined;
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
.filterConditionCell {
    padding-top: clamp(5px, 0.5vw, 10px);
    padding-bottom: clamp(5px, 0.5vw, 10px);
    padding-left: clamp(5px, 0.5vw, 10px);
}

/* hacky fix to get the value input cell to be closer to the center to match the property and condition type cell */
.filterConditionCell__content {
    display: flex;
    justify-content: space-evenly
}

.filterConditionRowSpace {
    height: 0px;
}

/* make sure the labels on the rows don't overlap at smaller sizes */
@media (max-width: 1250px) {
    .filterConditionRowSpace {
        height: 5px;
    }
}

.filterConditionCell__valueInput {
    width: 8vw;
}
</style>
