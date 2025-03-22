import { uniqueIDGenerator } from "../Utilities/UniqueIDGenerator";
import { DictionaryAsList } from "./Stores";

export type Primitive = string | boolean | number;

export interface IIdentifiable
{
    id: string;
}

export interface IFieldObject
{
    [key: string]: Field<Primitive | KnownMappedFields<IFieldObject> | undefined> | FieldMap;
}

export type IFieldedObject = IIdentifiable & IFieldObject;

export class FieldedObject implements IFieldedObject
{
    [key: string]: Field<Primitive | KnownMappedFields<IFieldObject>> | FieldMap;
    id: string;

    constructor() 
    {
        this.id = "";
    }
};

export type KnownMappedFields<T> = {
    [P in keyof T]:
    T[P] extends Field<Map<any, Field<infer U>>> // Are we a Map?
    ? U extends {} // is our value an object?
    ? KnownMappedFields<U> extends never // did our nested call to knownMappedFields successed?
    ? never // it didn't, so we can just fail
    : P extends KnownFieldedMappedFieldsType // our nested call succeeded, is our key a KnownMappedField
    ? T[P] // succeeded, then our type is ok
    : never // failed, are top map is not a KnownMappedField
    : P extends KnownFieldedMappedFieldsType // U isn't an object, is our current map a KnownMappedField?
    ? T[P] // It is, so we are ok
    : never // it isn't, so we fail
    : T[P] extends IFieldedObject // we aren't a map, check if we are an object
    ? KnownMappedFields<T[P]> // we are an object, return nested call
    : T[P]; // just return our self
}

export type NonArrayType<T> = T extends any[] ? never : T;

// @ts-ignore
export type FieldMap = Field<Map<any, Field<NonArrayType<Primitive | KnownMappedFields<IFieldedObject> | FieldMap>>>>;

// p = Passwords
// v = Values
export type PrimaryDataObjectCollection = "p" | "v";

// i = Filters
// g = Groups
export type SecondaryDataObjectCollection = "i" | "g";

// Keyed by password / value ID
export type PrimaryDataObjectCollectionType =
    {
        [key in PrimaryDataObjectCollection]: DictionaryAsList;
    }

// Keyed by filter / group ID
export type SecondaryDataObjectCollectionType =
    {
        [key in SecondaryDataObjectCollection]: DictionaryAsList;
    }

// We use this to know what fields need to be specially handled when serializing / parsing objects into JSON
export type KnownFieldedMappedFieldsType = PrimaryDataObjectCollection | SecondaryDataObjectCollection | "p" | "v" |
    "t" |
    "f" | "g" | "v" | "d" |
    "current" | "safe" | "d" | "w" | "l" | "u" |
    "c" | "q" | "d" | "m" |
    "o" | "h";

export type KnownUnfieldedMappedFieldsType = "membersByUserID" | "vaultIDsByVaultID";

export const FieldProxy =
{
    get(target: any, prop: any, receiver: any)
    {
        return target[prop];
    },
    set(obj: Field<any>, prop: string, newValue: any)
    {
        obj[prop] = newValue;

        if (prop == "value")
        {
            obj.updateAndBubble();
        }

        return true;
    }
};

export class Field<T>
{
    [key: string]: any;

    // isField. Only used to identify when parsing JSON, should never be edited. Setting to private causes a bunch of ts errors though
    if: number;

    // parentID
    pID: string | undefined;

    // parent
    p: Field<any> | undefined;

    id: string;
    value: T;

    // last modified time
    mt: number;

    private constructor(value: T)
    {
        this.if = 1;
        this.id = "";
        this.value = value;
        this.mt = Date.now();
    }

    static create<T>(value: T): Field<T>
    {
        const field = new Field<T>(value);
        field.id = uniqueIDGenerator.generate();

        return new Proxy(field, FieldProxy);
    }

    static fromJObject(obj: any): Field<any>
    {
        const field = new Field(obj.value);
        Object.assign(field, obj);
        return new Proxy(field, FieldProxy);
    }

    static fromJObjectMap(obj: any): Field<Map<any, any>>
    {
        const field = new Field(new Map());

        const { isMap, ...objWithoutIsMap } = obj;
        Object.assign(field, objWithoutIsMap);

        field.value = new Map(obj.value);
        return new Proxy(field, FieldProxy);
    }

    updateAndBubble()
    {
        this.mt = Date.now();
        if (this.p)
        {
            this.p.updateAndBubble();
        }
    }

    addMapValue(key: any, value: Field<any>)
    {
        if (this.value instanceof Map)
        {
            value.pID = this.id;
            value.p = this;

            this.value.set(key, value);
            this.updateAndBubble();
        }
    }

    removeMapValue(key: any)
    {
        if (this.value instanceof Map)
        {
            this.value.delete(key);
            this.updateAndBubble();
        }
    }
}

export enum RandomValueType
{
    Password = "Password",
    Passphrase = "Passphrase"
}