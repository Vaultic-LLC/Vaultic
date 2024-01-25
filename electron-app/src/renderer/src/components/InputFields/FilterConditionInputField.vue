<template>
	<!-- <ObjectInputField :border="border" :color="primaryColor" :title="'Filter Conditions'" :allowAdd="true" :onAdd="onAdd"
		:maxHeight="250" :height="'400px'">
		<template #body>
			<FilterConditionRow v-for="( fc, index ) in  filterConditions " :key="fc.id" :rowNumber="index"
				:color="primaryColor" :model="fc" :displayFieldOptions="displayFieldOptions" />
		</template>
	</ObjectInputField> -->
	<TableTemplate :style="{ position: 'relative' }" class="scrollbar" :scrollbar-size="1" :color="color">
		<template #header>
			<TableHeaderRow :color="color" :tabs="headerTabs">
				<template #controls>
					<AddButton :color="color" @click="onAdd" />
				</template>
			</TableHeaderRow>
		</template>
		<template #body>
			<FilterConditionRow v-for="( fc, index ) in  filterConditions " :key="fc.id" :rowNumber="index"
				:color="primaryColor" :model="fc" :displayFieldOptions="displayFieldOptions" />
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
				id: "",
				property: '',
				value: ''
			});
		}

		return {
			primaryColor,
			filterConditions,
			headerTabs,
			onAdd
		}
	}
})
</script>

<style></style>
