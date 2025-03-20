import { Field, SecondaryDataObjectCollectionType, PrimaryDataObjectCollectionType, IIdentifiable, IFieldObject, FieldedObject } from "@vaultic/shared/Types/Fields";
import { PasswordSecretProperty, ValueSecretProperty } from "./Fields";
import { Organization } from "@vaultic/shared/Types/DataTypes";

export interface IFilterable
{
    filters: Map<string, string>;
}

export interface IGroupable
{
    groups: Map<string, string>;
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
    isVaultic: boolean;
    login: string;
    domain: string;
    email: string;
    passwordFor: string;
    securityQuestions: Map<string, SecurityQuestion>;
    additionalInformation: string;
    lastModifiedTime: string;
    isWeak: boolean;
    isWeakMessage: number;
    containsLogin: boolean;
}

export const isWeakPasswordMessages: string[] = [

];

export interface SecurityQuestion extends IIdentifiable
{
    question: string;
    answer: string;
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
    name: string;
    valueType: NameValuePairType | undefined;
    notifyIfWeak: boolean;
    additionalInformation: string;
    lastModifiedTime: string;
    isWeak: boolean;
    isWeakMessage: number;
}

export class CurrentAndSafeStructure
{
    current: Map<string, number>;
    safe: Map<string, number>;

    constructor()
    {
        this.current = new Map();
        this.safe = new Map();
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

export interface ISecondaryDataObject extends IIdentifiable, PrimaryDataObjectCollectionType
{
    type: DataType;
}

export interface Filter extends ISecondaryDataObject
{
    name: string;
    isActive: boolean;
    conditions: Map<string, FilterCondition>;
}

export interface FilterCondition extends IIdentifiable
{
    property: string;
    filterType: FilterConditionType | undefined;
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
    name: string;
    color: string; // hex value
    icon: string;
}

export class RelatedDataTypeChanges 
{
    added: Map<string, string>;
    removed: Map<string, string>;
    unchanged: Map<string, string>;

    constructor(added?: Map<string, string>, removed?: Map<string, string>, unchanged?: Map<string, string>) 
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
        id: "",
        isVaultic: false,
        passwordFor: '',
        login: '',
        domain: '',
        email: '',
        password: '',
        securityQuestions: new Map<string, SecurityQuestion>(),
        additionalInformation: '',
        lastModifiedTime: '',
        isWeak: false,
        isWeakMessage: '',
        containsLogin: false,
        filters: new Map(),
        groups: new Map(),
        checkedForBreach: false
    };
}

export function defaultValue(): NameValuePair
{
    return {
        id: "",
        name: '',
        value: '',
        valueType: undefined,
        notifyIfWeak: true,
        additionalInformation: '',
        lastModifiedTime: '',
        filters: new Map(),
        groups: new Map(),
        isWeak: false,
        isWeakMessage: '',
    };
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: "",
        passwords: new Map(),
        values: new Map(),
        type: type,
        isActive: false,
        name: '',
        conditions: new Map<string, FilterCondition>()
    };
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: "",
        passwords: new Map(),
        values: new Map(),
        name: '',
        type: type,
        color: '',
        icon: ''
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