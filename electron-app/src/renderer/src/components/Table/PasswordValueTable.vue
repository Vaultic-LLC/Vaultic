<template>
	<div id="passwordValueTable">
		<TableTemplate ref="tableRef" :rowGap="0" id="passwordTable" class="shadow scrollbar" :color="color"
			:headerModels="headerModels" :scrollbar-size="1"
			:style="{ height: '55%', width: '48%', left: '31%', top: '42%' }"
			@scrolledToBottom="collapsibleTableRowModels.loadNextChunk()">
			<template #header>
				<TableHeaderRow :color="color" :model="headerModels" :tabs="headerTabs">
					<template #controls>
						<SearchBar v-if="activeTable == 0" v-model="currentSearchText" :color="color"
							:labelBackground="'rgb(44 44 51 / 16%)'" />
						<AddDataTableItemButton :color="color" :initalActiveContentOnClick="activeTable" />
					</template>
				</TableHeaderRow>
			</template>
			<template #body>
				<CollapsibleTableRow :shadow="true" v-slot="props"
					v-for="(model, index) in collapsibleTableRowModels.visualValues" :key="model.id"
					:groups="model.data.groups" :model="model" :rowNumber="index" :color="color">
					<SlideInRow :isShowing="props.isShowing" :colspan="headerModels.length"
						:defaultHeight="collapseRowDefaultHeight">
						<component :is="rowComponent" :value="model.data"
							:authenticationPromise="props.authenticationPromise" :color="color"
							:isShowing="props.isShowing" />
					</SlideInRow>
				</CollapsibleTableRow>
			</template>
		</TableTemplate>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditPasswordPopup" :closePopup="onEditPasswordPopupClose">
					<EditPasswordPopup :model="currentEditingPasswordModel" />
				</ObjectPopup>
			</Transition>
		</Teleport>
		<Teleport to="#body">
			<Transition name="fade">
				<ObjectPopup v-if="showEditValuePopup" :closePopup="onEditValuePopupClose">
					<EditValuePopup :model="currentEditingValueModel" />
				</ObjectPopup>
			</Transition>
		</Teleport>
	</div>
</template>

<script lang="ts">
import { ComputedRef, Ref, computed, defineComponent, inject, onMounted, ref, watch } from 'vue';

import ObjectPopup from "../ObjectPopups/ObjectPopup.vue";
import SlideInRow from './Rows/SlideInRow.vue';
import PasswordRow from "./Password/PasswordRow.vue"
import NameValuePairRow from './NameValuePair/NameValuePairRow.vue';
import TableHeaderRow from './Header/TableHeaderRow.vue';
import TableTemplate from './TableTemplate.vue';
import CollapsibleTableRow from './CollapsibleTableRow.vue';
import AddDataTableItemButton from './Controls/AddDataTableItemButton.vue';
import EditPasswordPopup from '../ObjectPopups/EditPopups/EditPasswordPopup.vue';
import EditValuePopup from '../ObjectPopups/EditPopups/EditValuePopup.vue';
import SearchBar from './Controls/SearchBar.vue';

import { DataType, Filter, FilterStatus } from '../../Types/Table';
import { PasswordStore } from '../../Objects/Stores/PasswordStore';
import { NameValuePairStore } from '../../Objects/Stores/NameValuePairStore';
import { HeaderDisplayField, IFilterable, IGroupable, IIdentifiable } from '../../Types/EncryptedData';
import { CollapsibleTableRowModel, HeaderTabModel, SortableHeaderModel, emptyHeader } from '../../Types/Models';
import { IGroupableSortedCollection } from "../../Objects/DataStructures/SortedCollections"
import { createCollapsibleTableRowModels, createSortableHeaderModels } from '../../Helpers/ModelHelper';
import { stores } from '../../Objects/Stores/index';
import InfiniteScrollCollection from '../../Objects/DataStructures/InfiniteScrollCollection';
import { RequestAuthenticationFunctionKey, ShowToastFunctionKey } from '../../Types/Keys';
import { v4 as uuidv4 } from 'uuid';

