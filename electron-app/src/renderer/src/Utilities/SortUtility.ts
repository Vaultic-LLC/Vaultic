import { stores } from "../Objects/Stores";
import { NameValuePairStore } from "../Objects/Stores/NameValuePairStore";
import { PasswordStore } from "../Objects/Stores/PasswordStore";
import { IGroupable } from "../Types/EncryptedData";
import { Group } from "../Types/Table";

class SortUtility
{
	constructor() { }

	defaultSort<T extends { [key: string]: string }>(values: T[], property: string, descending: boolean)
	{
		if (descending)
		{
			values = values.sort((a, b) => a[property].localeCompare(b[property]))
		}
		else
		{
			values = values.sort((a, b) => a[property].localeCompare(b[property]))
		}
	}

	passwordGroupSort(values: PasswordStore[], descending: boolean)
	{
		this.groupSort<PasswordStore>(values, descending, stores.groupStore.sortedPasswordsGroups);
	}

	valuesGroupSort(values: NameValuePairStore[], descending: boolean)
	{
		this.groupSort<NameValuePairStore>(values, descending, stores.groupStore.sortedValuesGroups);
	}

	private groupSort<T extends IGroupable>(values: T[], descending: boolean, sortedGroups: Group[])
	{
		if (descending)
		{
			values = values.sort((a, b) =>
			{
				if (a.groups.length == 0)
				{
					return -1;
				}

				if (b.groups.length == 0)
				{
					return 1;
				}

				return getHighestGroup(a) >= getHighestGroup(b) ? 1 : -1;
			})
		}
		else
		{
			values = values.sort((a, b) =>
			{
				if (a.groups.length == 0)
				{
					return 1;
				}

				if (b.groups.length == 0)
				{
					return -1;
				}

				return getHighestGroup(a) <= getHighestGroup(b) ? 1 : -1;
			})
		}

		function getHighestGroup(item: T): number
		{
			return Math.max(...item.groups.map(id => sortedGroups.findIndex(g => g.id == id)));
		}
	}
}

const sortUtility = new SortUtility();
export default sortUtility;
