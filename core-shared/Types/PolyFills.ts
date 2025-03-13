import { Field } from "./Fields";

declare global 
{
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
const isFieldIdentifier = "if";

JSON.vaulticParse = (text: string) => 
{
    const childrenByParentID: Map<string, any[]> = new Map();
    return JSON.parse(text, (key: string, value: any) => 
    {
        let valueToUse = value;
        if (valueToUse && typeof valueToUse === "object")
        {
            if (isFieldIdentifier in valueToUse)
            {
                // create this first so we can add the same instance to the childByParentID that we also return
                let field = isMapIdentifier in valueToUse ? Field.fromJObjectMap(valueToUse) : Field.fromJObject(valueToUse);

                // add this as a child so that we can set its parent when we encounter it
                if (valueToUse.pID)
                {
                    if (!childrenByParentID.has(valueToUse.pID))
                    {
                        childrenByParentID.set(valueToUse.pID, []);
                    }

                    childrenByParentID.get(valueToUse.pID)?.push(field);
                }

                // set all children with a parentId of this id to this object
                if (childrenByParentID.has(valueToUse.id))
                {
                    const children = childrenByParentID.get(valueToUse.id);
                    if (children)
                    {
                        for (let i = 0; i < children.length; i++)
                        {
                            children[i].p = field;
                        }
                    }
                }

                return field;
            }
            else if (isMapIdentifier in valueToUse)
            {
                return new Map(valueToUse.value);
            }
        }

        return valueToUse;
    });
};

JSON.vaulticStringify = (value: any) => 
{
    return JSON.stringify(value, (key: string, value: any) => 
    {
        let valueToUse = value;
        if (valueToUse && typeof valueToUse === "object")
        {
            if (isFieldIdentifier in valueToUse)
            {
                // don't want to include the parent in the serialization
                const { p: _, ...fieldedObjectWithoutParent } = valueToUse;
                valueToUse = fieldedObjectWithoutParent;

                if (valueToUse.value instanceof Map)
                {
                    // return a new obj so we don't alter the existing one and cauese issue with 
                    // it being used after serialization
                    // im = isMap
                    return { ...fieldedObjectWithoutParent, im: 1, value: Array.from(valueToUse.value.entries()) };
                }
            }
            else if (valueToUse instanceof Map)
            {
                // im = isMap
                return { im: 1, value: Array.from(valueToUse.entries()) };
            }
        }

        return valueToUse;
    });
}

export const a = {};