import { Field, SecondaryDataObjectCollectionType, PrimaryDataObjectCollectionType, IIdentifiable, IFieldObject, FieldedObject } from "@vaultic/shared/Types/Fields";
import { PasswordSecretProperty, ValueSecretProperty, WebFieldConstructor } from "./Fields";
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

export class CurrentAndSafeStructure extends FieldedObject
{
    current: Field<Map<string, Field<number>>>;
    safe: Field<Map<string, Field<number>>>;

    constructor()
    {
        super(WebFieldConstructor);

        this.id = WebFieldConstructor.create("");
        this.current = WebFieldConstructor.create(new Map<string, Field<number>>());
        this.safe = WebFieldConstructor.create(new Map<string, Field<number>>());
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
        id: WebFieldConstructor.create(""),
        isVaultic: WebFieldConstructor.create(false),
        passwordFor: WebFieldConstructor.create(''),
        login: WebFieldConstructor.create(''),
        domain: WebFieldConstructor.create(''),
        email: WebFieldConstructor.create(''),
        password: WebFieldConstructor.create(''),
        securityQuestions: WebFieldConstructor.create(new Map<string, Field<SecurityQuestion>>()),
        additionalInformation: WebFieldConstructor.create(''),
        lastModifiedTime: WebFieldConstructor.create(''),
        isWeak: WebFieldConstructor.create(false),
        isWeakMessage: WebFieldConstructor.create(''),
        containsLogin: WebFieldConstructor.create(false),
        filters: WebFieldConstructor.create(new Map()),
        groups: WebFieldConstructor.create(new Map()),
        checkedForBreach: WebFieldConstructor.create(false)
    };
}

export function defaultValue(): NameValuePair
{
    return {
        id: WebFieldConstructor.create(""),
        name: WebFieldConstructor.create(''),
        value: WebFieldConstructor.create(''),
        valueType: WebFieldConstructor.create(undefined),
        notifyIfWeak: WebFieldConstructor.create(true),
        additionalInformation: WebFieldConstructor.create(''),
        lastModifiedTime: WebFieldConstructor.create(''),
        filters: WebFieldConstructor.create(new Map()),
        groups: WebFieldConstructor.create(new Map()),
        isWeak: WebFieldConstructor.create(false),
        isWeakMessage: WebFieldConstructor.create(''),
    };
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: WebFieldConstructor.create(""),
        passwords: WebFieldConstructor.create(new Map()),
        values: WebFieldConstructor.create(new Map()),
        type: WebFieldConstructor.create(type),
        isActive: WebFieldConstructor.create(false),
        name: WebFieldConstructor.create(''),
        conditions: WebFieldConstructor.create(new Map<string, Field<FilterCondition>>())
    };
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: WebFieldConstructor.create(""),
        passwords: WebFieldConstructor.create(new Map()),
        values: WebFieldConstructor.create(new Map()),
        name: WebFieldConstructor.create(''),
        type: WebFieldConstructor.create(type),
        color: WebFieldConstructor.create(''),
        icon: WebFieldConstructor.create('')
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