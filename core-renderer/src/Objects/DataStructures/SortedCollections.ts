
import { Field, IIdentifiable } from "@vaultic/shared/Types/Fields";
import app from "../../Objects/Stores/AppStore";
import { IGroupable, DataType, Group } from "../../Types/DataTypes";

export class SortedCollection<T extends { [key: string]: any } & IIdentifiable>
{
    descending: boolean;
    property: string;
    values: Field<T>[];
    calculatedValues: Field<T>[];
    searchText: string;

    constructor(values: Field<T>[], property: string)
    {
        this.descending = true;
        this.property = property;
        this.values = [...values];
        this.calculatedValues = [...values];
        this.searchText = "";

        this.sort();
    }

    protected sort()
    {
        if (this.values.length == 0)
        {
            return;
        }

        switch (typeof this.values[0].value[this.property])
        {
            case "string":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.value[this.property].localeCompare(b.value[this.property]))
                }
                else
                {
                    this.values = this.values.sort((a, b) => b.value[this.property].localeCompare(a.value[this.property]))
                }
                break;
            case "number":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.value[this.property] <= b.value[this.property] ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => a.value[this.property] >= b.value[this.property] ? 1 : -1)
                }
                break;
            case "boolean":
                if (this.descending)
                {
                    this.values = this.values.sort((a, b) => a.value[this.property] <= b.value[this.property] ? 1 : -1)
                }
                else
                {
                    this.values = this.values.sort((a, b) => a.value[this.property] >= b.value[this.property] ? 1 : -1)
                }
        }

        this.search(this.searchText);
    }

    updateSort(property: string, descending: boolean)
    {
        this.descending = descending;
        this.property = property;

        this.sort();
    }

    updateValues(values: Field<T>[])
    {
        this.values = [...values];
        this.calculatedValues = [...values];
        this.sort();
    }

    push(value: Field<T>)
    {
        this.values.push(value);
        this.sort();
    }

    remove(id: string)
    {
        this.values = this.values.filter(v => v.value.id.value != id);
        this.calculatedValues = this.calculatedValues.filter(v => v.value.id.value != id);
    }

    search(search: string)
    {
        this.searchText = search;
        if (this.searchText == "" || this.values.length <= 0 || typeof this.values[0].value[this.property] !== "string")
        {
            this.calculatedValues = this.values;
        }
        else
        {
            this.calculatedValues = this.values.filter(
                v => v.value[this.property].toLowerCase().indexOf(this.searchText.toLowerCase()) != -1)
        }
    }
}

export class IGroupableSortedCollection<T extends IGroupable & { [key: string]: string } & IIdentifiable>
    extends SortedCollection<T>
{
    dataType: DataType;
    constructor(dataType: DataType, values: Field<T>[], property: string)
    {
        super(values, property);
        this.dataType = dataType;
    }

    protected sort()
    {
        if (this.property == "groups")
        {
            this.groupSort();
        }
        else
        {
            super.sort();
        }
    }

    search(search: string)
    {
        if (this.property == "groups")
        {
            this.groupSearch(search);
        }
        else
        {
            super.search(search);
        }
    }

    groupSort()
    {
        if (this.dataType == DataType.NameValuePairs)
        {
            this.internalGroupSort(app.currentVault.groupStore.sortedValuesGroups);
        }
        else if (this.dataType == DataType.Passwords)
        {
            this.internalGroupSort(app.currentVault.groupStore.sortedPasswordsGroups);
        }

        this.search(this.searchText);
    }

    groupSearch(search: string)
    {
        this.searchText = search;
        if (this.searchText == "")
        {
            this.calculatedValues = this.values;
        }
        else
        {
            if (this.dataType == DataType.Passwords)
            {
                this.calculatedValues =
                    this.values.filter(v => this.internalGroupSearch(this.searchText, v.value.groups.value, app.currentVault.groupStore.passwordGroups));
            }
            else if (this.dataType == DataType.NameValuePairs)
            {
                this.calculatedValues =
                    this.values.filter(v => this.internalGroupSearch(this.searchText, v.value.groups.value, app.currentVault.groupStore.valuesGroups));
            }
        }
    }

    private internalGroupSort(sortedGroups: Field<Group>[])
    {
        if (this.descending)
        {
            this.values = this.values.sort((a, b) =>
            {
                if (a.value.groups.value.size == 0)
                {
                    return 1;
                }

                if (b.value.groups.value.size == 0)
                {
                    return -1;
                }

                return getLowestGroup(a) >= getLowestGroup(b) ? 1 : -1;
            })
        }
        else
        {
            this.values = this.values.sort((a, b) =>
            {
                if (a.value.groups.value.size == 0)
                {
                    return -1;
                }

                if (b.value.groups.value.size == 0)
                {
                    return 1;
                }

                return getLowestGroup(a) <= getLowestGroup(b) ? 1 : -1;
            })
        }

        function getLowestGroup(item: Field<T>): number
        {
            return Math.min(...item.value.groups.value.map(id => sortedGroups.findIndex(g => g.value.id.value == id)));
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
