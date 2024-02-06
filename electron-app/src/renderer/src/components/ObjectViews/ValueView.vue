<template>
	<ObjectView :color="color" :creating="creating" :defaultSave="onSave" :key="refreshKey"
		:gridDefinition="gridDefinition">
		<TextInputField :color="color" :label="'Name'" v-model="valuesState.name"
			:style="{ 'grid-row': '1 / span 2', 'grid-column': '2 / span 2' }" />
		<EnumInputField :label="'Type'" :color="color" v-model="valuesState.valueType" :optionsEnum="NameValuePairType"
			:fadeIn="true" :style="{ 'grid-row': '3 / span 2', 'grid-column': '2 / span 2', 'z-index': '9' }" />
		<div class="notifyIfWeakContainer" v-if="showNotifyIfWeak"
			:style="{ 'grid-row': '4 / span 2', 'grid-column': '2 / span 2', 'margin-top': '10px', 'margin-left': '5px' }">
			<CheckboxInputField :label="'Notify if Weak'" :color="color" v-model="valuesState.notifyIfWeak" :fadeIn="true"
				:style="{ 'grid-row': '4 / span 2', 'grid-column': '2 / span 2', 'z-index': '8' }" />
			<ToolTip :color="color" :size="20" :fadeIn="true"
				:message="'Some Passcodes, like Garage Codes or certain Phone Codes, are only 4-6 characters long and do not fit the requirements for &quot;Weak&quot;. Tracking of these Passcodes can be turned off so they do not appear in the &quot;Weak Passcodes&quot; Metric.'" />
		</div>
		<EncryptedInputField :colorModel="colorModel" :label="'Value'" v-model="valuesState.value"
			:initialLength="initalLength" :isInitiallyEncrypted="isInitiallyEncrypted" :showUnlock="true" :showCopy="true"
			:showRandom="true" :required="true" :style="{ 'grid-row': '5 / span 2', 'grid-column': '2 / span 2' }"
			@onDirty="valueIsDirty = true" />
		<TextAreaInputField :colorModel="colorModel" :label="'Additional Information'"
			v-model="valuesState.additionalInformation"
			:style="{ 'grid-row': '8 / span 4', 'grid-column': '2 / span 4' }" />
		<TableTemplate ref="tableRef"
			:style="{ 'position': 'relative', 'grid-row': '4 / span 8', 'grid-column': '9 / span 7' }" class="scrollbar"
			:scrollbar-size="1" :color="color" :headerModels="groupHeaderModels" :border="true" :emptyMessage="emptyMessage"
			:showEmptyMessage="mounted && groupModels.visualValues.length == 0"
			@scrolledToBottom="groupModels.loadNextChunk()">
			<template #header>
				<TableHeaderRow :color="color" :model="groupHeaderModels" :tabs="groupTab" :border="true">
					<template #controls>
						<SearchBar v-model="searchText" :color="color" />
					</template>
				</TableHeaderRow>
			</template>
			<template #body>
				<SelectableTableRow v-for="(trd, index) in groupModels.visualValues" class="hover" :key="trd.id"
					:rowNumber="index" :selectableTableRowData="trd" :preventDeselect="false"
					:style="{ width: '5%', 'height': '75px' }" :color="color" />
			</template>
		</TableTemplate>
	</ObjectView>
</template>
<script lang="ts">
import { ComputedRef, defineComponent, computed, Ref, ref, onMounted, watch, inject } from 'vue';

import ObjectView from "./ObjectView.vue"
import TextInputField from '../InputFields/TextInputField.vue';
import EncryptedInputField from '../InputFields/EncryptedInputField.vue';
import ObjectSelectorInputField from '../InputFields/ObjectSelectorInputField.vue';
import TextAreaInputField from '../InputFields/TextAreaInputField.vue';
import EnumInputField from '../InputFields/EnumInputField.vue';
import SearchBar from '../Table/Controls/SearchBar.vue';
import SelectableTableRow from '../Table/SelectableTableRow.vue';
import TableTemplate from '../Table/TableTemplate.vue';
import TableHeaderRow from '../Table/Header/TableHeaderRow.vue';
import ToolTip from '../ToolTip.vue';

import { NameValuePair, defaultValue, NameValuePairType, HeaderDisplayField } from '../../Types/EncryptedData';
import { GridDefinition, HeaderTabModel, InputColorModel, SelectableTableRowData, SortableHeaderModel, defaultInputColorModel } from '../../Types/Models';
import { v4 as uuidv4 } from 'uuid';
import { NameValuePairStore } from '../../Objects/Stores/NameValuePairStore';
import { stores } from '../../Objects/Stores';
import CheckboxInputField from '../InputFields/CheckboxInputField.vue';
import { createSortableHeaderModels, getObjectPopupEmptyTableMessage } from '../../Helpers/ModelHelper';
import { SortedCollection } from '../../Objects/DataStructures/SortedCollections';
import { Group } from '../../Types/Table';
import { RequestAuthenticationFunctionKey } from '../../Types/Keys';
import InfiniteScrollCollection from '@renderer/Objects/DataStructures/InfiniteScrollCollection';

