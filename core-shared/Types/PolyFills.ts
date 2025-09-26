declare global 
{
    interface Object
    {
        has: (prop: string) => boolean;
    }

    interface Set<T>
    {
        difference: (other: Set<T>) => Set<T>
    }

    interface Map<K, V>
    {
        difference(other: Map<K, V>): Map<K, V>;
        keyArray(): K[];
        valueArray(): V[];
        filter(predicate: (k: K, v: V) => boolean): Map<K, V>;
        map<T>(select: (k: K, v: V) => T): T[];
        mapWhere<T>(prediate: (k: K, v: V) => boolean, select: (k: K, v: V) => T): T[];
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
            temp.set(item[0], item[1]);
        }
    }

    return temp;
}

Map.prototype.keyArray = function (this: Map<any, any>)
{
    return Array.from(this.keys());
}

Map.prototype.valueArray = function (this: Map<any, any>)
{
    return Array.from(this.values());
}

Map.prototype.filter = function (this: Map<any, any>, predicate: (k: any, v: any) => boolean): Map<any, any>
{
    const temp = new Map();
    this.forEach((v, k, map) => 
    {
        if (predicate(k, v))
        {
            temp.set(k, v);
        }
    });

    return temp;
}

Map.prototype.map = function <T>(this: Map<any, any>, select: (k: any, v: any) => T): T[]
{
    const temp: T[] = [];
    this.forEach((v, k, map) => 
    {
        temp.push(select(k, v));
    });

    return temp;
}

Map.prototype.mapWhere = function <T>(this: Map<any, any>, predicate: (k: any, v: any) => boolean, select: (k: any, v: any) => T): T[]
{
    const temp: T[] = [];
    this.forEach((v, k, map) => 
    {
        if (predicate(k, v))
        {
            temp.push(select(k, v));
        }
    });

    return temp;
}

const isMapIdentifier = "im";

JSON.vaulticParse = (text: string) => 
{
    const childrenByParentID: Map<string, any[]> = new Map();
    return JSON.parse(text, (key: string, value: any) => 
    {
        if (value && typeof value === "object")
        {
            if (isMapIdentifier in value)
            {
                return new Map(value.value);
            }
        }

        return value;
    });
};

JSON.vaulticStringify = (value: any) => 
{
    return JSON.stringify(value, (key: string, value: any) => 
    {
        if (value && typeof value === "object")
        {
            if (value instanceof Map)
            {
                // im = isMap
                return { im: 1, value: Array.from(value.entries()) };
            }
        }

        return value;
    });
}

export const a = {};