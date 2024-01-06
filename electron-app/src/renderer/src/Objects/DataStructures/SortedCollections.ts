import { IGroupable, IIdentifiable } from "../../Types/EncryptedData";
import { DataType, Group } from "../../Types/Table";
import { stores } from "../Stores";

export class SortedCollection<T extends { [key: string]: string } & IIdentifiable>
{
	descending: boolean;
	property: string;
	values: T[];
	calculatedValues: T[];
	searchText: string;

	constructor(values: T[], property: string)
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

		switch (typeof this.values[0][this.property])
		{
			case "string":
				if (this.descending)
				{
					this.values = this.values.sort((a, b) => a[this.property].localeCompare(b[this.property]))
				}
				else
				{
					this.values = this.values.sort((a, b) => b[this.property].localeCompare(a[this.property]))
				}
				break;
			case "number":
				if (this.descending)
				{
					this.values = this.values.sort((a, b) => a[this.property] <= b[this.property] ? 1 : -1)
				}
				else
				{
					this.values = this.values.sort((a, b) => a[this.property] >= b[this.property] ? 1 : -1)
				}
				break;
			case "boolean":
				if (this.descending)
				{
					this.values = this.values.sort((a, b) => a[this.property] <= b[this.property] ? 1 : -1)
				}
				else
				{
					this.values = this.values.sort((a, b) => a[this.property] >= b[this.property] ? 1 : -1)
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

	updateValues(values: T[])
	{
		this.values = [...values];
		this.calculatedValues = [...values];
		this.sort();
	}

	push(value: T)
	{
		this.values.push(value);
		this.sort();
	}

	remove(id: string)
	{
		this.values = this.values.filter(v => v.id != id);
	}

	search(search: string)
	{
		this.searchText = search;
		if (this.searchText == "" || this.values.length <= 0 || typeof this.values[0][this.property] !== "string")
		{
			this.calculatedValues = this.values;
		}
		else
		{
			this.calculatedValues = this.values.filter(
				v => v[this.property].toLowerCase().indexOf(this.searchText.toLowerCase()) != -1)
		}
	}
}

export class IGroupableSortedCollection<T extends IGroupable & { [key: string]: string } & IIdentifiable>
	extends SortedCollection<T>
{
	dataType: DataType;
	constructor(dataType: DataType, values: T[], property: string)
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
			this.internalGroupSort(stores.groupStore.sortedValuesGroups);
		}
		else if (this.dataType == DataType.Passwords)
		{
			this.internalGroupSort(stores.groupStore.sortedPasswordsGroups);
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
					this.values.filter(v => this.internalGroupSearch(this.searchText, v.groups, stores.groupStore.passwordGroups));
			}
			else if (this.dataType == DataType.NameValuePairs)
			{
				this.calculatedValues =
					this.values.filter(v => this.internalGroupSearch(this.searchText, v.groups, stores.groupStore.valuesGroups))

			}
		}
	}

	private internalGroupSort(sortedGroups: Group[])
	{
		if (this.descending)
		{
			this.values = this.values.sort((a, b) =>
			{
				if (a.groups.length == 0)
				{
					return 1;
				}

				if (b.groups.length == 0)
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
				if (a.groups.length == 0)
				{
					return -1;
				}

				if (b.groups.length == 0)
				{
					return 1;
				}

				return getLowestGroup(a) <= getLowestGroup(b) ? 1 : -1;
			})
		}

		function getLowestGroup(item: T): number
		{
			return Math.min(...item.groups.map(id => sortedGroups.findIndex(g => g.id == id)));
		}
	}

	private internalGroupSearch(search: string, groupIds: string[], allGroups: Group[]): boolean
	{
		const groups: Group[] = allGroups.filter(g => groupIds.includes(g.id));
		if (groups.length == 0)
		{
			return false;
		}

		return groups.some(g => g.name.toLowerCase().indexOf(search.toLowerCase()) != -1);
	}
}