export default defineComponent({
	name: "ValueView",
	components: {
		ObjectView,
		TextInputField,
		EncryptedInputField,
		ObjectSelectorInputField,
		TextAreaInputField,
		EnumInputField,
		CheckboxInputField,
		SearchBar,
		ToolTip,
		TableTemplate,
		TableHeaderRow,
		SelectableTableRow
	},
	props: ['creating', 'model'],
	setup(props)
	{
		const tableRef: Ref<HTMLElement | null> = ref(null);
		const mounted: Ref<boolean> = ref(false);
		const refreshKey: Ref<string> = ref("");
		const valuesState: Ref<NameValuePair> = ref(props.model);
		const color: ComputedRef<string> = computed(() => stores.settingsStore.currentColorPalette.valuesColor.primaryColor);
		const colorModel: ComputedRef<InputColorModel> = computed(() => defaultInputColorModel(color.value));

		// @ts-ignore
		const groups: Ref<SortedCollection<Group>> = ref(new SortedCollection<Group>(stores.groupStore.valuesGroups, "name"));
		// @ts-ignore
		const groupModels: Ref<InfiniteScrollCollection<SelectableTableRowData>> = ref(new InfiniteScrollCollection<SelectableTableRowData>());
		const initalLength: Ref<number> = ref((valuesState.value as NameValuePairStore).valueLength ?? 0);
		const isInitiallyEncrypted: ComputedRef<boolean> = computed(() => !props.creating);
		const valueIsDirty: Ref<boolean> = ref(false);

		const showNotifyIfWeak: Ref<boolean> = ref(valuesState.value.valueType == NameValuePairType.Passcode);

		const gridDefinition: GridDefinition = {
			rows: 12,
			rowHeight: '50px',
			columns: 15,
			columnWidth: '100px'
		}

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);
		let saveSucceeded: (value: boolean) => void;
		let saveFaield: (value: boolean) => void;

		const searchText: ComputedRef<Ref<string>> = computed(() => ref(''));

		const emptyMessage: Ref<string> = ref(getObjectPopupEmptyTableMessage('Groups', "Value", "Group"));

		const activeGroupHeader: Ref<number> = ref(1);
		const groupHeaderDisplayFields: HeaderDisplayField[] = [
			{
				backingProperty: "",
				displayName: " ",
				width: '100px',
				clickable: false
			},
			{
				backingProperty: "name",
				displayName: "Name",
				width: '150px',
				clickable: true
			},
			{
				displayName: "Color",
				backingProperty: "color",
				width: "100px",
				clickable: true
			}
		];

		const groupTab: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Groups',
				active: computed(() => true),
				color: color,
				onClick: () => { }
			}
		];

		// @ts-ignore
		const groupHeaderModels: SortableHeaderModel[] = createSortableHeaderModels<Group>(
			activeGroupHeader, groupHeaderDisplayFields, groups.value, undefined, setGroupModels);

		function setGroupModels()
		{
			groupModels.value.setValues(groups.value.calculatedValues.map(g =>
			{
				const values: any[] =
					[
						{
							component: "TableRowTextValue",
							value: g.name,
							copiable: false,
							width: '150px'
						},
						{
							component: "TableRowColorValue",
							color: g.color,
							copiable: true,
							width: '100px',
							margin: false
						}
					];

				const model: SelectableTableRowData =
				{
					id: uuidv4(),
					key: g.id,
					values: values,
					isActive: ref(valuesState.value.groups.includes(g.id)),
					selectable: true,
					onClick: function ()
					{
						if (valuesState.value.groups.includes(g.id))
						{
							valuesState.value.groups = valuesState.value.groups.filter(id => id != g.id);
						}
						else
						{
							valuesState.value.groups.push(g.id);
						}
					}
				}
				return model;
			}));

			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		function onSave()
		{
			if (requestAuthFunc)
			{
				requestAuthFunc(onAuthenticationSuccessful, onAuthenticationCanceled);
				return new Promise((resolve, reject) =>
				{
					saveSucceeded = resolve;
					saveFaield = reject;
				});
			}

			return Promise.reject();
		}

		function onAuthenticationSuccessful(key: string)
		{
			if (props.creating)
			{
				stores.encryptedDataStore.addNameValuePair(key, valuesState.value);

				valuesState.value = defaultValue();
				refreshKey.value = Date.now().toString();
			}
			else
			{
				stores.encryptedDataStore.updateNameValuePair(valuesState.value, valueIsDirty.value, key);
			}

			saveSucceeded(true);
		}

		function onAuthenticationCanceled()
		{
			saveFaield(false);
		}

		onMounted(() =>
		{
			setGroupModels();
			mounted.value = true;
		});

		watch(() => valuesState.value.valueType, (newValue) =>
		{
			showNotifyIfWeak.value = newValue == NameValuePairType.Passcode;
		});

		watch(() => searchText.value.value, (newValue) =>
		{
			groups.value.search(newValue);
			setGroupModels();
		});

		return {
			initalLength,
			isInitiallyEncrypted,
			valueIsDirty,
			groupHeaderModels,
			groupModels,
			color,
			valuesState,
			refreshKey,
			gridDefinition,
			NameValuePairType,
			showNotifyIfWeak,
			searchText,
			groupTab,
			emptyMessage,
			mounted,
			colorModel,
			tableRef,
			onSave,
			onAuthenticationSuccessful
		};
	},
})
</script>

<style>
.notifyIfWeakContainer {
	display: flex;
	justify-content: flex-start;
	align-items: flex-start;
	column-gap: 10px;
}
</style>
