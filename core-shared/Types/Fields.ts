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

    constructor() 
    {
        this.id = new Field("");
    }
};

export type KnownMappedFields<T> = {
    [P in keyof T]:
    T[P] extends Field<Map<any, Field<infer U>>> // Are we a Map?
    ? U extends {} // is our value an object?
    ? KnownMappedFields<U> extends never // did our nested call to knownMappedFields successed?
    ? never // it didn't, so we can just fail
    : P extends KnownMappedFieldsType // our nested call succeeded, is our key a KnownMappedField
    ? T[P] // succeeded, then our type is ok
    : never // failed, are top map is not a KnownMappedField
    : P extends KnownMappedFieldsType // U isn't an object, is our current map a KnownMappedField?
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
export type KnownMappedFieldsType = PrimaryDataObjectCollection | SecondaryDataObjectCollection | "passwordsByID" | "valuesByID" |
    "passwordFiltersByID" | "valueFiltersByID" | "passwordGroupsByID" | "valueGroupsByID" | "colorPalettes" | "pinnedDataTypes" |
    "pinnedFilters" | "pinnedGroups" | "pinnedPasswords" | "pinnedValues" | "loginHistory" | "daysLogin" | "duplicateDataTypesByID" | "duplicatePasswords" |
    "current" | "safe" | "duplicateValues" | "emptyPasswordFilters" | "emptyValueFilters" | "duplicatePasswordFilters" | "duplicateValueFilters" | "emptyPasswordGroups" |
    "emptyValueGroups" | "duplicatePasswordGroups" | "duplicateValueGroups" | "conditions" | "securityQuestions";


export const MapFields: Set<KnownMappedFieldsType> = new Set(["passwords", "values", "filters", "groups", "passwordsByID", "valuesByID",
    "passwordFiltersByID", "valueFiltersByID", "passwordGroupsByID", "valueGroupsByID", "colorPalettes", "pinnedDataTypes", "pinnedFilters",
    "pinnedGroups", "pinnedPasswords", "pinnedValues", "loginHistory", "daysLogin", "duplicateDataTypesByID", "duplicatePasswords", "current",
    "safe", "duplicateValues", "emptyPasswordFilters", "emptyValueFilters", "duplicatePasswordFilters", "duplicateValueFilters", "emptyPasswordGroups",
    "emptyValueGroups", "duplicatePasswordGroups", "duplicateValueGroups", "conditions", "securityQuestions"
]);

export class Field<T>
{
    id: string;
    value: T;
    lastModifiedTime: number;

    constructor(value: T)
    {
        this.id = "";
        this.value = value;
        this.lastModifiedTime = Date.now();
    }
}