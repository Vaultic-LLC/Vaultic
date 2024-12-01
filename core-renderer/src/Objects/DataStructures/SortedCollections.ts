import { Field } from "@vaultic/shared/Types/Fields";
import app from "../../Objects/Stores/AppStore";
import { DataType, Group } from "../../Types/DataTypes";
import { TableRowModel } from "../../Types/Models";
import { rowChunkAmount } from "../../Constants/Misc";

export class SortedCollection
{
    descending: boolean | undefined;
    property: string | undefined;

    values: TableRowModel[];                // shouldn't ever be modified, kept as a source of truth
    calculatedValues: TableRowModel[];      // Calculated values based on search text
    visualValues: TableRowModel[];          // The values to actually render

    searchText: string;
    onUpdate: (() => void) | undefined;

    private currentID: number;

    constructor(values: TableRowModel[], property?: string, descending?: boolean)
    {
        this.descending = descending;
        this.property = property;
        this.values = [...values];
        this.calculatedValues = [...values];
        this.visualValues = [];
        this.searchText = "";
        this.currentID = 0;

        this.sort(false);
        this.loadNextChunk();
    }

    loadNextChunk()
    {
        this.visualValues.push(...this.calculatedValues.splice(0, 200))
    }

    protected sort(notifyUpdate: boolean)
    {
        if (this.values.length == 0 || this.descending == undefined || this.property == undefined)
        {
            this.calculatedValues = [...this.values];
            return;
        }

        switch (typeof this.values[0].backingObject?.value[this.property].value)
        {
            case "string":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.backingObject?.value[this.property!].value.localeCompare(b.backingObject?.value[this.property!].value))
                }
                else
                {
                    this.values = this.values.sort((a, b) => b.backingObject?.value[this.property!].value.localeCompare(a.backingObject?.value[this.property!].value))
                }
                break;
            case "number":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.backingObject?.value[this.property!].value <= b.backingObject?.value[this.property!].value ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => a.backingObject?.value[this.property!].value >= b.backingObject?.value[this.property!].value ? 1 : -1)
                }
                break;
            case "boolean":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.backingObject?.value[this.property!].value <= b.backingObject?.value[this.property!].value ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => a.backingObject?.value[this.property!].value >= b.backingObject?.value[this.property!].value ? 1 : -1)
                }
        }

        this.search(this.searchText, notifyUpdate);
        this.updateIDs();
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
        this.values = [...values];
        this.calculatedValues = [...values];

        this.sort(false);

        this.visualValues = [];
        this.loadNextChunk();

        this.onUpdate?.();
    }

    push(value: TableRowModel)
    {
        this.values.push(value);
        this.sort(false);

        this.visualValues = [];
        this.loadNextChunk();

        this.onUpdate?.();
    }

    remove(id: string)
    {
        this.values = this.values.filter(v => v.backingObject?.value.id.value != id);
        this.sort(false);

        this.visualValues = [];
        this.loadNextChunk();

        this.onUpdate?.();
    }

    search(search: string, notifyUpdate: boolean = true)
    {
        this.searchText = search;
        if (!this.property)
        {
            return;
        }

        if (this.searchText == "" || this.values.length <= 0 || typeof this.values[0].backingObject?.value[this.property].value !== "string")
        {
            this.calculatedValues = [...this.values];
        }
        else
        {
            this.calculatedValues = [...this.values.filter(
                // @ts-ignore
                v => v.backingObject?.value[this.property].value.toLowerCase().indexOf(this.searchText.toLowerCase()) != -1)]
        }

        if (notifyUpdate)
        {
            this.updateIDs();

            this.visualValues = [];
            this.loadNextChunk();

            this.onUpdate?.();
        }
    }

    protected updateIDs()
    {
        //this.calculatedValues.forEach(v => v.id = (this.currentID++).toString());
    }
}

export class IGroupableSortedCollection extends SortedCollection
{
    private dataType: DataType;

    constructor(dataType: DataType, values: TableRowModel[], property?: string, descending?: boolean)
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
        super.updateIDs();
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
            this.updateIDs();

            this.visualValues = [];
            this.loadNextChunk();

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

        function getLowestGroup(item: TableRowModel): number
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
