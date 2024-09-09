import { nameof } from "../Helpers/TypeScriptHelper";

export interface VaultKey
{
    publicKey: string;
    vaultKey: string;
};

export enum EntityState
{
    Inserted,
    Updated,
    Deleted,
    Unchanged
};