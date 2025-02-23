import { Field, IIdentifiable, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import app from "../../Objects/Stores/AppStore";
import { DataType, Group } from "../../Types/DataTypes";
import { FieldedTableRowModel, TableRowModel } from "../../Types/Models";

export class SortedCollection
{
    descending: boolean | undefined;
    property: string | undefined;

    values: TableRowModel<any>[];                // shouldn't ever be modified, kept as a source of truth
    calculatedValues: TableRowModel<any>[];      // Calculated values to show

    searchText: string;
    onUpdate: (() => void) | undefined;

    constructor(values: TableRowModel<any>[], property?: string, descending?: boolean)
    {
        this.descending = descending !== undefined ? descending : true;
        this.property = property;
        this.values = [...values];
        this.calculatedValues = [...values];
        this.searchText = "";

        this.sort(false);
    }

    protected sort(notifyUpdate: boolean)
    {
        if (this.values.length == 0 || this.descending == undefined || this.property == undefined)
        {
            this.calculatedValues = [...this.values];
            return;
        }

        switch (typeof this.values[0].getBackingObjectProperty(this.property!))
        {
            case "string":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.getBackingObjectProperty(this.property!).localeCompare(b.getBackingObjectProperty(this.property!)))
                }
                else
                {
                    this.values = this.values.sort((a, b) => b.getBackingObjectProperty(this.property!).localeCompare(a.getBackingObjectProperty(this.property!)))
                }
                break;
            case "number":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.getBackingObjectProperty(this.property!) <= b.getBackingObjectProperty(this.property!) ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => a.getBackingObjectProperty(this.property!) >= b.getBackingObjectProperty(this.property!) ? 1 : -1)
                }
                break;
            case "boolean":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.getBackingObjectProperty(this.property!) <= b.getBackingObjectProperty(this.property!) ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => a.getBackingObjectProperty(this.property!) >= b.getBackingObjectProperty(this.property!) ? 1 : -1)
                }
        }

        this.search(this.searchText, notifyUpdate);
    }

    updateSort(property: string | undefined, descending: boolean | undefined, doSort: boolean)
    {
        this.descending = descending;
        this.property = property;

        if (doSort)
        {
            this.sort(true);
        }
    }

    updateValues(values: TableRowModel<any>[])
    {
        this.values = [...values];
        this.calculatedValues = [...values];

        this.sort(false);

        this.onUpdate?.();
    }

    push(value: TableRowModel<any>)
    {
        this.values.push(value);
        this.sort(false);

        this.onUpdate?.();
    }

    remove(id: string)
    {
        this.values = this.values.filter(v => v.getBackingObjectIdentifier() != id);
        this.sort(false);

        this.onUpdate?.();
    }

    search(search: string, notifyUpdate: boolean = true)
    {
        this.searchText = search;
        if (!this.property)
        {
            return;
        }

        if (this.searchText == "" || this.values.length <= 0 || typeof this.values[0].getBackingObjectProperty(this.property!) !== "string")
        {
            this.calculatedValues = [...this.values];
        }
        else
        {
            this.calculatedValues = [...this.values.filter(
                // @ts-ignore
                v => v.getBackingObjectProperty(this.property!).toLowerCase().indexOf(this.searchText.toLowerCase()) != -1)]
        }

        if (notifyUpdate)
        {
            this.onUpdate?.();
        }
    }
}

export class IGroupableSortedCollection extends SortedCollection
{
    private dataType: DataType;

    constructor(dataType: DataType, values: FieldedTableRowModel<Field<IIdentifiable & SecondaryDataObjectCollectionType>>[], property?: string,
        descending?: boolean)
    {
        super(values, property, descending);
        this.dataType = dataType;
    }

    protected sort(notifyUpdate: boolean)
    {
        if (this.property == "groups")
        {
            this.groupSort(notifyUpdate);
        }
        else
        {
            super.sort(notifyUpdate);
        }
    }

    search(search: string, notifyUpdate: boolean = true)
    {
        if (this.property == "groups")
        {
            this.groupSearch(search, notifyUpdate);
        }
        else
        {
            super.search(search, notifyUpdate);
        }
    }

    protected groupSort(notifyUpdate: boolean)
    {
        if (this.dataType == DataType.NameValuePairs)
        {
            this.internalGroupSort(app.currentVault.groupStore.sortedValuesGroups);
        }
        else if (this.dataType == DataType.Passwords)
        {
            this.internalGroupSort(app.currentVault.groupStore.sortedPasswordsGroups);
        }

        this.search(this.searchText, notifyUpdate);
    }

