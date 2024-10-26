import { SortedCollection } from "../Objects/DataStructures/SortedCollections";
import { CollapsibleTableRowModel, SelectableTableRowData, SortableHeaderModel, TableRowValue } from "../Types/Models";
import { Ref, computed, ref } from "vue";
import InfiniteScrollCollection from "../Objects/DataStructures/InfiniteScrollCollection";
import app from "../Objects/Stores/AppStore";
import { ReactiveValue } from "../Objects/Stores/ReactiveValue";
import { ReactivePassword } from "../Objects/Stores/ReactivePassword";
import { api } from "../API";
import { DataType, AtRiskType, Filter } from "../Types/DataTypes";
import { HeaderDisplayField } from "../Types/Fields";
import { IIdentifiable } from "@vaultic/shared/Types/Fields";

export function createSortableHeaderModels<T extends { [key: string]: any } & IIdentifiable>(activeHeaderTracker: Ref<number>, headerDisplayField: HeaderDisplayField[],
    sortableCollection: SortedCollection<T>, pinnedCollection?: SortedCollection<T>, updateModels?: () => void): SortableHeaderModel[]
{
    return headerDisplayField.map((header, index) =>
    {
        const sortableHeaderModel: SortableHeaderModel =
        {
            isActive: computed(() => activeHeaderTracker.value == index),
            name: header.displayName,
            descending: ref(true),
            clickable: header.clickable,
            width: header.width,
            padding: header.padding,
            centered: header.centered,
            headerSpaceRight: header.headerSpaceRight,
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
    getValues: (value: T) => TableRowValue[], selectable: boolean, isActiveProp: string, sortOnClick: boolean, onClick?: (value: T) => Promise<void>, onEdit?: (value: T) => void, onDelete?: (value: T) => void)
{
    const isFilter = groupFilterType == DataType.Filters;
    const isGroup = groupFilterType == DataType.Groups;

    selectableTableRowModels.value.setValues([]);
    const temp: Promise<SelectableTableRowData>[] = [];

    if (isGroup)
    {
        if (passwordValueType == DataType.Passwords)
        {
            switch (app.currentVault.groupStore.activeAtRiskPasswordGroupType)
            {
                case AtRiskType.Empty:
                    app.currentVault.groupStore.emptyPasswordGroups.forEach(g =>
                    {
                        addAtRiskValues("There are no Passwords in this Group", app.currentVault.groupStore.passwordGroups.filter(gr => gr.id.value == g)[0]);
                    });
                    break;
                case AtRiskType.Duplicate:
                    Object.keys(app.currentVault.groupStore.duplicatePasswordGroups).forEach(g =>
                    {
                        addAtRiskValues("This Group has the same Passwords as another Group", app.currentVault.groupStore.passwordGroups.filter(gr => gr.id.value == g)[0]);
                    });
                    break;
            }
        }
        else if (passwordValueType == DataType.NameValuePairs)
        {
            switch (app.currentVault.groupStore.activeAtRiskValueGroupType)
            {
                case AtRiskType.Empty:
                    app.currentVault.groupStore.emptyValueGroups.forEach(g =>
                    {
                        addAtRiskValues("There are no Values in this Group", app.currentVault.groupStore.valuesGroups.filter(gr => gr.id.value == g)[0]);
                    });
                    break;
                case AtRiskType.Duplicate:
                    Object.keys(app.currentVault.groupStore.duplicateValueGroups).forEach(g =>
                    {
                        addAtRiskValues("This Group has the same Values as another Group", app.currentVault.groupStore.valuesGroups.filter(gr => gr.id.value == g)[0]);
                    });
                    break;
            }
        }
    }
    else if (isFilter)
    {
        if (passwordValueType == DataType.Passwords)
        {
            switch (app.currentVault.filterStore.activeAtRiskPasswordFilterType)
            {
                case AtRiskType.Empty:
                    app.currentVault.filterStore.emptyPasswordFilters.forEach(v =>
                    {
                        addAtRiskValues("There are no Passwords that apply to this Filter", app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == v)[0]);
                    });
                    break;
                case AtRiskType.Duplicate:
                    Object.keys(app.currentVault.filterStore.duplicatePasswordFilters).forEach(v =>
                    {
                        addAtRiskValues("This Filter applies to the same Passwords as another Filter", app.currentVault.filterStore.passwordFilters.filter(f => f.id.value == v)[0]);
                    });
            }
        }
        else if (passwordValueType == DataType.NameValuePairs)
        {
            switch (app.currentVault.filterStore.activeAtRiskValueFilterType)
            {
                case AtRiskType.Empty:
                    app.currentVault.filterStore.emptyValueFilters.forEach(v =>
                    {
                        addAtRiskValues("There are no Values that apply to this Filter", app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == v)[0]);
                    });
                    break;
                case AtRiskType.Duplicate:
                    Object.keys(app.currentVault.filterStore.duplicateValueFilters).forEach(v =>
                    {
                        addAtRiskValues("This Filter applies to the same Values as another Filter", app.currentVault.filterStore.nameValuePairFilters.filter(f => f.id.value == v)[0]);
                    });
            }
        }
    }

    temp.push(...pinnedCollection.values.map(v => buildModel(v)));
    temp.push(...sortedCollection.calculatedValues.map(v => buildModel(v)));

    Promise.all(temp).then((rows) =>
    {
        selectableTableRowModels.value.setValues(rows);
    });

    function addAtRiskValues<U extends IIdentifiable>(message: string, value: U)
    {
        pinnedCollection.remove(value.id.value);
        sortedCollection.remove(value.id.value);

        temp.push(buildModel(value as any as T, message));
    }

    async function buildModel(v: T, message?: string): Promise<SelectableTableRowData>
    {
        const id = await api.utilities.generator.uniqueId();
        return {
            id: id,
            key: v.id.value,
            selectable: selectable,
            isPinned: ((isFilter && app.userPreferences.pinnedFilters.hasOwnProperty(v.id.value)) ||
                (isGroup && app.userPreferences.pinnedGroups.hasOwnProperty(v.id.value))),
            isActive: ref(v[isActiveProp]?.value ?? false),
            values: getValues(v),
            atRiskModel:
            {
                message: message ?? "",
            },
            onClick: async function ()
            {
                if (onClick)
                {
                    await onClick(v);
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
                if (((isFilter && app.userPreferences.pinnedFilters.hasOwnProperty(v.id.value)) ||
                    (isGroup && app.userPreferences.pinnedGroups.hasOwnProperty(v.id.value))))
                {
                    if (isFilter)
                    {
                        app.userPreferences.removePinnedFilters(v.id.value);
                    }
                    else if (isGroup)
                    {
                        app.userPreferences.removePinnedGroups(v.id.value);
                    }

                    const index: number = pinnedCollection.values.indexOf(v);
                    pinnedCollection.values.splice(index, 1);

                    if (!sortedCollection.searchText || v[sortedCollection.property].toLowerCase().includes(sortedCollection.searchText.toLowerCase()))
                    {
                        sortedCollection.push(v);
                    }
                    else
                    {
                        const modelIndex: number = selectableTableRowModels.value.visualValues.findIndex(m => m.key = v.id.value);
                        selectableTableRowModels.value.visualValues.splice(modelIndex, 1);
                    }
                }
                else
                {
                    if (isFilter)
                    {
                        app.userPreferences.addPinnedFilter(v.id.value);
                    }
                    else if (isGroup)
                    {
                        app.userPreferences.addPinnedGroup(v.id.value);
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
            if (a.atRiskModel?.message && b.atRiskModel?.message)
            {
                return selectableTableRowModels.value.visualValues.indexOf(a) >= selectableTableRowModels.value.visualValues.indexOf(b) ? 1 : -1;
            }
            else if (a.atRiskModel?.message)
            {
                return -1;
            }
            else if (b.atRiskModel?.message)
            {
                return 1;
            }
            else if (pinnedCollection.values.find(pc => pc.id.value == a.key) && pinnedCollection.values.find(pc => pc.id.value == b.key))
            {
                return pinnedCollection.values.findIndex(pc => pc.id.value == a.key) >= pinnedCollection.values.findIndex(pc => pc.id.value == b.key) ? 1 : -1;
            }
            else if (pinnedCollection.values.find(pc => pc.id.value == a.key))
            {
                return -1;
            }
            else if (pinnedCollection.values.find(pc => pc.id.value == b.key))
            {
                return 1;
            }

            return sortedCollection.values.findIndex(sc => sc.id.value == a.key) >= sortedCollection.values.findIndex(sc => sc.id.value == b.key) ? 1 : -1;
        });
    }
}

export async function createCollapsibleTableRowModels<T extends { [key: string]: any } & IIdentifiable>(
    dataType: DataType, collapsibleTableRowModels: Ref<InfiniteScrollCollection<CollapsibleTableRowModel>>, sortedCollection: SortedCollection<T>,
    pinnedCollection: SortedCollection<T>, getValues: (value: T) => TableRowValue[], onEdit: (value: T) => void, onDelete: (value: T) => void)
{
    const isPassword = dataType == DataType.Passwords;
    const isValue = dataType == DataType.NameValuePairs;

    collapsibleTableRowModels.value.setValues([]);
    const temp: Promise<CollapsibleTableRowModel>[] = [];

    if (isPassword)
    {
        switch (app.currentVault.passwordStore.activeAtRiskPasswordType)
        {
            case AtRiskType.Old:
                app.currentVault.passwordStore.oldPasswords.value.forEach(p =>
                {
                    addAtRiskValues(`This Password hasn't been updated in ${app.settings.oldPasswordDays} days`, app.currentVault.passwordStore.passwords.filter(pw => pw.id.value == p)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.passwordStore.duplicatePasswords.value.forEach(p =>
                {
                    addAtRiskValues("This Password is used more than once", app.currentVault.passwordStore.passwords.filter(pw => pw.id.value == p)[0]);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.passwordStore.weakPasswords.value.forEach(p =>
                {
                    const passwordStore: ReactivePassword = app.currentVault.passwordStore.passwords.filter(pw => pw.id.value == p)[0];
                    addAtRiskValues(passwordStore.isWeakMessage.value, passwordStore);
                });
                break;
            case AtRiskType.ContainsLogin:
                app.currentVault.passwordStore.containsLoginPasswords.value.forEach(p =>
                {
                    addAtRiskValues("This Password contains its Username", app.currentVault.passwordStore.passwords.filter(pw => pw.id.value == p)[0]);
                });
                break;
            case AtRiskType.Breached:
                app.currentVault.passwordStore.breachedPasswords.forEach(p =>
                {
                    const onClick = () =>
                    {
                        app.popups.showBreachedPasswordPopup(p);
                    };

                    addAtRiskValues("This domain had a data breach. Click to learn more!",
                        app.currentVault.passwordStore.passwords.filter(pw => pw.id.value == p)[0], onClick);
                });
                break;
        }
    }
    else if (isValue)
    {
        switch (app.currentVault.valueStore.activeAtRiskValueType)
        {
            case AtRiskType.Old:
                app.currentVault.valueStore.oldNameValuePairs.value.forEach(v =>
                {
                    addAtRiskValues(`This Value hasn't been updated in ${app.settings.oldPasswordDays} days`, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id.value == v)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.valueStore.duplicateNameValuePairs.value.forEach(v =>
                {
                    addAtRiskValues("This Value is used more than once", app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id.value == v)[0]);
                });
                break;
            case AtRiskType.WeakPhrase:
                app.currentVault.valueStore.weakPassphraseValues.value.forEach(v =>
                {
                    const valueStore: ReactiveValue = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id.value == v)[0];
                    addAtRiskValues(valueStore.isWeakMessage.value, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id.value == v)[0]);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.valueStore.weakPasscodeValues.value.forEach(v =>
                {
                    const valueStore: ReactiveValue = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id.value == v)[0];
                    addAtRiskValues(valueStore.isWeakMessage.value, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id.value == v)[0]);
                });
        }
    }

    temp.push(...pinnedCollection.values.map(v => buildModel(v)));
    temp.push(...sortedCollection.calculatedValues.map(v => buildModel(v)));

    const rows = await Promise.all(temp);
    collapsibleTableRowModels.value.setValues(rows);

    function addAtRiskValues<U extends IIdentifiable>(message: string, value: U, onClick?: () => void)
    {
        pinnedCollection.remove(value.id.value);
        sortedCollection.remove(value.id.value);

        temp.push(buildModel(value as any as T, message, onClick))
    }

    async function buildModel(v: T, atRiskMessage?: string, onAtRiskClicked?: () => void): Promise<CollapsibleTableRowModel>
    {
        const id = await api.utilities.generator.uniqueId();
        return {
            id: id,
            isPinned: ((isPassword && app.userPreferences.pinnedPasswords.hasOwnProperty(v.id.value)) ||
                (isValue && app.currentVault.vaultPreferencesStore.hasOwnProperty(v.id.value))),
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

                if ((isPassword && app.userPreferences.pinnedPasswords.hasOwnProperty(v.id.value)) ||
                    (isValue && app.userPreferences.pinnedValues.hasOwnProperty(v.id.value)))
                {
                    if (isPassword)
                    {
                        app.userPreferences.removePinnedPasswords(v.id.value);
                    }
                    else if (isValue)
                    {
                        app.userPreferences.removePinnedValues(v.id.value);
                    }

                    const index: number = pinnedCollection.values.indexOf(v);
                    pinnedCollection.values.splice(index, 1);

                    let activeFilters: Filter[] = [];
                    if (isPassword || isValue)
                    {
                        activeFilters = isPassword ?
                            app.currentVault.filterStore.activePasswordFilters : app.currentVault.filterStore.activeNameValuePairFilters;
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
                        app.userPreferences.addPinnedPassword(v.id.value);
                    }
                    else if (isValue)
                    {
                        app.userPreferences.addPinnedValue(v.id.value);
                    }
                    const index: number = sortedCollection.values.indexOf(v);

                    sortedCollection.values.splice(index, 1);
                    pinnedCollection.push(v);
                }

                collapsibleTableRowModels.value.visualValues.sort((a, b) =>
                {
                    if (a.atRiskModel?.message && b.atRiskModel?.message)
                    {
                        return collapsibleTableRowModels.value.visualValues.indexOf(a) >= collapsibleTableRowModels.value.visualValues.indexOf(b) ? 1 : -1;
                    }
                    else if (a.atRiskModel?.message)
                    {
                        return -1;
                    }
                    else if (b.atRiskModel?.message)
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

export function getObjectPopupEmptyTableMessage(emptyDataName: string, currentDataName: string, tab: string, creating: boolean)
{
    if (creating)
    {
        return `You don't have any ${emptyDataName} to add to this ${currentDataName}. Click on the 'Add ${tab}' tab to add one`;
    }

    return `You don't have any ${emptyDataName} to add to this ${currentDataName}`;
}
