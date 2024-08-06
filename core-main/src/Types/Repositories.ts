import { ObjectLiteral, Repository } from "typeorm";
import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";

export interface VaulticRepository<T extends ObjectLiteral & VaulticEntity> extends Repository<T>
{
    signAndSave: (masterKey: string, entity: T, userIdentifier: string) => Promise<boolean>;
    retrieveAndVerify: (masterKey: string, userIdentifier: string, predicate: () => T) => Promise<boolean>;
}

export interface UserRepository extends VaulticRepository<User>
{
    createUser: (masterKey: string, userIdentifier: string, email: string) => Promise<boolean | string>;
    getCurrentUser: () => User | undefined;
    findByIdentifier: (userIdentifier: string) => Promise<User | null>;
    setCurrentUser: (masterKey: string, userIdentifier: string) => Promise<boolean>;
    deleteUserAndVault: (masterKey: string, userIdentifier: string, vaultIdentifier: string) => Promise<boolean>;
}

export interface VaultRepository extends VaulticRepository<Vault>
{
    createNewVault: (name: string, color?: string) => Promise<Vault>;
    getAllVaults: () => Promise<Vault[] | null>;
    getAllDisplayVaults: () => Promise<DisplayVault[]>;
}

export interface UserVaultRepository extends VaulticRepository<UserVault>
{
}

export interface DisplayVault 
{
    name: string;
    identifier: string;
    color: string;
}