    protected groupSearch(search: string, notifyUpdate: boolean)
    {
        this.searchText = search;
        if (this.searchText == "")
        {
            this.calculatedValues = [...this.values];
        }
        else
        {
            if (this.dataType == DataType.Passwords)
            {
                this.calculatedValues =
                    [...this.values.filter(v => this.internalGroupSearch(this.searchText, v.backingObject?.value.groups.value, app.currentVault.groupStore.passwordGroups))];
            }
            else if (this.dataType == DataType.NameValuePairs)
            {
                this.calculatedValues =
                    [...this.values.filter(v => this.internalGroupSearch(this.searchText, v.backingObject?.value.groups.value, app.currentVault.groupStore.valuesGroups))];
            }
        }

        if (notifyUpdate)
        {
            this.onUpdate?.();
        }
    }

    private internalGroupSort(sortedGroups: Field<Group>[])
    {
        if (this.descending)
        {
            this.values = this.values.sort((a, b) =>
            {
                if (a.backingObject?.value.groups.value.size == 0)
                {
                    return 1;
                }

                if (b.backingObject?.value.groups.value.size == 0)
                {
                    return -1;
                }

                return getLowestGroup(a) >= getLowestGroup(b) ? 1 : -1;
            });
        }
        else
        {
            this.values = this.values.sort((a, b) =>
            {
                if (a.backingObject?.value.groups.value.size == 0)
                {
                    return -1;
                }

                if (b.backingObject?.value.groups.value.size == 0)
                {
                    return 1;
                }

                return getLowestGroup(a) <= getLowestGroup(b) ? 1 : -1;
            });
        }

        function getLowestGroup(item: TableRowModel<any>): number
        {
            return Math.min(...item.backingObject?.value.groups.value.map((id: string) => sortedGroups.findIndex(g => g.value.id.value == id)));
        }
    }

    private internalGroupSearch(search: string, groupIds: Map<string, Field<string>>, allGroups: Field<Group>[]): boolean
    {
        const groups: Field<Group>[] = allGroups.filter(g => groupIds.has(g.value.id.value));
        if (groups.length == 0)
        {
            return false;
        }

        return groups.some(g => g.value.name.value.toLowerCase().indexOf(search.toLowerCase()) != -1);
    }
}

export class VaultListSortedCollection extends SortedCollection
{
    protected sort(notifyUpdate: boolean)
    {
        if (this.property == "vaultIDsByVaultID")
        {
            this.vaultListSort(notifyUpdate);
        }
        else
        {
            super.sort(notifyUpdate);
        }
    }

    search(search: string, notifyUpdate: boolean = true)
    {
        if (this.property == "vaultIDsByVaultID")
        {
            this.vaultListSearch(search, notifyUpdate);
        }
        else
        {
            super.search(search, notifyUpdate);
        }
    }

    private vaultListSort(notifyUpdate: boolean)
    {
        if (this.descending)
        {
            this.values = this.values.sort((a, b) =>
            {
                if (a.backingObject?.vaultIDsByVaultID.size == 0)
                {
                    return 1;
                }

                if (b.backingObject?.vaultIDsByVaultID.size == 0)
                {
                    return -1;
                }

                return getLowestVault(a.backingObject?.vaultIDsByVaultID) >=
                    getLowestVault(b.backingObject?.vaultIDsByVaultID) ? 1 : -1;
            });
        }
        else
        {
            this.values = this.values.sort((a, b) =>
            {
                if (a.backingObject?.vaultIDsByVaultID.size == 0)
                {
                    return -1;
                }

                if (b.backingObject?.vaultIDsByVaultID.size == 0)
                {
                    return 1;
                }

                return getLowestVault(a.backingObject?.vaultIDsByVaultID) <=
                    getLowestVault(b.backingObject?.vaultIDsByVaultID) ? 1 : -1;
            });
        }

        this.search(this.searchText, notifyUpdate);

        function getLowestVault(vaultIDs: Map<number, number>)
        {
            return Math.min(...vaultIDs.map((k, v) => app.sortedUserVaultIndexByVaultID.get(k) ?? 100))
        }
    }

    private vaultListSearch(search: string, notifyUpdate: boolean)
    {
        this.searchText = search;
        if (this.searchText == "")
        {
            this.calculatedValues = [...this.values];
        }
        else
        {
            this.calculatedValues = [...this.values.filter(v =>
            {
                const vaultIDs: Map<number, number> | undefined = v.backingObject?.vaultIDsByVaultID;
                if (vaultIDs)
                {
                    for (const [key, _] of vaultIDs.entries())
                    {
                        const vault = app.userVaultsByVaultID.get(key);
                        if (vault && vault.name.toLocaleLowerCase().indexOf(this.searchText.toLowerCase()) != -1)
                        {
                            return true;
                        }
                    }
                }

                return false;
            })];
        }

        if (notifyUpdate)
        {
            this.onUpdate?.();
        }
    }
}