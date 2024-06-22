import { ReactivePassword } from "../Objects/Stores/ReactivePassword";
import { IGroupable } from "../Types/EncryptedData";
import { Group } from "../Types/Table";
import { stores } from "../Objects/Stores";
import { ReactiveValue } from "../Objects/Stores/ReactiveValue";

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

    passwordGroupSort(values: ReactivePassword[], descending: boolean)
    {
        this.groupSort<ReactivePassword>(values, descending, stores.groupStore.sortedPasswordsGroups);
    }

    valuesGroupSort(values: ReactiveValue[], descending: boolean)
    {
        this.groupSort<ReactiveValue>(values, descending, stores.groupStore.sortedValuesGroups);
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
