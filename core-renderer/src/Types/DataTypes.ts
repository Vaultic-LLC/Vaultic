import { SecondaryDataObjectCollectionType, PrimaryDataObjectCollectionType, IIdentifiable, IFieldObject, FieldedObject } from "@vaultic/shared/Types/Fields";
import { PasswordSecretProperty, ValueSecretProperty } from "./Fields";
import { Organization } from "@vaultic/shared/Types/DataTypes";

export interface IFilterable
{
    /** Filters */
    i: Map<string, string>;
}

export interface IGroupable
{
    /** Groups */
    g: Map<string, string>;
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
    /** Is Vaultic */
    v: boolean;
    /** Login */
    l: string;
    /** Domain */
    d: string;
    /** Email */
    e: string;
    /** Password For */
    f: string;
    /** Security Questions */
    q: Map<string, SecurityQuestion>;
    /** Additional Information */
    a: string;
    /** Last Modified Time */
    t: string;
    /** Is Weak */
    w: boolean;
    /** Is Weak Message */
    m: number;
    /** Contains Login */
    c: boolean;
}

export interface SecurityQuestion extends IIdentifiable
{
    /** Question */
    q: string;
    /** Answer */
    a: string;
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
    /** Name */
    n: string;
    /** Value Type */
    y: NameValuePairType | undefined;
    /** Notify If Weak */
    o: boolean;
    /** Additional Information */
    a: string;
    /** Last Modified Time */
    t: string;
    /** Is Weak */
    w: boolean;
    /** Is Weak Message */
    m: number;
}

export class CurrentAndSafeStructure
{
    /** Current */
    c: Map<string, number>;
    /** Safe */
    s: Map<string, number>;

    constructor()
    {
        this.c = new Map();
        this.s = new Map();
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
    /** Type */
    t: DataType;
}

export interface Filter extends ISecondaryDataObject
{
    /** Name */
    n: string;
    /** Is Active */
    a: boolean;
    /** Conditions */
    c: Map<string, FilterCondition>;
}

export interface FilterCondition extends IIdentifiable
{
    /** Property */
    p: string;
    /** Filter Type */
    t: FilterConditionType | undefined;
    /** Value */
    v: string;
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
    /** Name */
    n: string;
    /** Color as Hex */
    c: string;
    /** Icon */
    i: string;
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
        v: false,
        f: '',
        l: '',
        d: '',
        e: '',
        p: '',
        q: new Map<string, SecurityQuestion>(),
        a: '',
        t: '',
        w: false,
        m: -1,
        c: false,
        i: new Map(),
        g: new Map()
    };
}

export function defaultValue(): NameValuePair
{
    return {
        id: "",
        n: '',
        v: '',
        y: undefined,
        o: true,
        a: '',
        t: '',
        i: new Map(),
        g: new Map(),
        w: false,
        m: -1,
    };
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: "",
        p: new Map(),
        v: new Map(),
        t: type,
        a: false,
        n: '',
        c: new Map<string, FilterCondition>()
    };
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: "",
        p: new Map(),
        v: new Map(),
        n: '',
        t: type,
        c: '',
        i: ''
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