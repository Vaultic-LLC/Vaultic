import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";
import { EntityManager } from "typeorm";
import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "@vaultic/shared/Types/Repositories";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

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

export interface IUserRepository extends ClientUserRepository, VaulticRepository<User>
{
    getCurrentUser: () => Promise<User | undefined>;
    findByEmail: (masterKey: string, email: string) => Promise<User | null>;
    setCurrentUser: (masterKey: string, email: string) => Promise<TypedMethodResponse<boolean | undefined>>;
}

export interface IUserVaultRepository extends ClientUserVaultRepository, VaulticRepository<UserVault>
{
    getVerifiedUserVaults: (masterKey: string, userVaultIDs?: number[]) => Promise<[UserVault[], string[]]>;
    getVerifiedAndDecryt: (masterKey: string, propertiesToDecrypt?: string[], userVaultIDs?: number[]) => Promise<CondensedVaultData[] | null>;
}

export interface IVaultRepository extends ClientVaultRepository, VaulticRepository<Vault>
{
    createNewVault: (name: string) => Promise<boolean | [UserVault, Vault, string]>;
}