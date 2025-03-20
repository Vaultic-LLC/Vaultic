import { AtRiskModel, GroupIconModel, TableRowModel } from "../Types/Models";
import app from "../Objects/Stores/AppStore";
import { ReactiveValue } from "../Objects/Stores/ReactiveValue";
import { ReactivePassword } from "../Objects/Stores/ReactivePassword";
import { DataType, AtRiskType, IPrimaryDataObject, ISecondaryDataObject, Group } from "../Types/DataTypes";
import { IIdentifiable } from "@vaultic/shared/Types/Fields";

export function getFilterGroupTableRowModels<T extends ISecondaryDataObject>(groupFilterType: DataType, passwordValueType: DataType, allValues: T[])
    : [TableRowModel[], TableRowModel[]]
{
    let models: TableRowModel[] = [];
    let pinnedModels: TableRowModel[] = [];

    if (groupFilterType == DataType.Groups && passwordValueType == DataType.Passwords && app.currentVault.groupStore.activeAtRiskPasswordGroupType != AtRiskType.None)
    {
        switch (app.currentVault.groupStore.activeAtRiskPasswordGroupType)
        {
            case AtRiskType.Empty:
                app.currentVault.groupStore.emptyPasswordGroups.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Passwords in this Group", app.currentVault.groupStore.passwordGroupsByID.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.groupStore.duplicatePasswordGroups.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Group has the same Passwords as another Group", app.currentVault.groupStore.passwordGroupsByID.get(k)!);
                });
                break;
        }
    }
    else if (groupFilterType == DataType.Groups && passwordValueType == DataType.NameValuePairs && app.currentVault.groupStore.activeAtRiskValueGroupType != AtRiskType.None)
    {
        switch (app.currentVault.groupStore.activeAtRiskValueGroupType)
        {
            case AtRiskType.Empty:
                app.currentVault.groupStore.emptyValueGroups.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Values in this Group", app.currentVault.groupStore.valueGroupsByID.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.groupStore.duplicateValueGroups.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Group has the same Values as another Group", app.currentVault.groupStore.valueGroupsByID.get(k)!);
                });
                break;
        }
    }
    else if (groupFilterType == DataType.Filters && passwordValueType == DataType.Passwords && app.currentVault.filterStore.activeAtRiskPasswordFilterType != AtRiskType.None)
    {
        switch (app.currentVault.filterStore.activeAtRiskPasswordFilterType)
        {
            case AtRiskType.Empty:
                app.currentVault.filterStore.emptyPasswordFilters.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Passwords that apply to this Filter", app.currentVault.filterStore.passwordFiltersByID.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.filterStore.duplicatePasswordFilters.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Filter applies to the same Passwords as another Filter", app.currentVault.filterStore.passwordFiltersByID.get(k)!);
                });
        }
    }
    else if (groupFilterType == DataType.Filters && passwordValueType == DataType.NameValuePairs && app.currentVault.filterStore.activeAtRiskValueFilterType != AtRiskType.None)
    {
        switch (app.currentVault.filterStore.activeAtRiskValueFilterType)
        {
            case AtRiskType.Empty:
                app.currentVault.filterStore.emptyValueFilters.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Values that apply to this Filter", app.currentVault.filterStore.nameValuePairFiltersByID.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.filterStore.duplicateValueFilters.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Filter applies to the same Values as another Filter", app.currentVault.filterStore.nameValuePairFiltersByID.get(k)!);
                });
        }
    }
    else
    {
        allValues.map(v => buildModel(v));

    }

    return [models, pinnedModels];

    function addAtRiskValues<U extends IIdentifiable>(message: string, value: U)
    {
        buildModel(value as any as T, message);
    }

    function buildModel(v: T, message?: string)
    {
        let atRiskModel: AtRiskModel | undefined = undefined;
        if (message)
        {
            atRiskModel = { message: message }
        }

        if (groupFilterType == DataType.Filters)
        {
            if (app.userPreferences.pinnedFilters.has(v.id))
            {
                pinnedModels.push(new TableRowModel(v.id, true, atRiskModel))
            }
            else
            {
                models.push(new TableRowModel(v.id, false, atRiskModel));
            }
        }
        else if (groupFilterType == DataType.Groups)
        {
            const group: Group = v as unknown as Group;
            const groupModels: GroupIconModel[] = [{
                icon: group.icon,
                toolTipText: group.name,
                color: group.color
            }];

            if (app.userPreferences.pinnedGroups.has(v.id))
            {
                pinnedModels.push(new TableRowModel(v.id, true, atRiskModel, {
                    groupModels: groupModels
                }));
            }
            else
            {
                models.push(new TableRowModel(v.id, false, atRiskModel, {
                    groupModels: groupModels
                }));
            }
        }
    }
}

