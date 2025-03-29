import { Field, SecondaryDataObjectCollectionType, PrimaryDataObjectCollectionType, IIdentifiable, IFieldObject, FieldedObject } from "@vaultic/shared/Types/Fields";
import { PasswordSecretProperty, ValueSecretProperty } from "./Fields";
import { Organization } from "@vaultic/shared/Types/DataTypes";

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
    Groups,
    Devices,
    Organizations
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
    securityQuestions: Field<Map<string, Field<SecurityQuestion>>>;
    additionalInformation: Field<string>;
    lastModifiedTime: Field<string>;
    isWeak: Field<boolean>;
    isWeakMessage: Field<string>;
    containsLogin: Field<boolean>;
}

export interface SecurityQuestion extends IIdentifiable, IFieldObject
{
    question: Field<string>,
    answer: Field<string>
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
    isWeak: Field<boolean>;
    isWeakMessage: Field<string>;
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
    conditions: Field<Map<string, Field<FilterCondition>>>;
}

export interface FilterCondition extends IIdentifiable, IFieldObject
{
    property: Field<string>;
    filterType: Field<FilterConditionType | undefined>;
    value: Field<string>;
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
    icon: Field<string>;
}

export class RelatedDataTypeChanges 
{
    added: Map<string, Field<string>>;
    removed: Map<string, Field<string>>;
    unchanged: Map<string, Field<string>>;

    constructor(added?: Map<string, Field<string>>, removed?: Map<string, Field<string>>, unchanged?: Map<string, Field<string>>) 
    {
        this.added = added ?? new Map();
        this.removed = removed ?? new Map();
        this.unchanged = unchanged ?? new Map();
    }
}

export interface VaultAndBreachCount
{
    vaultID: number;
    vault: string;
    breachCount: number;
}

export function defaultPassword(): Password
{
    return {
        id: Field.create(""),
        isVaultic: Field.create(false),
        passwordFor: Field.create(''),
        login: Field.create(''),
        domain: Field.create(''),
        email: Field.create(''),
        password: Field.create(''),
        securityQuestions: Field.create(new Map<string, Field<SecurityQuestion>>()),
        additionalInformation: Field.create(''),
        lastModifiedTime: Field.create(''),
        isWeak: Field.create(false),
        isWeakMessage: Field.create(''),
        containsLogin: Field.create(false),
        filters: Field.create(new Map()),
        groups: Field.create(new Map()),
        checkedForBreach: Field.create(false)
    };
}

export function defaultValue(): NameValuePair
{
    return {
        id: Field.create(""),
        name: Field.create(''),
        value: Field.create(''),
        valueType: Field.create(undefined),
        notifyIfWeak: Field.create(true),
        additionalInformation: Field.create(''),
        lastModifiedTime: Field.create(''),
        filters: Field.create(new Map()),
        groups: Field.create(new Map()),
        isWeak: Field.create(false),
        isWeakMessage: Field.create(''),
    };
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: Field.create(""),
        passwords: Field.create(new Map()),
        values: Field.create(new Map()),
        type: Field.create(type),
        isActive: Field.create(false),
        name: Field.create(''),
        conditions: Field.create(new Map<string, Field<FilterCondition>>())
    };
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: Field.create(""),
        passwords: Field.create(new Map()),
        values: Field.create(new Map()),
        name: Field.create(''),
        type: Field.create(type),
        color: Field.create(''),
        icon: Field.create('')
    };
}

export function defaultOrganization(): Organization
{
    return {
        organizationID: -1,
        name: '',
        membersByUserID: new Map(),
        vaultIDsByVaultID: new Map()
    }
}