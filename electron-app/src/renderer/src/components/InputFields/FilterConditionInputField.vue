<template>
	<ObjectInputField :border="border" :color="primaryColor" :title="'Filter Conditions'" :allowAdd="true" :onAdd="onAdd"
		:maxHeight="250" :height="'400px'">
		<template #body>
			<FilterConditionRow v-for="( fc, index ) in  filterConditions " :key="fc.id" :rowNumber="index"
				:color="primaryColor" :model="fc" :displayFieldOptions="displayFieldOptions" />
		</template>
	</ObjectInputField>
</template>
<script lang="ts">
import { Ref, computed, defineComponent, ref } from 'vue';

import ObjectInputField from './ObjectInputField.vue';
import FilterConditionRow from '../Table/Rows/FilterConditionRow.vue';

import { FilterCondition } from '../../Types/Table';

export default defineComponent({
	name: "FilterConditionInputField",
	components:
	{
		ObjectInputField,
		FilterConditionRow
	},
	props: ['model', 'color', 'displayFieldOptions', 'border'],
	setup(props)
	{
		let filterConditions: Ref<FilterCondition[]> = ref(props.model);
		const primaryColor: Ref<string> = computed(() => props.color);

		function onAdd()
		{
			filterConditions.value.push({
				id: "",
				property: '',
				value: ''
			})
		}
		return {
			primaryColor,
			filterConditions,
			onAdd
		}
	}
})
</script>

<style></style>
