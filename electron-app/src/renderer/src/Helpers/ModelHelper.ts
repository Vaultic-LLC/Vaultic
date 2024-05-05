import { SortedCollection } from "../Objects/DataStructures/SortedCollections";
import { CollapsibleTableRowModel, SelectableTableRowData, SortableHeaderModel, TableRowValue } from "../Types/Models";
import { Ref, computed, ref } from "vue";
import { v4 as uuidv4 } from 'uuid';
import { AtRiskType, HeaderDisplayField, IIdentifiable } from "../Types/EncryptedData";
import { DataType, Filter } from "../Types/Table";
import InfiniteScrollCollection from "../Objects/DataStructures/InfiniteScrollCollection";
import { stores } from "@renderer/Objects/Stores";
import { ReactiveValue } from "@renderer/Objects/Stores/ReactiveValue";
import { ReactivePassword } from "@renderer/Objects/Stores/ReactivePassword";

export function createSortableHeaderModels<T extends { [key: string]: any } & IIdentifiable>(activeHeaderTracker: Ref<number>, headerDisplayField: HeaderDisplayField[],
	sortableCollection: SortedCollection<T>, pinnedCollection?: SortedCollection<T>, updateModels?: () => void): SortableHeaderModel[]
{
	return headerDisplayField.map((header, index) =>
	{
		const sortableHeaderModel: SortableHeaderModel =
		{
			id: uuidv4(),
			isActive: computed(() => activeHeaderTracker.value == index),
			name: header.displayName,
			descending: ref(true),
			clickable: header.clickable,
			width: header.width,
			padding: header.padding,
			onClick: function ()
			{
				if (!header.clickable)
				{
					return;
				}

				if (!this.descending)
				{
					return;
				}

				if (this.isActive.value)
				{
					this.descending.value = !this.descending.value;
				}
				else
				{
					this.descending.value = true;
				}

				activeHeaderTracker.value = index;
				sortableCollection.updateSort(header.backingProperty, this.descending.value == true);
				pinnedCollection?.updateSort(header.backingProperty, this.descending.value == true);

				if (updateModels)
				{
					updateModels();
				}
			}
		}

		return sortableHeaderModel;
	});
}

