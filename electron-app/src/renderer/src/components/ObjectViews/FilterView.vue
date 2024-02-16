<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :label="'Name'" :color="color" v-model="filterState.text"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '4 / span 2' }" />
		<TableTemplate :style="{ 'position': 'relative', 'grid-row': '5 / span 8', 'grid-column': '4 / span 9' }"
			class="scrollbar" :scrollbar-size="1" :color="color" :row-gap="0" :border="true" :emptyMessage="emptyMessage"
			:showEmptyMessage="filterState.conditions.length == 0 ?? true">
			<template #header>
				<TableHeaderRow :color="color" :tabs="headerTabs" :border="true">
					<template #controls>
						<AddButton :color="color" @click="onAdd" />
					</template>
				</TableHeaderRow>
			</template>
			<template #body>
				<FilterConditionRow v-for="( fc, index ) in  filterState.conditions" :key="fc.id" :rowNumber="index"
					:color="color" :model="fc" :displayFieldOptions="displayFieldOptions" @onDelete="onDelete(fc.id)" />
			</template>
		</TableTemplate>
	</ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import FilterConditionInputField from '../InputFields/FilterConditionInputField.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import AddButton from '../Table/Controls/AddButton.vue';
import FilterConditionRow from '../Table/Rows/FilterConditionRow.vue';

import { DataType, Filter } from '../../Types/Table';
import { DisplayField, PasswordProperties, ValueProperties, defaultFilter } from '../../Types/EncryptedData';
import { stores } from '../../Objects/Stores';
import { GridDefinition, HeaderTabModel } from '../../Types/Models';
import generator from '@renderer/Utilities/Generator';
import { getEmptyTableMessage } from '@renderer/Helpers/ModelHelper';
import { v4 as uuidv4 } from 'uuid';
import { useLoadingIndicator, useRequestAuthFunction } from '@renderer/Helpers/injectHelper';

export default defineComponent({
	name: "FilterView",
	components: {
		ObjectView,
		TextInputField,
		FilterConditionInputField,
		TableTemplate,
		TableHeaderRow,
		AddButton,
		FilterConditionRow
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const refreshKey: Ref<string> = ref("");
		const filterState: Ref<Filter> = ref(props.model);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.filtersColor);
		const displayFieldOptions: ComputedRef<DisplayField[]> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			PasswordProperties : ValueProperties);

		let saveSucceeded: (value: boolean) => void;
		let saveFailed: (value: boolean) => void;

		const requestAuthFunc = useRequestAuthFunction();
		const [showLoadingIndicator, hideLoadingIndicator] = useLoadingIndicator();

		const emptyMessage: Ref<string> = ref(getEmptyTableMessage("Filter Conditions"));

		const gridDefinition: GridDefinition =
		{
			rows: 12,
			rowHeight: '50px',
			columns: 14,
			columnWidth: '100px'
		};

		const headerTabs: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Filter Conditions',
				active: computed(() => true),
				color: color,
				onClick: () => { }
			}
		];

		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(color.value, doSave, onAuthCancelled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFailed = reject;
				});
			}

			return Promise.reject();
		}

		async function doSave(key: string)
		{
			showLoadingIndicator(color.value, "Saving Filter");
			if (props.creating)
			{
				await stores.filterStore.addFilter(key, filterState.value);

				filterState.value = defaultFilter(filterState.value.type);
				refreshKey.value = Date.now().toString();
			}
			else
			{
				await stores.filterStore.updateFilter(key, filterState.value);
			}

			hideLoadingIndicator();
			if (saveSucceeded)
			{
				saveSucceeded(true);
			}
		}

		function onAuthCancelled()
		{
			saveFailed(false);
		}

		function onAdd()
		{
			filterState.value.conditions.push(
				{
					id: generator.uniqueId(filterState.value.conditions),
					property: '',
					value: ''
				});
		}

		function onDelete(id: string)
		{
			filterState.value.conditions = filterState.value.conditions.filter(f => f.id != id);
		}

		return {
			color,
			filterState,
			displayFieldOptions,
			refreshKey,
			gridDefinition,
			emptyMessage,
			headerTabs,
			onSave,
			onAdd,
			onDelete
		};
	},
})
</script>

<style></style>
