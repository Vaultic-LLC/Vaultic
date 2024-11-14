export interface VaultKey
{
    publicKey: string;
    vaultKey: string;
};

export class ObjectPropertyManager<T>
{
    keys(obj: T)
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