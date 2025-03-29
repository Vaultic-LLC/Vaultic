import { SecondaryDataObjectCollectionType, PrimaryDataObjectCollectionType, IIdentifiable, IFieldObject, FieldedObject } from "@vaultic/shared/Types/Fields";
import { PasswordSecretProperty, ValueSecretProperty } from "./Fields";
import { Organization } from "@vaultic/shared/Types/DataTypes";
import { DictionaryAsList } from "@vaultic/shared/Types/Stores";

export interface IFilterable
{
    /** Filters */
    i: DictionaryAsList;
}

export interface IGroupable
{
    /** Groups */
    g: DictionaryAsList;
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
    q: { [key: string]: SecurityQuestion };
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

export const MAX_CURRENT_AND_SAFE_SIZE = 200;

export class CurrentAndSafeStructure
{
    /** Current */
    c: number[];
    /** Safe */
    s: number[];

    constructor()
    {
        this.c = [];
        this.s = [];
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
    c: { [key: string]: FilterCondition };
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
    added: DictionaryAsList;
    removed: DictionaryAsList;
    unchanged: DictionaryAsList;

    constructor(added?: DictionaryAsList, removed?: DictionaryAsList, unchanged?: DictionaryAsList) 
    {
        this.added = added ?? {};
        this.removed = removed ?? {};
        this.unchanged = unchanged ?? {};
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
        q: {},
        a: '',
        t: '',
        w: false,
        m: -1,
        c: false,
        i: {},
        g: {}
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
        i: {},
        g: {},
        w: false,
        m: -1,
    };
}

export function defaultFilter(type: DataType): Filter
{
    return {
        id: "",
        p: {},
        v: {},
        t: type,
        a: false,
        n: '',
        c: {}
    };
}

export function defaultGroup(type: DataType): Group
{
    return {
        id: "",
        p: {},
        v: {},
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