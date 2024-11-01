import { Field, SecondaryDataObjectCollectionType, PrimaryDataObjectCollectionType, IIdentifiable, IFieldObject, IFieldedObject, FieldedObject } from "@vaultic/shared/Types/Fields";
import { PasswordSecretProperty, ValueSecretProperty } from "./Fields";

export class DuplicateDataTypes extends FieldedObject
{
    duplicateDataTypesByID: Field<Map<string, Field<string>>>;

    constructor()
    {
        super();
        this.duplicateDataTypesByID = new Field(new Map<string, Field<string>>());
    }
}

export interface IFilterable
{
    filters: Field<Map<string, Field<string>>>;
}

export interface IGroupable
{
    groups: Field<Map<string, Field<string>>>;
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

export interface IPrimaryDataObject extends IFilterable, IIdentifiable, IGroupable, SecondaryDataObjectCollectionType
{
    [key: string]: any;
}

export interface Password extends IPrimaryDataObject, PasswordSecretProperty
{
    [key: string]: any;
    isVaultic: Field<boolean>;
    login: Field<string>;
    domain: Field<string>;
    email: Field<string>;
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

export interface NameValuePair extends IPrimaryDataObject, ValueSecretProperty
{
    [key: string]: any;
    name: Field<string>;
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

export class CurrentAndSafeStructure extends FieldedObject
{
    current: Field<Map<string, Field<number>>>;
    safe: Field<Map<string, Field<number>>>;

    constructor()
    {
        super();

        this.id = new Field("");
        this.current = new Field(new Map<string, Field<number>>());
        this.safe = new Field(new Map<string, Field<number>>());
    }
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
        id: new Field(""),
        key: new Field(""),
        isVaultic: new Field(false),
        passwordFor: new Field(''),
        login: new Field(''),
        domain: new Field(''),
        email: new Field(''),
        password: new Field(''),
        passwordLength: new Field(0),
        securityQuestions: new Field([]),
        additionalInformation: new Field(''),
        lastModifiedTime: new Field(''),
        isDuplicate: new Field(false),
        isWeak: new Field(false),
        isWeakMessage: new Field(''),
        containsLogin: new Field(false),
        filters: new Field(new Map()),
        groups: new Field(new Map()),
    }
}

const t = defaultPassword();
t["password"].value;

export function defaultValue(): NameValuePair
{
    return {
        id: new Field(""),
        key: new Field(''),
        name: new Field(''),
        value: new Field(''),
        valueType: new Field(undefined),
        notifyIfWeak: new Field(true),
        additionalInformation: new Field(''),
        lastModifiedTime: new Field(''),
        isDuplicate: new Field(false),
        filters: new Field(new Map()),
        groups: new Field(new Map()),
        isWeak: new Field(false),
        isWeakMessage: new Field(''),
        valueLength: new Field(0)
    }
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: new Field(""),
        key: new Field(''),
        passwords: new Field(new Map()),
        values: new Field(new Map()),
        type: new Field(type),
        isActive: new Field(false),
        name: new Field(''),
        conditions: new Field([])
    }
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: new Field(""),
        key: new Field(""),
        passwords: new Field(new Map()),
        values: new Field(new Map()),
        name: new Field(''),
        type: new Field(type),
        color: new Field('')
    }
}
