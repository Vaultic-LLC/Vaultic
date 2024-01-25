<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :label="'Name'" :color="color" v-model="filterState.text"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
		<FilterConditionInputField :border="true" :scrollbar="true" :color="color" :model="filterState.conditions"
			:rowGap="20" :style="{ 'grid-row': '4 / span 8', 'grid-column': '2 / span 8' }"
			:displayFieldOptions="displayFieldOptions" />
	</ObjectView>
</template>
<script lang="ts">
import { defineComponent, ComputedRef, computed, Ref, ref, inject } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import FilterConditionInputField from '../InputFields/FilterConditionInputField.vue';

import { DataType, Filter } from '../../Types/Table';
import { DisplayField, PasswordProperties, ValueProperties, defaultFilter } from '../../Types/EncryptedData';
import { stores } from '../../Objects/Stores';
import { GridDefinition } from '../../Types/Models';
import { RequestAuthenticationFunctionKey } from '../../Types/Keys';

export default defineComponent({
	name: "FilterView",
	components: {
		ObjectView,
		TextInputField,
		FilterConditionInputField,
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

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);

		const gridDefinition: GridDefinition =
		{
			rows: 12,
			rowHeight: '50px',
			columns: 11,
			columnWidth: '100px'
		};

		function onSave()
		{
			if (!stores.settingsStore.requireMasterKeyOnFilterGrouopSave)
			{
				doSave();
				return Promise.resolve(true);
			}

			if (requestAuthFunc)
			{
				requestAuthFunc(doSave, onAuthCancelled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFailed = reject;
				});
			}

			return Promise.reject();
		}

		function doSave()
		{
			if (props.creating)
			{
				stores.filterStore.addFilter(filterState.value);

				filterState.value = defaultFilter(filterState.value.type);
				refreshKey.value = Date.now().toString();
			}
			else
			{
				stores.filterStore.updateFilter(filterState.value);
			}

			if (saveSucceeded)
			{
				saveSucceeded(true);
			}
		}

		function onAuthCancelled()
		{
			saveFailed(false);
		}

		return {
			color,
			filterState,
			displayFieldOptions,
			refreshKey,
			gridDefinition,
			onSave
		};
	},
})
</script>

<style></style>
