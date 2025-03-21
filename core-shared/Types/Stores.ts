import { getObjectFromPath, PropertyManagerConstructor } from "../Utilities/PropertyManagers";
import { Field, FieldMap, IFieldedObject, NonArrayType, Primitive } from "./Fields";

// Enforced to ensure the logic to track changes always works
// Note: Every nested Object should be wrapped in KnownMappdFields<>
type StoreStateProperty = Field<NonArrayType<Primitive>> | FieldMap | Field<NonArrayType<IFieldedObject>>;

export interface StoreState
{
    [key: string]: any;
    version: number;
}

export interface SimplifiedPasswordStore
{
    o?: Map<string, Map<string, string>>;
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

export interface StoreStateChanges
{
    [key: string]: PathChange[];
}

export interface PathChange
{
    /** Type */
    t: StoreStateChangeType;
    /** Value - Add and Upate Only */
    v?: any;
    /** Property - Update and Delete Only */
    p?: string;
}

export class PendingStoreState<T extends StoreState, U extends string>
{
    state: T;
    retriever: StorePathRetriever<U>;
    changes: StoreStateChanges;
    objProxyChanges: Map<string, string[]>;

    constructor(state: T, pathRetriever: StorePathRetriever<U>)
    {
        this.state = state;
        this.retriever = pathRetriever;
        this.changes = {};
        this.objProxyChanges = new Map();
    }

    proxifyObject(identifier: U, obj: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        return new Proxy(obj, this.getHandler(path, this.objProxyChanges));
    }

    commitProxyObject(identifier: U, updatedObj: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        const proxyChanges = this.objProxyChanges.get(path);

        if (!proxyChanges || proxyChanges.length == 0)
        {
            return;
        }

        const currentObj = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(currentObj);

        for (let i = 0; i < proxyChanges.length; i++)
        {
            if (manager.get(proxyChanges[i], currentObj) === manager.get(proxyChanges[i], updatedObj))
            {
                continue;
            }

            manager.set(proxyChanges[i], manager.get(proxyChanges[i], updatedObj), currentObj);

            if (!this.changes[path])
            {
                this.changes[path] = [];
            }

            this.changes[path].push({
                t: StoreStateChangeType.Update,
                v: manager.get(proxyChanges[i], updatedObj),
                p: proxyChanges[i]
            });
        }
    }

    addValue(identifier: U, property: string, value: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        if (!this.changes[path])
        {
            this.changes[path] = [];
        }

        this.changes[path].push({
            t: StoreStateChangeType.Add,
            v: value,
            p: property
        });

        const obj = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.set(property, value, obj);
    }

    updateValue(identifier: U, property: string, value: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        if (!this.changes[path])
        {
            this.changes[path] = [];
        }

        this.changes[path].push({
            t: StoreStateChangeType.Update,
            v: value,
            p: property
        });

        const obj = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.set(property, value, obj);
    }

    deleteValue(identifier: U, property: string, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        if (!this.changes[path])
        {
            this.changes[path] = [];
        }

        this.changes[path].push({
            t: StoreStateChangeType.Delete,
            p: property
        });

        const obj = getObjectFromPath(path, this.state);
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
