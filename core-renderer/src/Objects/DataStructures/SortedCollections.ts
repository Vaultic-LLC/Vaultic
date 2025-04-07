import { ObjectPropertyManager, OH, PropertyManagerConstructor } from "@vaultic/shared/Utilities/PropertyManagers";
import app from "../../Objects/Stores/AppStore";
import { DataType, Group } from "../../Types/DataTypes";
import { TableRowModel } from "../../Types/Models";

export class SortedCollection
{
    descending: boolean | undefined;
    property: string | undefined;
    backingValues: () => { [key: string | number]: any };
    objectPropertyManager: ObjectPropertyManager<any>;

    values: TableRowModel[];                // shouldn't ever be modified, kept as a source of truth
    calculatedValues: TableRowModel[];      // Calculated values to show

    searchText: string;
    onUpdate: (() => void) | undefined;

    constructor(values: TableRowModel[], backingValues: () => { [key: string | number]: any }, property?: string, descending?: boolean)
    {
        this.descending = descending !== undefined ? descending : true;
        this.property = property;
        this.values = Array.from(values);
        this.calculatedValues = Array.from(values);
        this.backingValues = backingValues;
        this.objectPropertyManager = PropertyManagerConstructor.getFor(backingValues())
        this.searchText = "";

        this.sort(false);
    }

    public getBackingObject(id: any)
    {
        return this.objectPropertyManager.get(id, this.backingValues());
    }

    public getBackingObjectProperty(id: string | number, prop: string)
    {
        return this.getBackingObject(id)?.[prop];
    }

    protected sort(notifyUpdate: boolean)
    {
        if (this.values.length == 0 || this.descending == undefined || this.property == undefined)
        {
            this.calculatedValues = Array.from(this.values);
            return;
        }

        switch (typeof this.getBackingObjectProperty(this.values[0].id, this.property!))
        {
            case "string":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => this.getBackingObjectProperty(a.id, this.property!).localeCompare(this.getBackingObjectProperty(b.id, this.property!)))
                }
                else
                {
                    this.values = this.values.sort((a, b) => this.getBackingObjectProperty(b.id, this.property!).localeCompare(this.getBackingObjectProperty(a.id, this.property!)))
                }
                break;
            case "number":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => this.getBackingObjectProperty(a.id, this.property!) <= this.getBackingObjectProperty(b.id, this.property!) ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => this.getBackingObjectProperty(a.id, this.property!) >= this.getBackingObjectProperty(b.id, this.property!) ? 1 : -1)
                }
                break;
            case "boolean":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => this.getBackingObjectProperty(a.id, this.property!) <= this.getBackingObjectProperty(b.id, this.property!) ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => this.getBackingObjectProperty(a.id, this.property!) >= this.getBackingObjectProperty(b.id, this.property!) ? 1 : -1)
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

    updateValues(values: TableRowModel[])
    {
        this.values = Array.from(values);
        this.calculatedValues = Array.from(values);

        this.sort(false);

        this.onUpdate?.();
    }

    push(value: TableRowModel)
    {
        this.values.push(value);
        this.sort(false);

        this.onUpdate?.();
    }

    remove(id: string | number)
    {
        this.values = this.values.filter(v => v.id != id);
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

        if (this.searchText == "" || this.values.length <= 0 || typeof this.getBackingObjectProperty(this.values[0].id, this.property!) !== "string")
        {
            this.calculatedValues = Array.from(this.values);
        }
        else
        {
            this.calculatedValues = Array.from(this.values.filter(
                v => this.getBackingObjectProperty(v.id, this.property!).toLowerCase().indexOf(this.searchText.toLowerCase()) != -1))
        }

        if (notifyUpdate)
        {
            this.onUpdate?.();
        }
    }
}

export class FieldedSortedCollection extends SortedCollection
{
    constructor(values: TableRowModel[], backingValues: () => { [key: string | number]: any }, property?: string, descending?: boolean)
    {
        super(values, backingValues, property, descending)
    }

    public getBackingObjectProperty(id: string, prop: string)
    {
        return this.getBackingObject(id)?.[prop];
    }
}

