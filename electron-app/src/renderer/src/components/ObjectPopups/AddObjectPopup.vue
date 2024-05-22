<template>
	<div class="actionSelectorItems">
		<TableSelector class="actionSelectorItems__passwordValueControls"
			:singleSelectorItems="[passwordTableControl, valuesTableControl]" />
		<TableSelector class="actionSelectorItems__addControls"
			:singleSelectorItems="[filtersTableControl, groupsTableControl, addTableControl]" />
	</div>
	<div class="actionControl">
		<Transition name="addObjectFade" mode="out-in">
			<FilterView v-if="activeContent == 2 && activeTable == 0" :creating="true" :model="passwordFilterModel" />
			<FilterView v-else-if="activeContent == 2 && activeTable == 1" :creating="true" :model="valueFilterModel" />
			<GroupView v-else-if="activeContent == 3 && activeTable == 0" :creating="true"
				:model="passwordGroupModel" />
			<GroupView v-else-if="activeContent == 3 && activeTable == 1" :creating="true" :model="valueGroupModel" />
			<PasswordView v-else-if="activeContent < 2 && activeTable == 0" :creating="true" :model="passwordModel" />
			<ValueView v-else-if="activeContent < 2 && activeTable == 1" :creating="true" :model="valueModel" />
		</Transition>
	</div>
</template>
<script lang="ts">
import { defineComponent, watch, Ref, ComputedRef, computed, ref } from 'vue';

import PasswordView from "../ObjectViews/PasswordView.vue";
import ValueView from "../ObjectViews/ValueView.vue";
import FilterView from "../ObjectViews/FilterView.vue";
import GroupView from "../ObjectViews/GroupView.vue";
import TableSelector from '../../components/TableSelector.vue';

import { ColorPalette } from '../../Types/Colors';
import { DataType, Filter, Group } from '../../Types/Table';
import { NameValuePair, Password, defaultFilter, defaultGroup, defaultPassword, defaultValue } from '../../Types/EncryptedData';
import { SingleSelectorItemModel } from '../../Types/Models';
import { hideAll } from 'tippy.js';
import { stores } from '@renderer/Objects/Stores';

export default defineComponent({
	name: "AddObjectPopup",
	components:
	{
		PasswordView,
		ValueView,
		FilterView,
		GroupView,
		TableSelector
	},
	props: ['initalActiveContent'],
	setup(props)
	{
		let activeContent: Ref<number> = ref(props.initalActiveContent);
		const activeTable: ComputedRef<DataType> = computed(() => stores.appStore.activePasswordValuesTable);

		const currentColorPalette: ComputedRef<ColorPalette> = computed(() => stores.userPreferenceStore.currentColorPalette);

		const passwordModel: Ref<Password> = ref(defaultPassword());
		const passwordFilterModel: Ref<Filter> = ref(defaultFilter(DataType.Passwords));
		const passwordGroupModel: Ref<Group> = ref(defaultGroup(DataType.Passwords));

		const valueModel: Ref<NameValuePair> = ref(defaultValue());
		const valueFilterModel: Ref<Filter> = ref(defaultFilter(DataType.NameValuePairs));
		const valueGroupModel: Ref<Group> = ref(defaultGroup(DataType.NameValuePairs));

		const primaryColor: ComputedRef<string> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					return stores.userPreferenceStore.currentColorPalette.valuesColor.primaryColor;
				case DataType.Passwords:
				default:
					return stores.userPreferenceStore.currentColorPalette.passwordsColor.primaryColor;
			}
		});

		const passwordTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Passwords"),
				color: ref(currentColorPalette.value.passwordsColor.primaryColor),
				isActive: computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords),
				onClick: () => { updatePasswordsValuesTable(DataType.Passwords); }
			}
		});

		const valuesTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Values"),
				color: ref(currentColorPalette.value.valuesColor.primaryColor),
				isActive: computed(() => stores.appStore.activePasswordValuesTable == DataType.NameValuePairs),
				onClick: () => { updatePasswordsValuesTable(DataType.NameValuePairs); }
			}
		});

		const filtersTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Add Filter"),
				color: ref(currentColorPalette.value.filtersColor),
				isActive: computed(() => activeContent.value == DataType.Filters),
				onClick: () => { filtersGroupsClicked(DataType.Filters); }
			}
		});

		const groupsTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: ref("Add Group"),
				color: ref(currentColorPalette.value.groupsColor),
				isActive: computed(() => activeContent.value == DataType.Groups),
				onClick: () => { filtersGroupsClicked(DataType.Groups); }
			}
		});

		const addTableControl: ComputedRef<SingleSelectorItemModel> = computed(() =>
		{
			return {
				title: computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ? "Add Password" : "Add Value"),
				color: primaryColor,
				isActive: computed(() => activeContent.value <= 1),
				onClick: () => { activeContent.value = stores.appStore.activePasswordValuesTable; }
			}
		});

		function updatePasswordsValuesTable(tableItem: number)
		{
			hideAll();
			// we're on the add item tab, but it might not be for the right table, update it to make sure
			if (activeContent.value <= 1)
			{
				activeContent.value = tableItem;
			}

			stores.appStore.activePasswordValuesTable = tableItem;
		}

		function filtersGroupsClicked(tableItem: number)
		{
			hideAll();
			activeContent.value = tableItem;
			stores.appStore.activeFilterGroupsTable = tableItem;
		}

		watch(() => props.initalActiveContent, (newValue) =>
		{
			activeContent.value = newValue;
		});

		return {
			activeContent,
			activeTable,
			passwordTableControl,
			valuesTableControl,
			filtersTableControl,
			groupsTableControl,
			addTableControl,
			passwordModel,
			passwordFilterModel,
			passwordGroupModel,
			valueFilterModel,
			valueGroupModel,
			valueModel,
		}
	}
})
</script>

<style>
.actionControl {
	position: absolute;
	height: 80%;
	width: 100%;
	top: 20%;
}

.actionSelectorItems__passwordValueControls {
	left: 30%;
	top: 0%;
	width: 40%;
	z-index: 10;
}

.actionSelectorItems__addControls {
	left: 20%;
	top: 10%;
	width: 60%;
	z-index: 10;
}
</style>
