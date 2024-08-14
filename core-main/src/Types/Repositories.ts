import { ObjectLiteral, Repository } from "typeorm";
import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";

export interface VaulticRepository<T extends ObjectLiteral & VaulticEntity> extends Repository<T>
{
    signAndSave: (masterKey: string, entity: T, userID: number) => Promise<boolean>;
    retrieveAndVerify: (masterKey: string, userID: number, predicate: () => T) => Promise<boolean>;
}

export interface UserRepository extends VaulticRepository<User>
{
    getLastUsedUserEmail: () => Promise<string | null>;
    createUser: (masterKey: string, userIdentifier: string, email: string) => Promise<boolean | string>;
    getCurrentUser: () => User | undefined;
    findByIdentifier: (userIdentifier: string) => Promise<User | null>;
    setCurrentUser: (masterKey: string, userIdentifier: string) => Promise<boolean>;
}

export interface VaultRepository extends VaulticRepository<Vault>
{
    createNewVault: (name: string, color?: string) => Promise<boolean | [UserVault, Vault]>;
    getVaults: (masterKey: string, properties: (keyof Vault)[], encryptedProperties: (keyof Vault)[], vaultID?: number) => Promise<[Partial<Vault>[], string[]]>;
}

export interface UserVaultRepository extends VaulticRepository<UserVault>
{
    getByVaultID: (vaultID: number) => Promise<UserVault | null>;
}

export interface DisplayVault 
{
    name: string;
    id: number;
    color: string;
    lastUsed: boolean;
}