export default defineComponent({
	name: "PasswordValueTable",
	components:
	{
		ObjectPopup,
		TableTemplate,
		AddDataTableItemButton,
		TableHeaderRow,
		CollapsibleTableRow,
		PasswordRow,
		NameValuePairRow,
		SlideInRow,
		EditPasswordPopup,
		EditValuePopup,
		SearchBar
	},
	setup()
	{
		const tableRef: Ref<null> = ref(null);
		const activeTable: Ref<number> = ref(stores.appStore.activePasswordValuesTable);
		const color: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			stores.settingsStore.currentColorPalette.passwordsColor.primaryColor : stores.settingsStore.currentColorPalette.valuesColor.primaryColor);
		const collapseRowDefaultHeight: ComputedRef<string> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			"300" : "300");

		const passwords: IGroupableSortedCollection<PasswordStore> = new IGroupableSortedCollection(DataType.Passwords, [], "passwordFor");
		const pinnedPasswords: IGroupableSortedCollection<PasswordStore> = new IGroupableSortedCollection(DataType.Passwords, stores.encryptedDataStore.passwords.filter(p => p.isPinned), "passwordFor");

		const nameValuePairs: IGroupableSortedCollection<NameValuePairStore> = new IGroupableSortedCollection(DataType.NameValuePairs, [], "name");
		const pinnedNameValuePairs: IGroupableSortedCollection<NameValuePairStore> = new IGroupableSortedCollection(DataType.NameValuePairs, stores.encryptedDataStore.nameValuePairs.filter(nvp => nvp.isPinned), "name");

		let rowComponent: Ref<string> = ref(stores.appStore.activePasswordValuesTable == DataType.Passwords ? 'PasswordRow' : 'NameValuePairRow');
		let collapsibleTableRowModels: Ref<InfiniteScrollCollection<CollapsibleTableRowModel>> = ref(new InfiniteScrollCollection<CollapsibleTableRowModel>());

		let showEditPasswordPopup: Ref<boolean> = ref(false);
		let currentEditingPasswordModel: Ref<PasswordStore | any> = ref({});

		let showEditValuePopup: Ref<boolean> = ref(false);
		let currentEditingValueModel: Ref<NameValuePairStore | any> = ref({});

		let deletePassword: Ref<(key: string) => void> = ref((_: string) => { });
		let deleteValue: Ref<(key: string) => void> = ref((_: string) => { });

		const passwordSearchText: Ref<string> = ref('');
		const valueSearchText: Ref<string> = ref('');
		const currentSearchText: ComputedRef<Ref<string>> = computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords ?
			passwordSearchText : valueSearchText);

		const requestAuthFunc: { (onSuccess: (key: string) => void, onCancel: () => void): void } | undefined = inject(RequestAuthenticationFunctionKey);
		const showToastFunction: { (toastText: string, success: boolean): void } = inject(ShowToastFunctionKey, () => { });

		const headerTabs: HeaderTabModel[] = [
			{
				id: uuidv4(),
				name: 'Passwords',
				active: computed(() => stores.appStore.activePasswordValuesTable == DataType.Passwords),
				color: computed(() => stores.settingsStore.currentColorPalette.passwordsColor.primaryColor),
				onClick: () => { stores.appStore.activePasswordValuesTable = DataType.Passwords; }
			},
			{
				id: uuidv4(),
				name: 'Values',
				active: computed(() => stores.appStore.activePasswordValuesTable == DataType.NameValuePairs),
				color: computed(() => stores.settingsStore.currentColorPalette.valuesColor.primaryColor),
				onClick: () => { stores.appStore.activePasswordValuesTable = DataType.NameValuePairs; }
			}
		];

		const passwordActiveHeader: Ref<number> = ref(1);
		const valueActiveHeader: Ref<number> = ref(1);

		const passwordHeaderDisplayFields: HeaderDisplayField[] = [
			{
				displayName: "Groups",
				backingProperty: "groups",
				width: '150px',
				clickable: true
			},
			{
				displayName: "Password For",
				backingProperty: "passwordFor",
				width: '200px',
				clickable: true
			},
			{
				displayName: "Login",
				backingProperty: "login",
				width: '250px',
				clickable: true
			}
		];

		const valueHeaderDisplayFields: HeaderDisplayField[] = [
			{
				displayName: "Groups",
				backingProperty: "groups",
				width: '150px',
				clickable: true
			},
			{
				displayName: "Name",
				backingProperty: "name",
				width: '200px',
				clickable: true
			},
			{
				displayName: "Type",
				backingProperty: "valueType",
				width: '250px',
				clickable: true
			}
		];

		const passwordHeaders: SortableHeaderModel[] = createSortableHeaderModels(passwordActiveHeader, passwordHeaderDisplayFields,
			passwords, pinnedPasswords, setModels);
		passwordHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()])

		const valueHeaders: SortableHeaderModel[] = createSortableHeaderModels(valueActiveHeader, valueHeaderDisplayFields,
			nameValuePairs, pinnedNameValuePairs, setModels);
		valueHeaders.push(...[emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader(), emptyHeader()])


		const headerModels: ComputedRef<SortableHeaderModel[]> = computed(() =>
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					return valueHeaders;
				case DataType.Passwords:
				default:
					return passwordHeaders;
			}
		})

		function filter<T extends IFilterable & IIdentifiable & IGroupable & { [key: string]: string }>(newValue: Filter[], oldValue: Filter[],
			localVariable: IGroupableSortedCollection<T>, originalVariable: T[])
		{
			// no active filters
			if (newValue.length == 0)
			{
				localVariable.updateValues(originalVariable);
			}
			// adding first filter
			else if (oldValue.length == 0)
			{
				let temp: T[] = [];
				newValue.forEach(f =>
				{
					temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && p.filters.includes(f.id)));
				});

				localVariable.updateValues(temp);
			}
			// Activated filter
			else if (newValue.length > oldValue.length)
			{
				let temp: T[] = [...localVariable.values];

				if (stores.settingsStore.multipleFilterBehavior == FilterStatus.Or)
				{
					const filtersActivated: Filter[] = newValue.filter(f => !oldValue.includes(f));
					filtersActivated.forEach(f =>
					{
						temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && p.filters.includes(f.id)));
					});
				}
				else if (stores.settingsStore.multipleFilterBehavior == FilterStatus.And)
				{
					temp = [];
					temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => p.filters.includes(f.id))));
				}

				localVariable.updateValues(temp);
			}
			// removed filter
			else if (newValue.length < oldValue.length)
			{
				let temp: T[] = [...localVariable.values];

				if (stores.settingsStore.multipleFilterBehavior == FilterStatus.Or)
				{
					const filtersRemoved: Filter[] = oldValue.filter(f => !newValue.includes(f));

					filtersRemoved.forEach(f =>
					{
						temp = temp.filter(v =>
						{
							// keep values that the removed filter doesn't apply to
							if (!v.filters.includes(f.id))
							{
								return true;
							}

							// remove value if it doesn't have a current active filter
							return newValue.filter(nv => v.filters.includes(nv.id)).length > 0;
						})
					});
				}
				else if (stores.settingsStore.multipleFilterBehavior == FilterStatus.And)
				{
					temp = [];
					temp = temp.concat(originalVariable.filter(p => !temp.includes(p) && newValue.every(f => p.filters.includes(f.id))));
				}

				localVariable.updateValues(temp);
			}
		}

		function setModels()
		{
			switch (stores.appStore.activePasswordValuesTable)
			{
				case DataType.NameValuePairs:
					// eslint-disable-next-line
					createCollapsibleTableRowModels<NameValuePairStore>(DataType.NameValuePairs,
						collapsibleTableRowModels, nameValuePairs, pinnedNameValuePairs,
						(v: NameValuePairStore) =>
						{
							return [{ value: v.name, copiable: false, width: '150px' }, {
								value: v.valueType ?? '', copiable: false, width:
									'150px'
							}]
						}, onEditValue, onValueDeleteInitiated);
					break;
				case DataType.Passwords:
				default:
					// eslint-disable-next-line
					createCollapsibleTableRowModels<PasswordStore>(DataType.Passwords,
						collapsibleTableRowModels, passwords, pinnedPasswords,
						(p: PasswordStore) =>
						{
							return [{ value: p.passwordFor, copiable: false, width: '150px', },
							{ value: p.login, copiable: true, width: '250px' }]
						},
						onEditPassword, onPasswordDeleteInitiated);
			}

			if (tableRef.value)
			{
				// @ts-ignore
				tableRef.value.scrollToTop();
			}
		}

		function init()
		{
			filter(stores.filterStore.activePasswordFilters, [], passwords, stores.encryptedDataStore.unpinnedPasswords);
			filter(stores.filterStore.activeNameValuePairFilters, [], nameValuePairs, stores.encryptedDataStore.unpinnedValues);

			setModels();
		}

		function onEditPassword(password: PasswordStore)
		{
			currentEditingPasswordModel.value = password;
			showEditPasswordPopup.value = true;
		}

		function onEditValue(value: NameValuePairStore)
		{
			currentEditingValueModel.value = value;
			showEditValuePopup.value = true;
		}

		function onEditPasswordPopupClose(saved: boolean)
		{
			showEditPasswordPopup.value = false;

			if (saved)
			{
				setModels();
			}
		}

		function onEditValuePopupClose(saved: boolean)
		{
			showEditValuePopup.value = false;

			if (saved)
			{
				setModels();
			}
		}

		function onPasswordDeleteInitiated(password: PasswordStore)
		{
			deletePassword.value = (key: string) =>
			{
				stores.encryptedDataStore.deletePassword(key, password);
			};

			if (requestAuthFunc)
			{
				requestAuthFunc(onDeletePasswordConfirmed, () => { });
			}
		}

		function onDeletePasswordConfirmed(key: string)
		{
			deletePassword.value(key);
			showToastFunction("Password Deleted Successfully", true);
		}

		function onValueDeleteInitiated(value: NameValuePairStore)
		{
			deleteValue.value = (key: string) =>
			{
				stores.encryptedDataStore.deleteNameValuePair(key, value);
			};

			if (requestAuthFunc)
			{
				requestAuthFunc(onDeleteValueConfirmed, () => { });
			}
		}

		function onDeleteValueConfirmed(key: string)
		{
			deleteValue.value(key);
			showToastFunction("Value Deleted Successfully", true);
		}

		onMounted(() =>
		{
			init();
		});

		watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
		{
			switch (newValue)
			{
				case DataType.NameValuePairs:
					rowComponent.value = 'NameValuePairRow';
					break;
				case DataType.Passwords:
				default:
					rowComponent.value = "PasswordRow";
			}

			setModels();
		})

		watch(() => stores.filterStore.activePasswordFilters, (newValue, oldValue) =>
		{
			filter(newValue, oldValue, passwords, stores.encryptedDataStore.unpinnedPasswords);
			setModels();
		});

		watch(() => stores.filterStore.activeNameValuePairFilters, (newValue, oldValue) =>
		{
			filter(newValue, oldValue, nameValuePairs, stores.encryptedDataStore.unpinnedValues);
			setModels();
		});

		watch(() => stores.encryptedDataStore.passwords.length, () =>
		{
			init();
		});

		watch(() => stores.encryptedDataStore.nameValuePairs.length, () =>
		{
			init();
		});

		watch(() => stores.encryptedDataStore.activeAtRiskPasswordType, () =>
		{
			init();
		});

		watch(() => stores.encryptedDataStore.activeAtRiskValueType, () =>
		{
			init();
		});

		watch(() => passwordSearchText.value, (newValue) =>
		{
			passwords.search(newValue);
			setModels();
		});

		watch(() => valueSearchText.value, (newValue) =>
		{
			nameValuePairs.search(newValue);
			setModels();
		});

		watch(() => stores.settingsStore.multipleFilterBehavior, () =>
		{
			init();
		});

		return {
			tableRef,
			activeTable,
			color,
			headerModels,
			rowComponent,
			collapsibleTableRowModels,
			collapseRowDefaultHeight,
			showEditPasswordPopup,
			currentEditingPasswordModel,
			showEditValuePopup,
			currentEditingValueModel,
			currentSearchText,
			headerTabs,
			onEditPasswordPopupClose,
			onEditValuePopupClose,
			onDeletePasswordConfirmed,
			onDeleteValueConfirmed
		}
	}
})
</script>

<style>
.passwordValueTable {
	z-index: 1;
}
</style>
