import { NameValuePairType } from "./DataTypes";
import { Field } from "@vaultic/shared/Types/Fields";

export type SecretProperty = "password" | "value";

export type SecretPropertyType<T extends SecretProperty> =
    {
        [K in T]: Field<string>;
    }

export interface PasswordSecretProperty extends SecretPropertyType<"password"> { };
export interface ValueSecretProperty extends SecretPropertyType<"value"> { }

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

export interface GroupCSVHeader 
{
    csvHeader: string;
    delimiter?: string;
}

interface DataTypeViewTemplate 
{
    id: string;

    // these will be undefined if we are a DataTypeView using a template
    fields?: DataTypeViewField[];
    dataTypeIdFor?: string;
}

interface DataTypeView extends DataTypeViewTemplate
{
    // which template, if any, this view is for. 
    template?: string
}

// TODO: how to handle security questions? is that just a single field that takes an object or a group of fields that 
// each pull their own data?
export interface DataTypeViewField
{
    // constant id for the field. like skywardIDs. Can store them in appStoreState, but only need to store ones the user creates
    // current ones can just be in constants
    fieldTypeID: string;
    encrypted: boolean;
    width: string;
    height: string;
    x: number;
    y: number;
    component: string;
    mask?: string;
}

class BaseField<T> extends Field<T>
{
    fieldTypeID: string;
}