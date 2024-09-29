import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";
import { EntityManager } from "typeorm";

export interface VaulticRepository<T extends VaulticEntity>
{
    signAndInsert: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    insertExisting(manager: EntityManager, entity: Partial<T>): Promise<boolean>;
    signAndUpdate: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    remove: (manager: EntityManager, entity: T) => Promise<boolean>;
    getEntityThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<T> | null]>;
    getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<T>[] | null]>;
}

export interface UserRepository extends VaulticRepository<User>
{
    getCurrentUser: () => User | undefined;
    findByEmail: (email: string) => Promise<User | null>;
    getLastUsedUserEmail: () => Promise<string | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string) => Promise<boolean | string>;
    setCurrentUser: (masterKey: string, email: string) => Promise<boolean>;
    getCurrentUserData: (masterKey: string) => Promise<string>;
    verifyUserMasterKey: (masterKey: string, email?: string) => Promise<boolean>;
    saveUser: (masterKey: string, data: string) => Promise<boolean>;
}

export interface UserVaultRepository extends VaulticRepository<UserVault>
{
    getVerifiedUserVaults: (masterKey: string, userVaultID?: number) => Promise<[UserVault[], string[]]>;
    getVerifiedAndDecryt: (masterKey: string, propertiesToDecrypt?: string[], userVaultID?: number) => Promise<CondensedVaultData[] | null>;
    saveUserVault: (masterKey: string, userVaultID: number, data: string) => Promise<boolean>;
}

export interface VaultRepository extends VaulticRepository<Vault>
{
    createNewVault: (name: string, color?: string) => Promise<boolean | [UserVault, Vault]>;
    createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean) => Promise<boolean | CondensedVaultData>;
    setActiveVault: (masterKey: string, userVaultID: number) => Promise<boolean | CondensedVaultData>;
    saveAndBackup: (masterKey: string, userVaultID: number, data: string, skipBackup: boolean) => Promise<boolean>;
}

export interface DisplayVault 
{
    name: string;
    userVaultID: number;
    color: string;
    lastUsed: boolean;
}

export interface UserData 
{
    success: boolean;
    appStoreState?: any;
    userPreferencesStoreState?: any;
    displayVaults?: DisplayVault[];
    currentVault?: CondensedVaultData;
}

export interface VaultData extends Vault
{
    vaultPreferencesStoreState: string;
}

export interface CondensedVaultData
{
    userVaultID: number;
    vaultPreferencesStoreState: string;
    name: string;
    color: string;
    lastUsed: boolean;
    vaultStoreState: string;
    passwordStoreState: string;
    valueStoreState: string;
    filterStoreState: string;
    groupStoreState: string;
}