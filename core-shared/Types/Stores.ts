import { getObjectFromPath, PropertyManagerConstructor } from "../Utilities/PropertyManagers";
import { defaultColorPalettes, emptyUserColorPalettes } from "./Color";
import { computed, Reactive, reactive, ref } from "vue";

export enum AutoLockTime
{
    OneMinute = "1 Minute",
    FiveMinutes = "5 Minuts",
    FifteenMinutes = "15 Minutes",
    ThirtyMinutes = "30 Minutes"
}

export enum FilterStatus
{
    And = "And",
    Or = "Or"
}

export class CurrentAndSafeStructure
{
    /** Current */
    c: number[];
    /** Safe */
    s: number[];

    constructor()
    {
        this.c = [];
        this.s = [];
    }
}

export enum StoreType
{
    App = "0",
    UserPreferences = "1",
    Vault = "2",
    VaultPreferences = "3",
    Password = "4",
    Value = "5",
    Filter = "6",
    Group = "7",
    Device = "8",
    VaultDataBreach = "9",
    Organization = "10"
}

export interface StoreState
{
    [key: string]: any;
    version: number;
}

/** Used for when storing a list of something. We can't use arrays or change tracking since the order isn't guranteeded
 to maintain when serializating / deserializing. Value as boolean is just the smallest type to save on space  */
export interface DictionaryAsList
{
    [key: string]: boolean;
}

/** We can't use arrays or change tracking since the order isn't guranteeded
 to maintain when serializating / deserializing and we don't want to use 
 maps since they are slower to serialize */
export interface DoubleKeyedObject
{
    [key: string]: DictionaryAsList;
}

export interface SimplifiedPasswordStore
{
    o?: DoubleKeyedObject;
};

export type VaultStoreStates = "vaultStoreState" | "passwordStoreState" | "valueStoreState" | "filterStoreState" | "groupStoreState";

export interface StateKeys 
{
};

export type StorePathRetriever<T extends StateKeys> = {
    [key in keyof T]: (...ids: string[]) => string
}

export enum StoreStateChangeType
{
    Add,
    Update,
    Delete
}

export interface PathChange
{
    /** Type */
    t: StoreStateChangeType;
    /** Value - Add and Upate Only */
    v?: any;
    /** Property */
    p: string;
}

export type ModifyBridge = { [key: string]: Function };

export class PendingStoreState<T extends StoreState, U extends StateKeys>
{
    state: T;
    retriever: StorePathRetriever<U>;
    changes: { [key: string]: PathChange[] };
    objProxyChanges: { [key:string]: string[] };

    constructor(state: T, pathRetriever: StorePathRetriever<U>)
    {
        this.state = state;
        this.retriever = pathRetriever;
        this.changes = {};
        this.objProxyChanges = {};
    }

    getObject(identifier: keyof U, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        return getObjectFromPath(path, this.state);
    }

    proxifyObject(identifier: keyof U, obj: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        return new Proxy(obj, this.getHandler(path));
    }

    /**
     * Used to create a custom Reactive value for binding in vue. Needed since Ref and Reactive use their own proxy
     * but we still want to have our own to track changes as well. This allows both
     * @param identifier The path to the object
     * @param obj The object to make a custom ref for
     * @param ids Ids to the path of the object
     * @returns 
     */
    createCustomRef<T extends { [key: string]: any }>(identifier: keyof U, obj: T, ...ids: string[]): Reactive<T>
    {
        const path = this.retriever[identifier](...ids);

        const _crObj: { [key: string]: any } = {}
        const keys = Object.keys(obj);

        const temp: { [key: string]: any } = {}

        const onSet = (prop: string) => this.onObjPropertySet(path, prop);
        for (let i = 0; i < keys.length; i++)
        {
            _crObj[keys[i]] = ref(obj[keys[i]]);
            temp[keys[i]] = computed({
                get() 
                {
                    return _crObj[keys[i]].value;
                },
                set(val)
                {
                    onSet(keys[i]);
                    _crObj[keys[i]].value = val;
                }
            });
        }

        return reactive(temp) as Reactive<T>;
    }

