export type Primitive = string | boolean | number;

export interface IIdentifiable
{
    id: Field<string>;
}

export interface IFieldObject
{
    [key: string]: Field<Primitive | KnownMappedFields<IFieldObject> | undefined> | FieldMap;
}

export type IFieldedObject = IIdentifiable & IFieldObject;

export class FieldedObject implements IFieldedObject
{
    [key: string]: Field<Primitive | KnownMappedFields<IFieldObject>> | FieldMap;
    id: Field<string>;

    constructor(fieldConstructor: FieldConstructor) 
    {
        this.id = fieldConstructor.create("");
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

export type PrimaryDataObjectCollection = "passwords" | "values";
export type SecondaryDataObjectCollection = "filters" | "groups";

// Keyed by password / value ID
export type PrimaryDataObjectCollectionType =
    {
        [key in PrimaryDataObjectCollection]: Field<Map<string, Field<string>>>;
    }

// Keyed by filter / group ID
export type SecondaryDataObjectCollectionType =
    {
        [key in SecondaryDataObjectCollection]: Field<Map<string, Field<string>>>;
    }

// We use this to know what fields need to be specially handled when serializing / parsing objects into JSON
export type KnownFieldedMappedFieldsType = PrimaryDataObjectCollection | SecondaryDataObjectCollection | "passwordsByID" | "valuesByID" |
    "passwordFiltersByID" | "valueFiltersByID" | "passwordGroupsByID" | "valueGroupsByID" | "userColorPalettes" | "pinnedDataTypes" |
    "pinnedFilters" | "pinnedGroups" | "pinnedPasswords" | "pinnedValues" | "loginHistory" | "daysLogin" | "duplicateDataTypesByID" | "duplicatePasswords" |
    "current" | "safe" | "duplicateValues" | "emptyPasswordFilters" | "emptyValueFilters" | "duplicatePasswordFilters" | "duplicateValueFilters" | "emptyPasswordGroups" |
    "emptyValueGroups" | "duplicatePasswordGroups" | "duplicateValueGroups" | "conditions" | "securityQuestions" | "pinnedDesktopDevices" | "pinnedMobileDevices" |
    "pinnedOrganizations" | "passwordsByDomain";

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

        if (prop == "value" || prop == "forceUpdate")
        {
            obj.updateAndBubble();
        }

        return true;
    }
};

export class FieldConstructor
{
    create<T>(value: T): Field<T>
    {
        throw "Did not implement";
    }
}

export class Field<T>
{
    [key: string]: any;

    // Only used to identify when parsing JSON, should never be edited. Setting to private causes a bunch of ts errors though
    isField: number;

    parentID: string | undefined;
    parent: Field<any> | undefined;
    id: string;
    value: T;
    lastModifiedTime: number;
    forceUpdate: boolean;

    private constructor(value: T)
    {
        this.isField = 1;
        this.id = "";
        this.value = value;
        this.lastModifiedTime = Date.now();
        this.forceUpdate = false;
    }

    static create<T>(value: T, id: string): Field<T>
    {
        const field = new Field<T>(value);
        field.id = id;

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
        this.lastModifiedTime = Date.now();
        if (this.parent)
        {
            this.parent.updateAndBubble();
        }
    }

    addMapValue(key: any, value: Field<any>)
    {
        if (this.value instanceof Map)
        {
            value.parentID = this.id;
            value.parent = this;

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