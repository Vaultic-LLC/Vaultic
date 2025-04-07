import { AtRiskModel, GroupIconModel, TableRowModel } from "../Types/Models";
import app from "../Objects/Stores/AppStore";
import { ReactiveValue } from "../Objects/Stores/ReactiveValue";
import { ReactivePassword } from "../Objects/Stores/ReactivePassword";
import { DataType, AtRiskType, IPrimaryDataObject, ISecondaryDataObject, Group } from "../Types/DataTypes";
import { IIdentifiable } from "@vaultic/shared/Types/Fields";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

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
                OH.forEachKey(app.currentVault.groupStore.emptyPasswordGroups, k =>
                {
                    addAtRiskValues("There are no Passwords in this Group", app.currentVault.groupStore.passwordGroupsByID[k]!);
                });
                break;
            case AtRiskType.Duplicate:
                OH.forEachKey(app.currentVault.groupStore.duplicatePasswordGroups, k =>
                {
                    addAtRiskValues("This Group has the same Passwords as another Group", app.currentVault.groupStore.passwordGroupsByID[k]!);
                });
                break;
        }
    }
    else if (groupFilterType == DataType.Groups && passwordValueType == DataType.NameValuePairs && app.currentVault.groupStore.activeAtRiskValueGroupType != AtRiskType.None)
    {
        switch (app.currentVault.groupStore.activeAtRiskValueGroupType)
        {
            case AtRiskType.Empty:
                OH.forEachKey(app.currentVault.groupStore.emptyValueGroups, k =>
                {
                    addAtRiskValues("There are no Values in this Group", app.currentVault.groupStore.valueGroupsByID[k]!);
                });
                break;
            case AtRiskType.Duplicate:
                OH.forEachKey(app.currentVault.groupStore.duplicateValueGroups, (k) =>
                {
                    addAtRiskValues("This Group has the same Values as another Group", app.currentVault.groupStore.valueGroupsByID[k]!);
                });
                break;
        }
    }
    else if (groupFilterType == DataType.Filters && passwordValueType == DataType.Passwords && app.currentVault.filterStore.activeAtRiskPasswordFilterType != AtRiskType.None)
    {
        switch (app.currentVault.filterStore.activeAtRiskPasswordFilterType)
        {
            case AtRiskType.Empty:
                OH.forEachKey(app.currentVault.filterStore.emptyPasswordFilters, (k) =>
                {
                    addAtRiskValues("There are no Passwords that apply to this Filter", app.currentVault.filterStore.passwordFiltersByID[k]!);
                });
                break;
            case AtRiskType.Duplicate:
                OH.forEachKey(app.currentVault.filterStore.duplicatePasswordFilters, (k) =>
                {
                    addAtRiskValues("This Filter applies to the same Passwords as another Filter", app.currentVault.filterStore.passwordFiltersByID[k]!);
                });
        }
    }
    else if (groupFilterType == DataType.Filters && passwordValueType == DataType.NameValuePairs && app.currentVault.filterStore.activeAtRiskValueFilterType != AtRiskType.None)
    {
        switch (app.currentVault.filterStore.activeAtRiskValueFilterType)
        {
            case AtRiskType.Empty:
                OH.forEachKey(app.currentVault.filterStore.emptyValueFilters, k =>
                {
                    addAtRiskValues("There are no Values that apply to this Filter", app.currentVault.filterStore.nameValuePairFiltersByID[k]!);
                });
                break;
            case AtRiskType.Duplicate:
                OH.forEachKey(app.currentVault.filterStore.duplicateValueFilters, k =>
                {
                    addAtRiskValues("This Filter applies to the same Values as another Filter", app.currentVault.filterStore.nameValuePairFiltersByID[k]!);
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
            if (OH.has(app.userPreferences.pinnedFilters, v.id))
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
                icon: group.i,
                toolTipText: group.n,
                color: group.c
            }];

            if (OH.has(app.userPreferences.pinnedGroups, v.id))
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
                    addAtRiskValues(`This Password hasn't been updated in ${app.settings.o} days`, app.currentVault.passwordStore.passwords.filter(pw => pw.id == p)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                OH.forEachKey(app.currentVault.passwordStore.duplicatePasswords, (k => 
                {
                    addAtRiskValues("This Password is used more than once. For best security, create unique Passwords.", app.currentVault.passwordStore.passwordsByID[k]);
                }));
                break;
            case AtRiskType.Weak:
                app.currentVault.passwordStore.weakPasswords.value.forEach(p =>
                {
                    const passwordStore: ReactivePassword = app.currentVault.passwordStore.passwords.filter(pw => pw.id == p)[0];
                    addAtRiskValues(getIsWeakMessage(passwordStore.m, "Password"), passwordStore);
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
                    addAtRiskValues(`This Value hasn't been updated in ${app.settings.o} days`, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                OH.forEachKey(app.currentVault.valueStore.duplicateNameValuePairs, (k) =>
                {
                    addAtRiskValues("This Value is used more than once", app.currentVault.valueStore.nameValuePairsByID[k]);
                });
                break;
            case AtRiskType.WeakPhrase:
                app.currentVault.valueStore.weakPassphraseValues.value.forEach(v =>
                {
                    const valueStore: ReactiveValue = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0];
                    addAtRiskValues(getIsWeakMessage(valueStore.m, "Value"), app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.valueStore.weakPasscodeValues.value.forEach(v =>
                {
                    const valueStore: ReactiveValue = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0];
                    addAtRiskValues(getIsWeakMessage(valueStore.m, "Value"), app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.id == v)[0]);
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
        if (dataType == DataType.Passwords)
        {
            let added = 0;
            OH.forEachKey(v.g, k => 
            {
                const group = app.currentVault.groupStore.passwordGroupsByID[k];
                if (!group)
                {
                    return;
                }

                added += 1;
                addToModels(added, groupModels, group);
            });

            if (OH.has(app.userPreferences.pinnedPasswords, v.id))
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
            let added = 0;
            OH.forEachKey(v.g, k => 
            {
                const group = app.currentVault.groupStore.valueGroupsByID[k];
                if (!group)
                {
                    return;
                }

                added += 1;
                addToModels(added, groupModels, group);
            });

            if (OH.has(app.userPreferences.pinnedValues, v.id))
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

    function addToModels(alreadyAdded: number, currentModels: GroupIconModel[], group: Group)
    {
        if (alreadyAdded < 5)
        {
            currentModels.push({
                icon: group.i,
                toolTipText: group.n,
                color: group.c
            });
        }
        else
        {
            currentModels[3].icon = undefined;
            currentModels[3].text = `+${alreadyAdded - 3}`;
            currentModels[3].toolTipText += `, ${group.n}`;
            currentModels[3].color = color;
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