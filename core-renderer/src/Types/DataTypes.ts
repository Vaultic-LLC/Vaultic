export interface IIdentifiable
{
    id: string;
}

export interface IFilterable
{
    filters: string[];
}

export interface IGroupable
{
    groups: string[];
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

interface ISecondaryDataObject
{
    passwords: string[];
    values: string[];
    type: DataType;
}

export interface Filter extends IIdentifiable, ISecondaryDataObject
{
    [key: string]: any;
    name: string;
    isActive: boolean;
    conditions: FilterCondition[];
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

export interface Group extends IIdentifiable, ISecondaryDataObject
{
    [key: string]: any;
    name: string;
    color: string; // hex value
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
