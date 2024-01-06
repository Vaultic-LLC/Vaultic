import { DataType, Filter, Group } from "./Table";

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

export interface IPinnable
{
    isPinned: boolean;
}

export interface DisplayField
{
    backingProperty: string;
    displayName: string;
}

export interface HeaderDisplayField extends DisplayField
{
    width: string;
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

export const PasswordProperties: PropertySelectorDisplayFields[] = [
    {
        backingProperty: "passwordFor",
        displayName: "Password For",
        type: PropertyType.String,
    },
    {
        backingProperty: "login",
        displayName: "Login",
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

export interface Password extends IFilterable, IIdentifiable, IGroupable, IPinnable
{
    passwordFor: string;
    login: string;
    password: string;
    securityQuestions: SecurityQuestion[];
    additionalInformation: string;
    lastModifiedTime: number;
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
    Verbal = "Verbal Code",
    Passcode = "Passcode",
    Safe = "Safe",
    Information = "Information",
    Other = "Other"
}

export const ValueProperties: PropertySelectorDisplayFields[] = [
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
]

export interface NameValuePair extends IFilterable, IIdentifiable, IGroupable, IPinnable
{
    name: string;
    value: string;
    valueType?: NameValuePairType;
    notifyIfWeak: boolean;
    additionalInformation: string;
    lastModifiedTime: number;
    isDuplicate: boolean;
}

export interface CurrentAndSafeStructure 
{
    current: number[];
    safe: number[];
}

export interface LoginRecord extends IIdentifiable
{
    [key: string]: any;
    datetime: number;
    displayTime: string;
}

export enum AtRiskType
{
    Old,
    Duplicate,
    Weak,
    WeakVerabl,
    ContainsLogin,
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
        passwordFor: '',
        login: '',
        password: '',
        securityQuestions: [{
            id: "",
            question: '',
            questionLength: 0,
            answer: '',
            answerLength: 0
        }],
        additionalInformation: '',
        lastModifiedTime: 0,
        isDuplicate: false,
        isPinned: false,
        filters: [],
        groups: [],
    }
}

export function defaultValue(): NameValuePair
{
    return {
        id: "",
        name: '',
        value: '',
        notifyIfWeak: true,
        additionalInformation: '',
        lastModifiedTime: 0,
        isDuplicate: false,
        isPinned: false,
        filters: [],
        groups: []
    }
}

export function defaultFilter(type: DataType): Filter 
{
    return {
        id: "",
        passwords: [],
        nameValuePairs: [],
        isPinned: false,
        type: type,
        isActive: false,
        text: '',
        conditions: [{
            id: "",
            property: '',
            value: ''
        }]
    }
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: "",
        passwords: [],
        nameValuePairs: [],
        isPinned: false,
        name: '',
        type: type,
        color: ''
    }
}