import { Field, PrimaryDataObjectCollectionType } from "./Fields";

export interface IIdentifiable
{
    id: Field<string>;
}

export interface IFieldObject
{
    [key: string]: Field<any>;
}

export interface IFilterable
{
    filters: Field<string[]>;
}

export interface IGroupable
{
    groups: Field<string[]>;
}

export enum DataType
{
    Passwords,
    NameValuePairs,
    Filters,
    Groups
}

export enum FilterStatus
{
    And = "And",
    Or = "Or"
}

export interface Password extends IFilterable, IIdentifiable, IGroupable
{
    [key: string]: any;
    isVaultic: Field<boolean>;
    login: Field<string>;
    domain: Field<string>;
    email: Field<string>;
    password: Field<string>;
    passwordFor: Field<string>;
    securityQuestions: Field<SecurityQuestion[]>;
    additionalInformation: Field<string>;
    lastModifiedTime: Field<string>;
    isWeak: Field<boolean>;
    isWeakMessage: Field<string>;
    containsLogin: Field<boolean>;
    passwordLength: Field<number>;

    // TODO: remove? Doesn't look to be used anywhere. Also on reactivePassword then
    isDuplicate: Field<boolean>;
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

export interface NameValuePair extends IFilterable, IIdentifiable, IGroupable
{
    [key: string]: any;
    name: Field<string>;
    value: Field<string>;
    valueType: Field<NameValuePairType | undefined>;
    notifyIfWeak: Field<boolean>;
    additionalInformation: Field<string>;
    lastModifiedTime: Field<string>;

    // TODO: remove? Doesn't look to be used anywhere. Also on reactiveValue then
    isDuplicate: Field<boolean>;
    isWeak: Field<boolean>;
    isWeakMessage: Field<string>;
    valueLength: Field<number>;
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

export interface ISecondaryDataObject extends IIdentifiable, IFieldObject, PrimaryDataObjectCollectionType
{
    type: Field<DataType>;
}

export interface Filter extends ISecondaryDataObject
{
    name: Field<string>;
    isActive: Field<boolean>;
    conditions: Field<FilterCondition[]>;
}

export interface FilterCondition extends IIdentifiable
{
    property: string;
    filterType?: FilterConditionType;
    value: string;
}

export enum EqualFilterConditionType
{
    EqualTo = "Equal To"
}

export enum FilterConditionType
{
    StartsWith = "Starts With",
    EndsWith = "Ends With",
    Contains = "Contains",
    EqualTo = "Equal To"
}

export interface Group extends ISecondaryDataObject
{
    name: Field<string>;
    color: Field<string>; // hex value
}

export function defaultPassword(): Password
{
    return {
        id: Field.newReactive(""),
        key: Field.newReactive(""),
        isVaultic: Field.newReactive(false),
        passwordFor: Field.newReactive(''),
        login: Field.newReactive(''),
        domain: Field.newReactive(''),
        email: Field.newReactive(''),
        password: Field.newReactive(''),
        passwordLength: Field.newReactive(0),
        securityQuestions: Field.newReactive([]),
        additionalInformation: Field.newReactive(''),
        lastModifiedTime: Field.newReactive(''),
        isDuplicate: Field.newReactive(false),
        isWeak: Field.newReactive(false),
        isWeakMessage: Field.newReactive(''),
        containsLogin: Field.newReactive(false),
        filters: Field.newReactive([]),
        groups: Field.newReactive([]),
    }
}

export function defaultValue(): NameValuePair
{
    return {
        id: Field.newReactive(""),
        key: Field.newReactive(''),
        name: Field.newReactive(''),
        value: Field.newReactive(''),
        valueType: Field.newReactive(undefined),
        notifyIfWeak: Field.newReactive(true),
        additionalInformation: Field.newReactive(''),
        lastModifiedTime: Field.newReactive(''),
        isDuplicate: Field.newReactive(false),
        filters: Field.newReactive([]),
        groups: Field.newReactive([]),
        isWeak: Field.newReactive(false),
        isWeakMessage: Field.newReactive(''),
        valueLength: Field.newReactive(0)
    }
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: Field.newReactive(""),
        key: Field.newReactive(''),
        passwords: Field.newReactive([]),
        values: Field.newReactive([]),
        type: Field.newReactive(type),
        isActive: Field.newReactive(false),
        name: Field.newReactive(''),
        conditions: Field.newReactive([])
    }
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: Field.newReactive(""),
        key: Field.newReactive(""),
        passwords: Field.newReactive([]),
        values: Field.newReactive([]),
        name: Field.newReactive(''),
        type: Field.newReactive(type),
        color: Field.newReactive('')
    }
}
