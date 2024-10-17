import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";
import { EntityManager } from "typeorm";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { CondensedVaultData } from "@vaultic/shared/Types/Entities";

export interface VaulticRepository<T extends VaulticEntity>
{
    signAndInsert: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    insertExisting(manager: EntityManager, entity: DeepPartial<T>): Promise<boolean>;
    signAndUpdate: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    override(manager: EntityManager, id: number, entity: DeepPartial<T>): Promise<boolean>;
    resetTracking: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    delete: (manager: EntityManager, entityID: number) => Promise<boolean>;
    getEntityThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<T> | null]>;
    getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<T>[] | null]>;
}

export interface UserRepository extends VaulticRepository<User>
{
    getCurrentUser: () => User | undefined;
    findByEmail: (email: string) => Promise<User | null>;
    getLastUsedUserEmail: () => Promise<string | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string) => Promise<TypedMethodResponse<boolean | undefined>>
    setCurrentUser: (masterKey: string, email: string) => Promise<boolean>;
    getCurrentUserData: (masterKey: string) => Promise<string>;
    verifyUserMasterKey: (masterKey: string, email?: string) => Promise<boolean>;
    saveUser: (masterKey: string, data: string, backup: boolean) => Promise<TypedMethodResponse<boolean | undefined>>;
}

export interface UserVaultRepository extends VaulticRepository<UserVault>
{
    getVerifiedUserVaults: (masterKey: string, userVaultIDs?: number[]) => Promise<[UserVault[], string[]]>;
    getVerifiedAndDecryt: (masterKey: string, propertiesToDecrypt?: string[], userVaultID?: number) => Promise<CondensedVaultData[] | null>;
    saveUserVault: (masterKey: string, userVaultID: number, data: string, backup: boolean) => Promise<boolean>;
}

export interface VaultRepository extends VaulticRepository<Vault>
{
    createNewVault: (name: string) => Promise<boolean | [UserVault, Vault]>;
    createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean) => Promise<boolean | CondensedVaultData>;
    setActiveVault: (masterKey: string, userVaultID: number) => Promise<boolean | CondensedVaultData>;
    saveVault: (masterKey: string, userVaultID: number, data: string, skipBackup: boolean) => Promise<boolean>;
    archiveVault: (masterKey: string, userVaultID: number, backup: boolean) => Promise<boolean>;
}