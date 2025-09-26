import { ObjectPropertyManager, PropertyManagerConstructor } from "../Utilities/PropertyManagers";
import { uniqueIDGenerator } from "../Utilities/UniqueIDGenerator";
import { DictionaryAsList } from "./Stores";

export type Primitive = string | boolean | number;

export interface IIdentifiable
{
    id: string;
}

// p = Passwords
// v = Values
export type PrimaryDataObjectCollection = "p" | "v";

// i = Filters
// g = Groups
export type SecondaryDataObjectCollection = "i" | "g";

// Keyed by password / value ID
export type PrimaryDataObjectCollectionType =
    {
        [key in PrimaryDataObjectCollection]: DictionaryAsList;
    }

// Keyed by filter / group ID
export type SecondaryDataObjectCollectionType =
    {
        [key in SecondaryDataObjectCollection]: DictionaryAsList;
    }
export enum RandomValueType
{
    Password = "Password",
    Passphrase = "Passphrase"
}