import { MapFields } from "./Fields";

declare global 
{
    interface Set<T>
    {
        difference: (other: Set<T>) => Set<T>
    }

    interface Map<K, V>
    {
        difference: (other: Map<K, V>) => Map<K, V>;
    }

    interface JSON 
    {
        vaulticParse: (text: string) => any;
        vaulticStringify: (value: any) => string;
    }
}

Map.prototype.difference = function (this: Map<any, any>, other: Map<any, any>)
{
    const temp = new Map();
    for (let item of this)
    {
        if (!other.has(item[0]))
        {
            temp[item[0]] = item[1];
        }
    }

    return temp;
}

JSON.vaulticParse = (text: string) => 
{
    return JSON.parse(text, (key: string, value: any) => 
    {
        if (MapFields.has(key as any))
        {
            return { ...value, value: new Map(value.value) }
            value.value = new Map(value.value);
        }

        return value;
    });
};

JSON.vaulticStringify = (value: any) => 
{
    return JSON.stringify(value, (key: string, value: any) => 
    {
        if (MapFields.has(key as any))
        {
            return { ...value, value: Array.from(value.value.entries()) };
            value.value = Array.from(value.value.entries());
        }

        return value;
    });
}

export const a = {};