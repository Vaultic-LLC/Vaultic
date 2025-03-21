export type ManagableObject = { [key: string | number]: any } & Array<any> & Map<any, any>;

export class PropertyManagerConstructor
{
    static getFor(obj: any)
    {
        if (obj instanceof Map)
        {
            return new MapPropertyManager();
        }
        else if (obj instanceof Array)
        {
            return new ArrayPropertyManager();
        }

        return new ObjectPropertyManager();
    }
}

/** Typed Object Helper Methods */
export class OH
{
    static size<T extends { [key: string]: any }>(obj: T): number
    {
        return Object.keys(obj).length;
    }

    static mapWhere<T extends { [key: string]: any }, U>(obj: T, predicate: (value: T[keyof T]) => boolean, select: (value: T[keyof T]) => U): U[]
    {
        const values: U[] = [];
        Object.values(obj).forEach(v =>
        {
            if (predicate(v))
            {
                values.push(select(v));
            }
        });

        return values;
    }

    static forEachKey<T extends { [key: string]: any }>(obj: T, predicate: (key: string) => void)
    {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++)
        {
            predicate(keys[i]);
        }
    }

    static forEachValue<T extends { [key: string]: any }>(obj: T, predicate: (value: T[keyof T]) => void)
    {
        const values = Object.values(obj);
        for (let i = 0; i < values.length; i++)
        {
            predicate(values[i]);
        }
    }
}

export class ObjectPropertyManager<T extends { [key: string | number]: any }>
{
    keys(obj: T): any[]
    {
        return Object.keys(obj);
    }

    get(key: any, obj: T)
    {
        return obj[key];
    }

    set(key: any, value: any, obj: T)
    {
        obj[key] = value;
    }

    delete(key: any, obj: T)
    {
        delete obj[key];
    }
}

export class MapPropertyManager extends ObjectPropertyManager<Map<any, any>>
{
    keys(obj: Map<any, any>)
    {
        return obj.keyArray();
    }

    get(key: any, obj: Map<any, any>)
    {
        return obj.get(key);
    }

    set(key: any, value: any, obj: Map<any, any>)
    {
        obj.set(key, value)
    }

    delete(key: any, obj: Map<any, any>)
    {
        obj.delete(key);
    }
}

export class ArrayPropertyManager extends ObjectPropertyManager<Array<any>>
{
    keys(obj: Array<any>)
    {
        return Array.from(obj.keys());
    }

    get(key: any, obj: Array<any>)
    {
        return obj[key];
    }

    set(key: any, value: any, obj: Array<any>)
    {
        obj[key] = value;
    }

    delete(key: any, obj: Array<any>)
    {
        obj.splice(key, 1);
    }
}

export function getObjectFromPath(path: string, start: any): any
{
    const paths = path.split('.');
    let lastObject = start;

    for (let i = 0; i < paths.length; i++)
    {
        const manager = PropertyManagerConstructor.getFor(lastObject);
        lastObject = manager.get(paths[i], lastObject as unknown as ManagableObject);
    }

    return lastObject;
}