export function getPasswordValueTableRowModels<T extends IPrimaryDataObject>(color: string, dataType: DataType, allValues: T[])
    : [TableRowModel[], TableRowModel[]]
{
    const newModels: TableRowModel[] = [];
    const pinnedModels: TableRowModel[] = [];

    if (dataType == DataType.Passwords && app.currentVault.passwordStore.activeAtRiskPasswordType != AtRiskType.None)
    {
        switch (app.currentVault.passwordStore.activeAtRiskPasswordType)
        {
            case AtRiskType.Old:
                app.currentVault.passwordStore.oldPasswords.value.forEach(p =>
                {
                    addAtRiskValues(`This Password hasn't been updated in ${app.settings.oldPasswordDays} days`, app.currentVault.passwordStore.passwords.filter(pw => pw.id == p)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.passwordStore.duplicatePasswords.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Password is used more than once. For best security, create unique Passwords.", app.currentVault.passwordStore.passwordsByID.get(k)!);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.passwordStore.weakPasswords.value.forEach(p =>
                {
                    const passwordStore: ReactivePassword = app.currentVault.passwordStore.passwords.filter(pw => pw.id == p)[0];
                    addAtRiskValues(getIsWeakMessage(passwordStore.isWeakMessage, "Password"), passwordStore);
                });
                break;
            case AtRiskType.ContainsLogin:
                app.currentVault.passwordStore.containsLoginPasswords.value.forEach(p =>
                {
                    addAtRiskValues("This Password contains its Username, which makes it easier to guess. For best secuirty, create Passwords that are hard to guess.", app.currentVault.passwordStore.passwords.filter(pw => pw.id == p)[0]);
                });
                break;
            case AtRiskType.Breached:
                app.currentVault.passwordStore.breachedPasswords.forEach(p =>
                {
                    const onClick = () =>
                    {
                        app.popups.showBreachedPasswordPopup(p);
                    };

                    addAtRiskValues("This domain had a data breach! Click here to learn more",
                        app.currentVault.passwordStore.passwords.filter(pw => pw.id == p)[0], onClick);
                });
                break;
        }
    }
    else if (dataType == DataType.NameValuePairs && app.currentVault.valueStore.activeAtRiskValueType != AtRiskType.None)
    {
        switch (app.currentVault.valueStore.activeAtRiskValueType)
        {
            case AtRiskType.Old:
                app.currentVault.valueStore.oldNameValuePairs.value.forEach(v =>
                {
                    addAtRiskValues(`This Value hasn't been updated in ${app.settings.oldPasswordDays} days`, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.valueStore.duplicateNameValuePairs.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Value is used more than once", app.currentVault.valueStore.nameValuePairsByID.get(k)!);
                });
                break;
            case AtRiskType.WeakPhrase:
                app.currentVault.valueStore.weakPassphraseValues.value.forEach(v =>
                {
                    const valueStore: ReactiveValue = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0];
                    addAtRiskValues(getIsWeakMessage(valueStore.isWeakMessage, "Value"), app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.valueStore.weakPasscodeValues.value.forEach(v =>
                {
                    const valueStore: ReactiveValue = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0];
                    addAtRiskValues(getIsWeakMessage(valueStore.isWeakMessage, "Value"), app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
                });
        }
    }
    else
    {
        allValues.map(v => buildModel(v));
    }

    return [newModels, pinnedModels];

    function addAtRiskValues<U extends IIdentifiable>(message: string, value: U, onClick?: () => void)
    {
        buildModel(value as any as T, message, onClick);
    }

    function buildModel(v: T, atRiskMessage?: string, onAtRiskClicked?: () => void)
    {
        let atRiskModel: AtRiskModel | undefined = undefined;
        if (atRiskMessage)
        {
            atRiskModel = { message: atRiskMessage, onClick: onAtRiskClicked }
        }

        const groupModels: GroupIconModel[] = [];
        if (app.activePasswordValuesTable == DataType.Passwords)
        {
            v.groups.forEach((v, k, map) => 
            {
                const group = app.currentVault.groupStore.passwordGroupsByID.get(k);
                if (!group)
                {
                    return;
                }

                addToModels(groupModels, group);
            });

            if (app.userPreferences.pinnedPasswords.has(v.id))
            {
                pinnedModels.push(new TableRowModel(v.id, true, atRiskModel, {
                    groupModels: groupModels
                }));
            }
            else
            {
                newModels.push(new TableRowModel(v.id, false, atRiskModel, {
                    groupModels: groupModels
                }));
            }
        }
        else 
        {
            v.groups.forEach((v, k, map) => 
            {
                const group = app.currentVault.groupStore.valueGroupsByID.get(k);
                if (!group)
                {
                    return;
                }

                addToModels(groupModels, group);
            });

            if (app.userPreferences.pinnedValues.has(v.id))
            {
                pinnedModels.push(new TableRowModel(v.id, true, atRiskModel, {
                    groupModels: groupModels
                }));
            }
            else
            {
                newModels.push(new TableRowModel(v.id, false, atRiskModel, {
                    groupModels: groupModels
                }));
            }
        }
    }

    function addToModels(currentModels: GroupIconModel[], group: Group)
    {
        if (currentModels.length < 4)
        {
            currentModels.push({
                icon: group.icon,
                toolTipText: group.name,
                color: group.color
            });
        }
        else
        {
            currentModels[3].icon = `+${currentModels.length - 3}`;
            currentModels[3].toolTipText += `, ${group.name}`;
            currentModels[3].color = color
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

export function getIsWeakMessage(isWeakValue: number, type: string)
{
    if (isWeakValue === 0)
    {
        return type + ` is less than 16 characters. For best security, create ${type}s that are at least 16 characters long.`;
    }
    else if (isWeakValue === 1)
    {
        return type + " does not contain and uppercase and lowercase letter. For best security, add an uppercase and lowercase letter to your " + type;
    }
    else if (isWeakValue === 2)
    {
        return type + " does not contain any numbers. For best security, add at least one number to your " + type;
    }
    else if (isWeakValue === 3)
    {
        return type + " does not contain any special characters. For best security, add at least one special character to your " + type;
    }
    else if (isWeakValue === 4)
    {
        return `Passphrase is less than 16 characters. For best security, create Passphrases that are at least 16 characters long.`;
    }

    return "";
}