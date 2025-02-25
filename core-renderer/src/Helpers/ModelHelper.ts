import { AtRiskModel, FieldedTableRowModel, GroupIconModel, TableRowModel } from "../Types/Models";
import app from "../Objects/Stores/AppStore";
import { ReactiveValue } from "../Objects/Stores/ReactiveValue";
import { ReactivePassword } from "../Objects/Stores/ReactivePassword";
import { DataType, AtRiskType, IPrimaryDataObject, ISecondaryDataObject, Group } from "../Types/DataTypes";
import { Field, IIdentifiable } from "@vaultic/shared/Types/Fields";
import { PropertyType } from "../Types/Fields";

let filterGroupModelID = 0;
export function getFilterGroupTableRowModels<T extends ISecondaryDataObject>(groupFilterType: DataType, passwordValueType: DataType, allValues: Field<T>[])
{
    let models: FieldedTableRowModel<Field<T>>[] = [];
    if (groupFilterType == DataType.Groups && passwordValueType == DataType.Passwords && app.currentVault.groupStore.activeAtRiskPasswordGroupType != AtRiskType.None)
    {
        switch (app.currentVault.groupStore.activeAtRiskPasswordGroupType)
        {
            case AtRiskType.Empty:
                app.currentVault.groupStore.emptyPasswordGroups.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Passwords in this Group", app.currentVault.groupStore.passwordGroupsByID.value.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.groupStore.duplicatePasswordGroups.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Group has the same Passwords as another Group", app.currentVault.groupStore.passwordGroupsByID.value.get(k)!);
                });
                break;
        }
    }
    else if (groupFilterType == DataType.Groups && passwordValueType == DataType.NameValuePairs && app.currentVault.groupStore.activeAtRiskValueGroupType != AtRiskType.None)
    {
        switch (app.currentVault.groupStore.activeAtRiskValueGroupType)
        {
            case AtRiskType.Empty:
                app.currentVault.groupStore.emptyValueGroups.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Values in this Group", app.currentVault.groupStore.valueGroupsByID.value.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.groupStore.duplicateValueGroups.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Group has the same Values as another Group", app.currentVault.groupStore.valueGroupsByID.value.get(k)!);
                });
                break;
        }
    }
    else if (groupFilterType == DataType.Filters && passwordValueType == DataType.Passwords && app.currentVault.filterStore.activeAtRiskPasswordFilterType != AtRiskType.None)
    {
        switch (app.currentVault.filterStore.activeAtRiskPasswordFilterType)
        {
            case AtRiskType.Empty:
                app.currentVault.filterStore.emptyPasswordFilters.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Passwords that apply to this Filter", app.currentVault.filterStore.passwordFiltersByID.value.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.filterStore.duplicatePasswordFilters.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Filter applies to the same Passwords as another Filter", app.currentVault.filterStore.passwordFiltersByID.value.get(k)!);
                });
        }
    }
    else if (groupFilterType == DataType.Filters && passwordValueType == DataType.NameValuePairs && app.currentVault.filterStore.activeAtRiskValueFilterType != AtRiskType.None)
    {
        switch (app.currentVault.filterStore.activeAtRiskValueFilterType)
        {
            case AtRiskType.Empty:
                app.currentVault.filterStore.emptyValueFilters.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("There are no Values that apply to this Filter", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(k)!);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.filterStore.duplicateValueFilters.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Filter applies to the same Values as another Filter", app.currentVault.filterStore.nameValuePairFiltersByID.value.get(k)!);
                });
        }
    }
    else
    {
        models = allValues.map(v => buildModel(v));
    }

    return models;

    function addAtRiskValues<U extends IIdentifiable>(message: string, value: Field<U>)
    {
        models.push(buildModel(value as any as Field<T>, message));
    }

    function buildModel(v: Field<T>, message?: string): FieldedTableRowModel<Field<T>>
    {
        filterGroupModelID += 1;

        let atRiskModel: AtRiskModel | undefined = undefined;
        if (message)
        {
            atRiskModel = { message: message }
        }

        return new FieldedTableRowModel(filterGroupModelID.toString(), undefined, atRiskModel, v);
    }
}

