import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";
import { EntityManager } from "typeorm";

export interface VaulticRepository<T extends VaulticEntity>
{
    signAndInsert: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    signAndUpdate: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    retrieveAndVerify: (masterKey: string, predicate: () => T) => Promise<boolean>;
    remove: (manager: EntityManager, entity: T) => Promise<boolean>;
}

export interface UserRepository extends VaulticRepository<User>
{
    getLastUsedUserEmail: () => Promise<string | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string) => Promise<boolean | string>;
    getCurrentUser: () => User | undefined;
    findByEmail: (email: string) => Promise<User | null>;
    setCurrentUser: (masterKey: string, email: string) => Promise<boolean>;
    getCurrentUserData: (masterKey: string, response: any) => Promise<string>;
    verifyUserMasterKey: (masterKey: string, email?: string) => Promise<boolean>;
    saveUser: (masterKey: string, data: string) => Promise<boolean>;
}

export interface VaultRepository extends VaulticRepository<Vault>
{
    createNewVault: (name: string, color?: string) => Promise<boolean | [UserVault, Vault]>;
    getVaults: (masterKey: string, properties: (keyof Vault)[], encryptedProperties: (keyof Vault)[], vaultID?: number) => Promise<[Vault[], string[]]>;
    getVault: (masterKey: string, vaultID: number) => Promise<VaultData | null>;
    saveAndBackup: (masterKey: string, vaultID: number, data: string, skipBackup: boolean) => Promise<boolean>;
}

export interface UserVaultRepository extends VaulticRepository<UserVault>
{
    getByVaultID: (vaultID: number) => Promise<UserVault | null>;
    getUserVaults: (vaultID?: number) => Promise<UserVault[]>;
    saveUserVault: (masterKey: string, vaultID: number, data: string) => Promise<boolean>;
}

export interface DisplayVault 
{
    name: string;
    id: number;
    color: string;
    lastUsed: boolean;
}

export interface UserData 
{
    success: boolean;
    appStoreState?: any;
    userPreferencesStoreState?: any;
    displayVaults?: DisplayVault[];
    currentVault?: Vault;
}

export interface VaultData extends Vault
{
    vaultPreferencesStoreState: string;
}