    commitProxyObject(identifier: keyof U, updatedObj: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        const proxyChanges = this.objProxyChanges[path];

        if (!proxyChanges || proxyChanges.length == 0)
        {
            return;
        }

        const objToUes = this.checkCleanObject(updatedObj);

        const currentObj = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(currentObj);

        for (let i = 0; i < proxyChanges.length; i++)
        {
            if (manager.get(proxyChanges[i], currentObj) === manager.get(proxyChanges[i], objToUes))
            {
                continue;
            }

            manager.set(proxyChanges[i], manager.get(proxyChanges[i], objToUes), currentObj);

            if (!this.changes[path])
            {
                this.changes[path] = [];
            }

            this.changes[path].push({
                t: StoreStateChangeType.Update,
                v: manager.get(proxyChanges[i], objToUes),
                p: proxyChanges[i]
            });
        }
    }

    addValue(identifier: keyof U, property: string, value: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        if (!this.changes[path])
        {
            this.changes[path] = [];
        }

        const valueToUse = this.checkCleanObject(value);

        this.changes[path].push({
            t: StoreStateChangeType.Add,
            v: valueToUse,
            p: property
        });

        const obj = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.set(property, valueToUse, obj);
    }

    updateValue(identifier: keyof U, property: string, value: any, ...ids: string[])
    {
        const path = this.retriever[identifier](...ids);
        if (!this.changes[path])
        {
            this.changes[path] = [];
        }

        const valueToUse = this.checkCleanObject(value);

        this.changes[path].push({
            t: StoreStateChangeType.Update,
            v: valueToUse,
            p: property
        });

        const obj = getObjectFromPath(path, this.state);
        const manager = PropertyManagerConstructor.getFor(obj);

        manager.set(property, valueToUse, obj);
    }

    deleteValue(identifier: keyof U, property: string, ...ids: string[])
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

    private getHandler(path: string)
    {
        const onSet = (prop: string) => this.onObjPropertySet(path, prop);
        return {
            get(target: any, prop: any, receiver: any)
            {
                return target[prop];
            },
            set(obj: any, prop: string, newValue: any)
            {
                obj[prop] = newValue;
                return onSet(prop);
            }
        };
    }

    private onObjPropertySet(path: string, prop: string)
    {
        if (!this.objProxyChanges[path])
        {
            this.objProxyChanges[path] = [];
        }

        const changes = this.objProxyChanges[path];
        if (changes?.indexOf(prop) == -1)
        {
            this.objProxyChanges[path]?.push(prop);
        }

        return true;
    }

    private checkCleanObject(value: any): any
    {
        if (typeof value === "object")
        {
            // Break any references to this object so that any updates done after adding it
            // don't accidentally alter the object in the store state
            return JSON.parse(JSON.stringify(value));
        }

        return value;
    }
}

export function defaultAppStoreState()
{
    return {
        version: 0,
        s: {
            c: emptyUserColorPalettes,
            a: AutoLockTime.OneMinute,
            f: FilterStatus.Or,
            o: 365,
            p: 1,
            v: 25,
            r: 7,
            n: true,
            s: true,
            m: true,
            e: '-',
            t: true,
            q: false,
            y: 15
        }
    };
}

export function defaultUserPreferencesStoreState()
{
    return {
        version: 0,
        c: { p: defaultColorPalettes.get('m84ezgwm7')! },
        t: {},
        o: {},
        a: {}
    };
};

export function defaultVaultStoreState()
{
    return {
        version: 0,
        s: {},
        l: []
    }
};

export function defaultPasswordStoreState()
{
    return {
        version: 0,
        p: {},
        o: {},
        d: {},
        c: new CurrentAndSafeStructure(),
        h: {}
    }
};

export function defaultValueStoreState()
{
    return {
        version: 0,
        v: {},
        d: {},
        c: new CurrentAndSafeStructure(),
        h: {}
    }
};

export function defaultFilterStoreState()
{
    return {
        version: 0,
        p: {},
        v: {},
        w: {},
        l: {},
        o: {},
        u: {},
    }
};

export function defaultGroupStoreState()
{
    return {
        version: 0,
        p: {},
        v: {},
        w: {},
        l: {},
        o: {},
        u: {},
    }
};