let passwordValueModelID = 0;
export function getPasswordValueTableRowModels<T extends IPrimaryDataObject>(color: string, dataType: DataType, allValues: Field<T>[])
{
    const newModels: FieldedTableRowModel<Field<T>>[] = [];
    if (dataType == DataType.Passwords && app.currentVault.passwordStore.activeAtRiskPasswordType != AtRiskType.None)
    {
        switch (app.currentVault.passwordStore.activeAtRiskPasswordType)
        {
            case AtRiskType.Old:
                app.currentVault.passwordStore.oldPasswords.value.forEach(p =>
                {
                    addAtRiskValues(`This Password hasn't been updated in ${app.settings.value.oldPasswordDays.value} days`, app.currentVault.passwordStore.passwords.filter(pw => pw.value.id.value == p)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.passwordStore.duplicatePasswords.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Password is used more than once. For best security, create unique Passwords.", app.currentVault.passwordStore.passwordsByID.value.get(k)!);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.passwordStore.weakPasswords.value.forEach(p =>
                {
                    const passwordStore: Field<ReactivePassword> = app.currentVault.passwordStore.passwords.filter(pw => pw.value.id.value == p)[0];
                    addAtRiskValues(passwordStore.value.isWeakMessage.value, passwordStore);
                });
                break;
            case AtRiskType.ContainsLogin:
                app.currentVault.passwordStore.containsLoginPasswords.value.forEach(p =>
                {
                    addAtRiskValues("This Password contains its Username, which makes it easier to guess. For best secuirty, create Passwords that are hard to guess.", app.currentVault.passwordStore.passwords.filter(pw => pw.value.id.value == p)[0]);
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
                        app.currentVault.passwordStore.passwords.filter(pw => pw.value.id.value == p)[0], onClick);
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
                    addAtRiskValues(`This Value hasn't been updated in ${app.settings.value.oldPasswordDays.value} days`, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.value.id.value == v)[0]);
                });
                break;
            case AtRiskType.Duplicate:
                app.currentVault.valueStore.duplicateNameValuePairs.value.forEach((v, k, map) =>
                {
                    addAtRiskValues("This Value is used more than once", app.currentVault.valueStore.nameValuePairsByID.value.get(k)!);
                });
                break;
            case AtRiskType.WeakPhrase:
                app.currentVault.valueStore.weakPassphraseValues.value.forEach(v =>
                {
                    const valueStore: Field<ReactiveValue> = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.value.id.value == v)[0];
                    addAtRiskValues(valueStore.value.isWeakMessage.value, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.value.id.value == v)[0]);
                });
                break;
            case AtRiskType.Weak:
                app.currentVault.valueStore.weakPasscodeValues.value.forEach(v =>
                {
                    const valueStore: Field<ReactiveValue> = app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.value.id.value == v)[0];
                    addAtRiskValues(valueStore.value.isWeakMessage.value, app.currentVault.valueStore.nameValuePairs.filter(nvp => nvp.value.id.value == v)[0]);
                });
        }
    }
    else
    {
        newModels.push(...allValues.map(v => buildModel(v)));
    }

    return newModels;

    function addAtRiskValues<U extends IIdentifiable>(message: string, value: Field<U>, onClick?: () => void)
    {
        newModels.push(buildModel(value as any as Field<T>, message, onClick))
    }

    function buildModel(v: Field<T>, atRiskMessage?: string, onAtRiskClicked?: () => void): FieldedTableRowModel<Field<T>>
    {
        passwordValueModelID += 1;

        let atRiskModel: AtRiskModel | undefined = undefined;
        if (atRiskMessage)
        {
            atRiskModel = { message: atRiskMessage, onClick: onAtRiskClicked }
        }

        const groupModels: GroupIconModel[] = [];
        if (app.activePasswordValuesTable == DataType.Passwords)
        {
            v.value.groups.value.forEach((v, k, map) => 
            {
                const group = app.currentVault.groupStore.passwordGroupsByID.value.get(k);
                if (!group)
                {
                    return;
                }

                addToModels(groupModels, group);
            });
        }
        else 
        {
            v.value.groups.value.forEach((v, k, map) => 
            {
                const group = app.currentVault.groupStore.valueGroupsByID.value.get(k);
                if (!group)
                {
                    return;
                }

                addToModels(groupModels, group);
            });
        }

        return new FieldedTableRowModel(passwordValueModelID.toString(), undefined, atRiskModel, v, {
            groupModels: groupModels
        });
    }

    function addToModels(currentModels: GroupIconModel[], group: Field<Group>)
    {
        if (currentModels.length < 4)
        {
            currentModels.push({
                icon: group.value.icon.value,
                toolTipText: group.value.name.value,
                color: group.value.color.value
            });
        }
        else
        {
            currentModels[3].icon = `+${currentModels.length - 3}`;
            currentModels[3].toolTipText += `, ${group.value.name.value}`;
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