export function createPinnableSelectableTableRowModels<T extends { [key: string]: any } & IIdentifiable>(groupFilterType: DataType, passwordValueType: DataType,
	selectableTableRowModels: Ref<InfiniteScrollCollection<SelectableTableRowData>>, sortedCollection: SortedCollection<T>, pinnedCollection: SortedCollection<T>,
	getValues: (value: T) => TableRowValue[], selectable: boolean, isActiveProp: string, sortOnClick: boolean, onClick?: (value: T) => void, onEdit?: (value: T) => void, onDelete?: (value: T) => void)
{
	const isFilter = groupFilterType == DataType.Filters;
	const isGroup = groupFilterType == DataType.Groups;

	selectableTableRowModels.value.setValues([]);
	const temp: SelectableTableRowData[] = [];

	if (isGroup)
	{
		if (passwordValueType == DataType.Passwords)
		{
			switch (stores.groupStore.activeAtRiskPasswordGroupType)
			{
				case AtRiskType.Empty:
					stores.groupStore.emptyPasswordGroups.forEach(g =>
					{
						addAtRiskValues("There are no Passwords in this Group", stores.groupStore.passwordGroups.filter(gr => gr.id == g)[0]);
					});
					break;
				case AtRiskType.Duplicate:
					Object.keys(stores.groupStore.duplicatePasswordGroups).forEach(g =>
					{
						addAtRiskValues("This Group has the same Passwords as another Group", stores.groupStore.passwordGroups.filter(gr => gr.id == g)[0]);
					});
					break;
			}
		}
		else if (passwordValueType == DataType.NameValuePairs)
		{
			switch (stores.groupStore.activeAtRiskValueGroupType)
			{
				case AtRiskType.Empty:
					stores.groupStore.emptyValueGroups.forEach(g =>
					{
						addAtRiskValues("There are no Values in this Group", stores.groupStore.valuesGroups.filter(gr => gr.id == g)[0]);
					});
					break;
				case AtRiskType.Duplicate:
					Object.keys(stores.groupStore.duplicateValueGroups).forEach(g =>
					{
						addAtRiskValues("This Group has the same Values as another Group", stores.groupStore.valuesGroups.filter(gr => gr.id == g)[0]);
					});
					break;
			}
		}
	}
	else if (isFilter)
	{
		if (passwordValueType == DataType.Passwords)
		{
			switch (stores.filterStore.activeAtRiskPasswordFilterType)
			{
				case AtRiskType.Empty:
					stores.filterStore.emptyPasswordFilters.forEach(v =>
					{
						addAtRiskValues("There are no Passwords that apply to this Filter", stores.filterStore.passwordFilters.filter(f => f.id == v)[0]);
					});
					break;
				case AtRiskType.Duplicate:
					Object.keys(stores.filterStore.duplicatePasswordFilters).forEach(v =>
					{
						addAtRiskValues("This Filter applies to the same Passwords as another Filter", stores.filterStore.passwordFilters.filter(f => f.id == v)[0]);
					});
			}
		}
		else if (passwordValueType == DataType.NameValuePairs)
		{
			switch (stores.filterStore.activeAtRiskValueFilterType)
			{
				case AtRiskType.Empty:
					stores.filterStore.emptyValueFilters.forEach(v =>
					{
						addAtRiskValues("There are no Values that apply to this Filter", stores.filterStore.nameValuePairFilters.filter(f => f.id == v)[0]);
					});
					break;
				case AtRiskType.Duplicate:
					Object.keys(stores.filterStore.duplicateValueFilters).forEach(v =>
					{
						addAtRiskValues("This Filter applies to the same Values as another Filter", stores.filterStore.nameValuePairFilters.filter(f => f.id == v)[0]);
					});
			}
		}
	}

	temp.push(...pinnedCollection.values.map(v => buildModel(v)));
	temp.push(...sortedCollection.calculatedValues.map(v => buildModel(v)));

	selectableTableRowModels.value.setValues(temp);

	function addAtRiskValues<U extends IIdentifiable>(message: string, value: U)
	{
		pinnedCollection.remove(value.id);
		sortedCollection.remove(value.id);

		temp.push(buildModel(value as any as T, message));
	}

	function buildModel(v: T, message?: string): SelectableTableRowData
	{
		return {
			id: uuidv4(),
			key: v.id,
			selectable: selectable,
			isPinned: ((isFilter && stores.userPreferenceStore.pinnedFilters.hasOwnProperty(v.id)) ||
				(isGroup && stores.userPreferenceStore.pinnedGroups.hasOwnProperty(v.id))),
			isActive: ref(v[isActiveProp] ?? false),
			values: getValues(v),
			atRiskModel:
			{
				message: message ?? "",
			},
			onClick: function ()
			{
				if (onClick)
				{
					onClick(v);
					if (sortOnClick)
					{
						sortedCollection.updateSort(sortedCollection.property, sortedCollection.descending);
						sortRows();
					}
				}
			},
			onEdit: function ()
			{
				if (onEdit)
				{
					onEdit(v);
				}
			},
			onPin: function ()
			{
				if (((isFilter && stores.userPreferenceStore.pinnedFilters.hasOwnProperty(v.id)) ||
					(isGroup && stores.userPreferenceStore.pinnedGroups.hasOwnProperty(v.id))))
				{
					if (isFilter)
					{
						stores.userPreferenceStore.removePinnedFilters(v.id);
					}
					else if (isGroup)
					{
						stores.userPreferenceStore.removePinnedGroups(v.id);
					}

					const index: number = pinnedCollection.values.indexOf(v);
					pinnedCollection.values.splice(index, 1);

					if (!sortedCollection.searchText || v[sortedCollection.property].toLowerCase().includes(sortedCollection.searchText.toLowerCase()))
					{
						sortedCollection.push(v);
					}
					else
					{
						const modelIndex: number = selectableTableRowModels.value.visualValues.findIndex(m => m.key = v.id);
						selectableTableRowModels.value.visualValues.splice(modelIndex, 1);
					}
				}
				else
				{
					if (isFilter)
					{
						stores.userPreferenceStore.addPinnedFilter(v.id);
					}
					else if (isGroup)
					{
						stores.userPreferenceStore.addPinnedGroup(v.id);
					}

					const index: number = sortedCollection.values.indexOf(v);

					sortedCollection.values.splice(index, 1);
					pinnedCollection.push(v);
				}

				sortRows();
			},
			onDelete: function ()
			{
				if (onDelete)
				{
					onDelete(v);
				}
			}
		}
	}

	function sortRows()
	{
		selectableTableRowModels.value.visualValues.sort((a, b) =>
		{
			if (pinnedCollection.values.find(pc => pc.id == a.key) && pinnedCollection.values.find(pc => pc.id == b.key))
			{
				return pinnedCollection.values.findIndex(pc => pc.id == a.key) >= pinnedCollection.values.findIndex(pc => pc.id == b.key) ? 1 : -1;
			}
			else if (pinnedCollection.values.find(pc => pc.id == a.key))
			{
				return -1;
			}
			else if (pinnedCollection.values.find(pc => pc.id == b.key))
			{
				return 1;
			}

			return sortedCollection.values.findIndex(sc => sc.id == a.key) >= sortedCollection.values.findIndex(sc => sc.id == b.key) ? 1 : -1;
		});
	}
}