export class IGroupableSortedCollection extends FieldedSortedCollection
{
    private dataType: DataType;

    constructor(dataType: DataType, values: TableRowModel[],
        backingValues: () => { [key: string | number]: any }, property?: string, descending?: boolean)
    {
        super(values, backingValues, property, descending);
        this.dataType = dataType;
    }

    protected sort(notifyUpdate: boolean)
    {
        if (this.property == "g")
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
        if (this.property == "g")
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
            this.calculatedValues = Array.from(this.values);
        }
        else
        {
            if (this.dataType == DataType.Passwords)
            {
                this.calculatedValues =
                    Array.from(this.values.filter(v => this.internalGroupSearch(this.searchText, this.backingValues()[v.id]?.g, app.currentVault.groupStore.passwordGroups)));
            }
            else if (this.dataType == DataType.NameValuePairs)
            {
                this.calculatedValues =
                    Array.from(this.values.filter(v => this.internalGroupSearch(this.searchText, this.backingValues()[v.id]?.g, app.currentVault.groupStore.valuesGroups)));
            }
        }

        if (notifyUpdate)
        {
            this.onUpdate?.();
        }
    }

    private internalGroupSort(sortedGroups: Group[])
    {
        if (this.descending)
        {
            this.values = this.values.sort((a, b) =>
            {
                if (this.backingValues()[a.id]?.g.size == 0)
                {
                    return 1;
                }

                if (this.backingValues()[b.id]?.g.size == 0)
                {
                    return -1;
                }

                return this.getLowestGroup(a, sortedGroups) >= this.getLowestGroup(b, sortedGroups) ? 1 : -1;
            });
        }
        else
        {
            this.values = this.values.sort((a, b) =>
            {
                if (this.backingValues()[a.id]?.g.size == 0)
                {
                    return -1;
                }

                if (this.backingValues()[b.id]?.g.size == 0)
                {
                    return 1;
                }

                return this.getLowestGroup(a, sortedGroups) <= this.getLowestGroup(b, sortedGroups) ? 1 : -1;
            });
        }
    }

    private getLowestGroup(item: TableRowModel, sortedGroups: Group[]): number
    {
        return Math.min(...OH.map(this.backingValues()[item.id]?.g, (id: string, _: any) => sortedGroups.findIndex(g => g.id == id)));
    }

    private internalGroupSearch(search: string, groupIds: Map<string, string>, allGroups: Group[]): boolean
    {
        const groups: Group[] = allGroups.filter(g => OH.has(groupIds, g.id));
        if (groups.length == 0)
        {
            return false;
        }

        return groups.some(g => g.n.toLowerCase().indexOf(search.toLowerCase()) != -1);
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
                if (this.backingValues()[a.id]?.vaultIDsByVaultID.size == 0)
                {
                    return 1;
                }

                if (this.backingValues()[b.id]?.vaultIDsByVaultID.size == 0)
                {
                    return -1;
                }

                return getLowestVault(this.backingValues()[a.id]?.vaultIDsByVaultID) >=
                    getLowestVault(this.backingValues()[b.id]?.vaultIDsByVaultID) ? 1 : -1;
            });
        }
        else
        {
            this.values = this.values.sort((a, b) =>
            {
                if (this.backingValues()[a.id]?.vaultIDsByVaultID.size == 0)
                {
                    return -1;
                }

                if (this.backingValues()[b.id]?.vaultIDsByVaultID.size == 0)
                {
                    return 1;
                }

                return getLowestVault(this.backingValues()[a.id]?.vaultIDsByVaultID) <=
                    getLowestVault(this.backingValues()[b.id]?.vaultIDsByVaultID) ? 1 : -1;
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
            this.calculatedValues = Array.from(this.values);
        }
        else
        {
            this.calculatedValues = Array.from(this.values.filter(v =>
            {
                const vaultIDs: Map<number, number> | undefined = this.backingValues()[v.id]?.vaultIDsByVaultID;
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
            }));
        }

        if (notifyUpdate)
        {
            this.onUpdate?.();
        }
    }
}