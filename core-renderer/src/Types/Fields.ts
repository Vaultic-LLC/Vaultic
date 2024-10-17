import { NameValuePairType } from "./DataTypes";

export type PrimaryDataObjectCollection = "passwords" | "values";
export type SecondaryDataObjectCollection = "filters" | "groups";
export type SecretProperty = "password" | "value";

export interface DisplayField
{
    backingProperty: string;
    displayName: string;
}

export interface HeaderDisplayField extends DisplayField
{
    width: string;
    clickable: boolean;
    padding?: string;
    centered?: boolean;
    headerSpaceRight?: string;
}

export interface ImportableDisplayField extends DisplayField
{
    required: boolean;
    requiresDelimiter?: boolean;
    delimiter?: string;
}

export enum PropertyType
{
    String,
    Enum,
    Object
}

export interface PropertySelectorDisplayFields extends DisplayField
{
    type: PropertyType;
    enum?: { [key: string]: string | number };
}

export const FilterablePasswordProperties: PropertySelectorDisplayFields[] = [
    {
        backingProperty: "passwordFor",
        displayName: "Password For",
        type: PropertyType.String,
    },
    {
        backingProperty: "domain",
        displayName: "Domain",
        type: PropertyType.String,
    },
    {
        backingProperty: "email",
        displayName: "Email",
        type: PropertyType.String,
    },
    {
        backingProperty: "login",
        displayName: "Username",
        type: PropertyType.String,
    },
    {
        backingProperty: "additionalInformation",
        displayName: "Additional Info",
        type: PropertyType.String,
    },
    {
        backingProperty: "groups",
        displayName: "Group Name",
        type: PropertyType.Object,
    }
]

export const FilterableValueProperties: PropertySelectorDisplayFields[] = [
    {
        backingProperty: "name",
        displayName: "Name",
        type: PropertyType.String,
    },
    {
        backingProperty: "additionalInformation",
        displayName: "Additional Info",
        type: PropertyType.String,
    },
    {
        backingProperty: "valueType",
        displayName: "Type",
        type: PropertyType.Enum,
        enum: NameValuePairType,
    },
    {
        backingProperty: "groups",
        displayName: "Group Name",
        type: PropertyType.Object,
    }
];


const fieldHandler =
{
    get(target, prop, _)
    {
        return target[prop];
    },
    set(obj: Field<any>, prop: string, newValue: any)
    {
        obj.lastModifiedTime = Date.now();
        obj[prop] = newValue;

        return true;
    }
};

export interface GroupCSVHeader 
{
    csvHeader: string;
    delimiter?: string;
}

class Field<T>
{
    value?: T;
    lastModifiedTime: number;
    width: string;
    height: string;
    x: number;
    y: number;
    component?: string;
    mask?: string;

    constructor()
    {
    }
}

export class FieldConstructor
{
    constructor() { }

    new<T>()
    {
        return new Proxy(new Field<T>(), fieldHandler);
    }
}