export type Primitive = number | string | boolean;

export interface IIdentifiable
{
    id: Field<string>;
}

export interface IFieldObject
{
    [key: string]: Field<any>;
}

// TODO: fix to make sure all store state properties, and nested properties that are maps are in KnownMappedFieldsTypes
export type KnownMappedFields<T> =
    {
        [P in keyof T]: T[P] extends Map<any, any> ? P extends KnownMappedFieldsType ? T[P] : never : T[P] extends {} ? KnownMappedFields<T[P]> : T[P];
    }

export type NonArrayType<T> = T extends any[] ? never : T;
export type FieldedObject = IIdentifiable & IFieldObject;
export type FieldMap = Field<Map<any, Field<NonArrayType<Primitive> | FieldMap | FieldedObject>>>;

export type PrimaryDataObjectCollection = "passwords" | "values";
export type SecondaryDataObjectCollection = "filters" | "groups";
export type PinnedDataTypes = ""

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

export type KnownMappedFieldsType = PrimaryDataObjectCollection | SecondaryDataObjectCollection;

export const MapFields: Set<KnownMappedFieldsType> = new Set(["passwords", "values", "filters", "groups"]);

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