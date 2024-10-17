import { DataType, Filter, Group } from "./Table";

export interface IIdentifiable
{
    id: string;
}

export type SecondaryDataObjectCollection = "filters" | "groups";
export type SecretProperty = "password" | "value";

export interface IFilterable
{
    filters: string[];
}

export interface IGroupable
{
    groups: string[];
}

export interface StoreStateProperty<T>
{
    value: T;
    lastModifiedTime: number;
    displayComponent?: string;
}

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

export interface Password extends IFilterable, IIdentifiable, IGroupable
{
    [key: string]: any;
    isVaultic: boolean;
    login: string;
    domain: string;
    email: string;
    password: string;
    passwordFor: string;
    securityQuestions: SecurityQuestion[];
    additionalInformation: string;
    lastModifiedTime: string;
    isWeak: boolean;
    isWeakMessage: string;
    containsLogin: boolean;
    passwordLength: number;
    isDuplicate: boolean;
}

export interface SecurityQuestion extends IIdentifiable
{
    question: string,
    questionLength: number,
    answer: string
    answerLength: number
}

export enum NameValuePairType
{
    Passphrase = "Passphrase",
    Passcode = "Passcode",
    Safe = "Safe",
    Information = "Information",
    MFAKey = "MFA Key",
    Other = "Other",
}

export const nameValuePairTypesValues = Object.values(NameValuePairType);

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

export interface NameValuePair extends IFilterable, IIdentifiable, IGroupable
{
    [key: string]: any;
    name: string;
    value: string;
    valueType?: NameValuePairType;
    notifyIfWeak: boolean;
    additionalInformation: string;
    lastModifiedTime: string;
    isDuplicate: boolean;
    isWeak: boolean;
    isWeakMessage: string;
    valueLength: number;
}

export interface CurrentAndSafeStructure
{
    current: number[];
    safe: number[];
}

export enum AtRiskType
{
    Old,
    Duplicate,
    Weak,
    WeakPhrase,
    ContainsLogin,
    Breached,
    Empty,
    None
}

export interface AtRisks
{
    isOld?: boolean;
    isWeak?: boolean;
    isWeakMessage?: string;
    containsLogin?: boolean;
    isDuplicate?: boolean;
    isEmpty?: boolean;
}

export function defaultPassword(): Password
{
    return {
        id: "",
        key: "",
        isVaultic: false,
        passwordFor: '',
        login: '',
        domain: '',
        email: '',
        password: '',
        passwordLength: 0,
        securityQuestions: [],
        additionalInformation: '',
        lastModifiedTime: '',
        isDuplicate: false,
        isWeak: false,
        isWeakMessage: '',
        containsLogin: false,
        filters: [],
        groups: [],
    }
}

export function defaultValue(): NameValuePair
{
    return {
        id: "",
        key: '',
        name: '',
        value: '',
        notifyIfWeak: true,
        additionalInformation: '',
        lastModifiedTime: '',
        isDuplicate: false,
        filters: [],
        groups: [],
        isWeak: false,
        isWeakMessage: '',
        valueLength: 0
    }
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: "",
        key: '',
        passwords: [],
        values: [],
        type: type,
        isActive: false,
        name: '',
        conditions: []
    }
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: "",
        key: "",
        passwords: [],
        values: [],
        name: '',
        type: type,
        color: ''
    }
}

export interface GroupCSVHeader 
{
    csvHeader: string;
    delimiter?: string;
}