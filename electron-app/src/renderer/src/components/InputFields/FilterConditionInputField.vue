<template>
	<TableTemplate :style="{ position: 'relative' }" class="scrollbar" :scrollbar-size="1" :color="color" :row-gap="0"
		:border="true" :emptyMessage="emptyMessage" :showEmptyMessage="filterConditions.length == 0">
		<template #header>
			<TableHeaderRow :color="color" :tabs="headerTabs" :border="true">
				<template #controls>
					<AddButton :color="color" @click="onAdd" />
				</template>
			</TableHeaderRow>
		</template>
		<template #body>
			<FilterConditionRow v-for="( fc, index ) in  filterConditions " :key="fc.id" :rowNumber="index"
				:color="primaryColor" :model="fc" :displayFieldOptions="displayFieldOptions" @onDelete="onDelete(fc.id)" />
		</template>
	</TableTemplate>
</template>
<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, ref } from 'vue';

import ObjectInputField from './ObjectInputField.vue';
import FilterConditionRow from '../Table/Rows/FilterConditionRow.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';

import { FilterCondition } from '../../Types/Table';
import { v4 as uuidv4 } from 'uuid';
import { HeaderTabModel } from '@renderer/Types/Models';
import generator from '@renderer/Utilities/Generator';
import { getEmptyTableMessage } from '@renderer/Helpers/ModelHelper';

export default defineComponent({
	name: "FilterConditionInputField",
	components:
	{
		ObjectInputField,
		FilterConditionRow,
		TableTemplate,
		AddButton,
		TableHeaderRow
	},
	props: ['model', 'color', 'displayFieldOptions', 'border'],
	setup(props)
	{
		let filterConditions: Ref<FilterCondition[]> = ref(props.model);
		const primaryColor: ComputedRef<string> = computed(() => props.color);

		const emptyMessage: Ref<string> = ref(getEmptyTableMessage("Filter Conditions"));

		const headerTabs: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Filter Conditions',
				active: computed(() => true),
				color: primaryColor,
				onClick: () => { }
			}
		];

		function onAdd()
		{
			filterConditions.value.push({
				id: generator.uniqueId(filterConditions.value),
				property: '',
				value: ''
			});
		}

		function onDelete(id: string)
		{
			filterConditions.value = filterConditions.value.filter(f => f.id != id);
		}

		return {
			primaryColor,
			filterConditions,
			headerTabs,
			emptyMessage,
			onAdd,
			onDelete
		}
	}
})
</script>

<style></style>