export function createCollapsibleTableRowModels<T extends { [key: string]: any } & IIdentifiable>(
	dataType: DataType, collapsibleTableRowModels: Ref<InfiniteScrollCollection<CollapsibleTableRowModel>>, sortedCollection: SortedCollection<T>,
	pinnedCollection: SortedCollection<T>, getValues: (value: T) => TableRowValue[], onEdit: (value: T) => void, onDelete: (value: T) => void)
{
	const isPassword = dataType == DataType.Passwords;
	const isValue = dataType == DataType.NameValuePairs;

	collapsibleTableRowModels.value.setValues([]);
	const temp: CollapsibleTableRowModel[] = [];

	if (isPassword)
	{
		switch (stores.passwordStore.activeAtRiskPasswordType)
		{
			case AtRiskType.Old:
				stores.passwordStore.oldPasswords.value.forEach(p =>
				{
					addAtRiskValues(`This Password hasn't been updated in ${stores.settingsStore.oldPasswordDays} days`, stores.passwordStore.passwords.filter(pw => pw.id == p)[0]);
				});
				break;
			case AtRiskType.Duplicate:
				stores.passwordStore.duplicatePasswords.value.forEach(p =>
				{
					addAtRiskValues("This Password is used more than once", stores.passwordStore.passwords.filter(pw => pw.id == p)[0]);
				});
				break;
			case AtRiskType.Weak:
				stores.passwordStore.weakPasswords.value.forEach(p =>
				{
					const passwordStore: ReactivePassword = stores.passwordStore.passwords.filter(pw => pw.id == p)[0];
					addAtRiskValues(passwordStore.isWeakMessage, passwordStore);
				});
				break;
			case AtRiskType.ContainsLogin:
				stores.passwordStore.containsLoginPasswords.value.forEach(p =>
				{
					addAtRiskValues("This Password contains its Username", stores.passwordStore.passwords.filter(pw => pw.id == p)[0]);
				});
				break;
			case AtRiskType.Breached:
				stores.passwordStore.breachedPasswords.forEach(p =>
				{
					const onClick = () =>
					{
						stores.popupStore.showBreachedPasswordPopup(p);
					};

					addAtRiskValues("This domain had a data breach. Click to learn more!",
						stores.passwordStore.passwords.filter(pw => pw.id == p)[0], onClick);
				});
				break;
		}
	}
	else if (isValue)
	{
		switch (stores.valueStore.activeAtRiskValueType)
		{
			case AtRiskType.Old:
				stores.valueStore.oldNameValuePairs.value.forEach(v =>
				{
					addAtRiskValues(`This Value hasn't been updated in ${stores.settingsStore.oldPasswordDays} days`, stores.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
				});
				break;
			case AtRiskType.Duplicate:
				stores.valueStore.duplicateNameValuePairs.value.forEach(v =>
				{
					addAtRiskValues("This Value is used more than once", stores.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
				});
				break;
			case AtRiskType.WeakVerabl:
				stores.valueStore.weakVerbalValues.value.forEach(v =>
				{
					const valueStore: ReactiveValue = stores.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0];
					addAtRiskValues(valueStore.isWeakMessage, stores.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
				});
				break;
			case AtRiskType.Weak:
				stores.valueStore.weakPasscodeValues.value.forEach(v =>
				{
					const valueStore: ReactiveValue = stores.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0];
					addAtRiskValues(valueStore.isWeakMessage, stores.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
				});
		}
	}

	temp.push(...pinnedCollection.values.map(v => buildModel(v)));
	temp.push(...sortedCollection.calculatedValues.map(v => buildModel(v)));

	collapsibleTableRowModels.value.setValues(temp);

	function addAtRiskValues<U extends IIdentifiable>(message: string, value: U, onClick?: () => void)
	{
		pinnedCollection.remove(value.id);
		sortedCollection.remove(value.id);

		temp.push(buildModel(value as any as T, message, onClick))
	}

	function buildModel(v: T, atRiskMessage?: string, onAtRiskClicked?: () => void): CollapsibleTableRowModel
	{
		return {
			id: uuidv4(),
			isPinned: ((isPassword && stores.userPreferenceStore.pinnedPasswords.hasOwnProperty(v.id)) ||
				(isValue && stores.userPreferenceStore.pinnedValues.hasOwnProperty(v.id))),
			data: v,
			values: getValues(v),
			atRiskModel:
			{
				message: atRiskMessage ?? "",
				onClick: onAtRiskClicked
			},
			onEdit: function ()
			{
				onEdit(v);
			},
			onDelete: function ()
			{
				onDelete(v);
			},
			onPin: function ()
			{
				if (!isPassword && !isValue)
				{
					return;
				}

				if ((isPassword && stores.userPreferenceStore.pinnedPasswords.hasOwnProperty(v.id)) ||
					(isValue && stores.userPreferenceStore.pinnedValues.hasOwnProperty(v.id)))
				{
					if (isPassword)
					{
						stores.userPreferenceStore.removePinnedPasswords(v.id);
					}
					else if (isValue)
					{
						stores.userPreferenceStore.removePinnedValues(v.id);
					}

					const index: number = pinnedCollection.values.indexOf(v);
					pinnedCollection.values.splice(index, 1);

					let activeFilters: Filter[] = [];
					if (isPassword || isValue)
					{
						activeFilters = isPassword ?
							stores.filterStore.activePasswordFilters : stores.filterStore.activeNameValuePairFilters;
					}

					if (!sortedCollection.searchText || v[sortedCollection.property].toLowerCase().includes(sortedCollection.searchText.toLowerCase()))
					{
						if (activeFilters.length == 0 || activeFilters.filter(f => v.filters.includes(f.id)).length > 0)
						{
							sortedCollection.push(v);
						}
						else
						{
							const modelIndex: number = collapsibleTableRowModels.value.visualValues.findIndex(m => m.data = v);
							collapsibleTableRowModels.value.visualValues.splice(modelIndex, 1);
						}
					}
					else
					{
						const modelIndex: number = collapsibleTableRowModels.value.visualValues.findIndex(m => m.data = v);
						collapsibleTableRowModels.value.visualValues.splice(modelIndex, 1);
					}
				}
				else
				{
					if (isPassword)
					{
						stores.userPreferenceStore.addPinnedPassword(v.id);
					}
					else if (isValue)
					{
						stores.userPreferenceStore.addPinnedValue(v.id);
					}
					const index: number = sortedCollection.values.indexOf(v);

					sortedCollection.values.splice(index, 1);
					pinnedCollection.push(v);
				}

				collapsibleTableRowModels.value.visualValues.sort((a, b) =>
				{
					if (a.atRiskModel != undefined && b.atRiskModel != undefined)
					{
						return collapsibleTableRowModels.value.visualValues.indexOf(a) >= collapsibleTableRowModels.value.visualValues.indexOf(b) ? 1 : -1;
					}
					else if (a.atRiskModel != undefined)
					{
						return -1;
					}
					else if (b.atRiskModel != undefined)
					{
						return 1;
					}
					else if (pinnedCollection.values.includes(a.data) && pinnedCollection.values.includes(b.data))
					{
						return pinnedCollection.values.indexOf(a.data) >= pinnedCollection.values.indexOf(b.data) ? 1 : -1;
					}
					else if (pinnedCollection.values.includes(a.data))
					{
						return -1;
					}
					else if (pinnedCollection.values.includes(b.data))
					{
						return 1;
					}

					return sortedCollection.values.indexOf(a.data) >= sortedCollection.values.indexOf(b.data) ? 1 : -1;
				});
			}
		}
	}
}

export function getEmptyTableMessage(dataName: string)
{
	return `You currently don't have any ${dataName}. Click '+' to add one`
}

export function getNoValuesApplyToFilterMessage(dataName: string)
{
	return `There are no ${dataName} that apply to all active filters. Please try deactivating some filters or add more ${dataName}`
}

export function getObjectPopupEmptyTableMessage(emptyDataName: string, currentDataName: string, tab: string)
{
	return `You don't have any ${emptyDataName} to add to this ${currentDataName}. Click on the 'Add ${tab}' tab to add one`;
}
