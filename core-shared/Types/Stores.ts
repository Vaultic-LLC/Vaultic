import { getObjectFromPath, PropertyManagerConstructor } from "../Utilities/PropertyManagers";
import { Field, FieldMap, IFieldedObject, NonArrayType, Primitive } from "./Fields";

// Enforced to ensure the logic to track changes always works
// Note: Every nested Object should be wrapped in KnownMappdFields<>
type StoreStateProperty = Field<NonArrayType<Primitive>> | FieldMap | Field<NonArrayType<IFieldedObject>>;

export interface StoreState
{
    [key: string]: StoreStateProperty;
    version: Field<number>;
}

export interface SimplifiedPasswordStore
{
    passwordsByDomain?: Field<Map<string, Field<Map<string, Field<string>>>>>;
};

export type VaultStoreStates = "vaultStoreState" | "passwordStoreState" | "valueStoreState" | "filterStoreState" | "groupStoreState";

export type StorePathRetriever<T extends string> = {
    [key in T]: (...ids: string[]) => string
}

export enum StoreStateChangeType
{
    Add,
    Update,
    Delete
}

export class PendingStoreState<T extends StoreState>
{
    state: T;
    changes: { type: StoreStateChangeType, path: string, value: any }[];
    objProxyChanges: Map<string, string[]>;

    constructor(state: T)
    {
        this.state = state;
        this.changes = [];
        this.objProxyChanges = new Map();
    }

    proxifyObject(path: string, obj: any)
    {
        return new Proxy(obj, this.getHandler(path, this.objProxyChanges));
    }

    commitProxyObject(path: string, updatedObj: any)
    {
        const proxyChanges = this.objProxyChanges.get(path);
        if (!proxyChanges || proxyChanges.length == 0)
        {
            return;
        }

        const [currentObj, _] = getObjectFromPath(path, this.state, true);
        const manager = PropertyManagerConstructor.getFor(currentObj);

        for (let i = 0; i < proxyChanges.length; i++)
        {
            if (manager.get(proxyChanges[i], currentObj) === manager.get(proxyChanges[i], updatedObj))
            {
                continue;
            }

            manager.set(proxyChanges[i], manager.get(proxyChanges[i], updatedObj), currentObj);
            this.changes.push({
                type: StoreStateChangeType.Update,
                path: `${path}.${proxyChanges[i]}`,
                value: manager.get(proxyChanges[i], updatedObj)
            });
        }
    }

    addValue(path: string, value: any)
    {
        this.changes.push({
            type: StoreStateChangeType.Add,
            path,
            value
        });

        const [obj, property] = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.set(property, value, obj);
    }

    updateValue(path: string, value: any)
    {
        this.changes.push({
            type: StoreStateChangeType.Update,
            path,
            value
        });

        const [obj, property] = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.set(property, value, obj);
    }

    deleteValue(path: string, value: any)
    {
        this.changes.push({
            type: StoreStateChangeType.Delete,
            path,
            value
        });

        const [obj, property] = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.delete(property, obj);
    }

    private getHandler(path: string, objProxyChanges: Map<string, string[]>)
    {
        return {
            get(target: any, prop: any, receiver: any)
            {
                return target[prop];
            },
            set(obj: any, prop: string, newValue: any)
            {
                if (!objProxyChanges.has(path))
                {
                    objProxyChanges.set(path, []);
                }

                const changes = objProxyChanges.get(path);
                if (changes?.indexOf(prop) == -1)
                {
                    objProxyChanges.get(path)?.push(prop);
                }

                obj[prop] = newValue;
                return true;
            }
        };
    }
}