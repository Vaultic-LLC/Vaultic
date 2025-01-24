import { User } from "../Database/Entities/User";
import { Vault } from "../Database/Entities/Vault";
import { VaulticEntity } from "../Database/Entities/VaulticEntity";
import { UserVault } from "../Database/Entities/UserVault";
import { EntityManager, FindOptionsWhere } from "typeorm";
import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "@vaultic/shared/Types/Repositories";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { VaultsAndKeys } from "./Responses";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";

export interface VaulticRepository<T extends VaulticEntity>
{
    signAndInsert: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    insertExisting(manager: EntityManager, entity: DeepPartial<T>): Promise<boolean>;
    signAndUpdate: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    override(manager: EntityManager, findBy: number | FindOptionsWhere<T>, entity: DeepPartial<T>): Promise<boolean>;
    resetTracking: (manager: EntityManager, key: string, entity: T) => Promise<boolean>;
    delete: (manager: EntityManager, findBy: number | FindOptionsWhere<T>) => Promise<boolean>;
}

export interface IUserRepository extends ClientUserRepository, VaulticRepository<User>
{
    getCurrentUser: () => Promise<User | undefined>;
    findByEmail: (masterKey: string, email: string) => Promise<User | null>;
    getEntityThatNeedsToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<DeepPartial<User> | undefined>>;
}

export interface IUserVaultRepository extends ClientUserVaultRepository, VaulticRepository<UserVault>
{
    getVerifiedUserVaults: (masterKey: string, userVaultIDs?: number[]) => Promise<[UserVault[], string[]]>;
    getVerifiedAndDecryt: (masterKey: string, propertiesToDecrypt?: string[], userVaultIDs?: number[]) => Promise<CondensedVaultData[] | null>;
    getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<DeepPartial<UserVault>[] | undefined>>;
}

export interface IVaultRepository extends ClientVaultRepository, VaulticRepository<Vault>
{
    createNewVault: (name: string, shared: boolean, addedOrganizations: Organization[], addedMembers: Member[]) => Promise<boolean | [UserVault, Vault, string]>;
    getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<VaultsAndKeys | undefined>>;
}