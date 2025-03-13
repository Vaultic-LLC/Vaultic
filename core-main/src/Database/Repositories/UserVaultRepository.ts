import { environment } from "../../Environment";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepository";
import { UserVault } from "../Entities/UserVault";
import Transaction from "../Transaction";
import { User } from "../Entities/User";
import { StoreState } from "../Entities/States/StoreState";
import vaultHelper from "../../Helpers/VaultHelper";
import { safetifyMethod } from "../../Helpers/RepositoryHelper";
import { VaultPreferencesStoreState } from "../Entities/States/VaultPreferencesStoreState";
import { CondensedVaultData, EntityState, UnsetupSharedClientUserVault } from "@vaultic/shared/Types/Entities";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { IUserVaultRepository } from "../../Types/Repositories";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { Algorithm, PublicKeyType } from "@vaultic/shared/Types/Keys";
import vaulticServer from "../../Server/VaulticServer";

class UserVaultRepository extends VaulticRepository<UserVault> implements IUserVaultRepository
{
    protected getRepository(): Repository<UserVault> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserVault);
    }

    private async getUserVaults(userID: number, userVaultIDs?: number[]): Promise<UserVault[]>
    {
        return this.retrieveManyReactive(getUserVaultsQuery);

        function getUserVaultsQuery(repository: Repository<UserVault>)
        {
            const userVaultQuery = repository
                .createQueryBuilder('userVault')
                .leftJoinAndSelect('userVault.vaultPreferencesStoreState', 'vaultPreferencesStoreState')
                .leftJoinAndSelect('userVault.vault', 'vault')
                .leftJoinAndSelect('vault.vaultStoreState', 'vaultStoreState')
                .leftJoinAndSelect('vault.passwordStoreState', 'passwordStoreState')
                .leftJoinAndSelect('vault.valueStoreState', 'valueStoreState')
                .leftJoinAndSelect('vault.filterStoreState', 'filterStoreState')
                .leftJoinAndSelect('vault.groupStoreState', 'groupStoreState')
                .where('userVault.userID = :userID', { userID: userID })
                .andWhere('vault.entityState != :state', { state: EntityState.Deleted });

            if (userVaultIDs && userVaultIDs.length > 0)
            {
                userVaultQuery.andWhere("userVault.userVaultID IN (:...userVaultIDs)", { userVaultIDs });
            }

            return userVaultQuery.getMany();
        }
    }

    public async getVerifiedUserVaults(masterKey: string, userVaultIDs?: number[], userID?: number,
        query?: (repository: Repository<UserVault>) => Promise<UserVault[] | null>): Promise<[UserVault[], string[]]>
    {
        if (!userID)
        {
            if (!environment.cache.currentUser?.userID)
            {
                return [[], []];
            }

            userID = environment.cache.currentUser.userID;
        }

        let userVaults: UserVault[] | null = [];
        if (query)
        {
            userVaults = await query(this.repository);
        }
        else 
        {
            userVaults = await this.getUserVaults(userID, userVaultIDs);
        }

        if (!userVaults || userVaults.length == 0)
        {
            return [[], []];
        }

        const vaultKeys: string[] = [];
        for (let i = 0; i < userVaults.length; i++)
        {
            const userVaultResponse = await userVaults[i].verify(masterKey);
            if (!userVaultResponse)
            {
                return [[], []];
            }

            const decryptedVaultKey = await environment.utilities.crypt.symmetricDecrypt(masterKey, userVaults[i].vaultKey);
            if (!decryptedVaultKey.success)
            {
                return [[], []];
            }

            const vaultResponse = await userVaults[i].vault.verify(decryptedVaultKey.value!);
            if (!vaultResponse)
            {
                return [[], []];
            }
            vaultKeys.push(decryptedVaultKey.value!);
        }

        return [userVaults, vaultKeys];
    }

    public async getVerifiedAndDecryt(masterKey: string, propertiesToDecrypt?: string[], userVaultIDs?: number[]): Promise<CondensedVaultData[] | null>
    {
        const userVaults = await this.getVerifiedUserVaults(masterKey, userVaultIDs);
        if (userVaults[0].length == 0)
        {
            return null;
        }

        const condensedDecryptedUserVaults: CondensedVaultData[] = [];
        for (let i = 0; i < userVaults[0].length; i++)
        {
            const condensedUserVault = userVaults[0][i].condense();
            const decryptedUserVault = await vaultHelper.decryptCondensedUserVault(userVaults[1][i], condensedUserVault, propertiesToDecrypt);
            if (!decryptedUserVault)
            {
                // This really should never happen since we get verified vaults above
                throw TypedMethodResponse.fail(errorCodes.FAILED_TO_DECRYPT_CONDENSED_VAULT);
            }

            condensedDecryptedUserVaults.push(decryptedUserVault);
        }

        return condensedDecryptedUserVaults;
    }

    public async saveUserVault(masterKey: string, userVaultID: number, newData: string, currentData: string): Promise<TypedMethodResponse<boolean | undefined>>
    {
        return await safetifyMethod(this, internalSaveUserVault);

        async function internalSaveUserVault(this: UserVaultRepository): Promise<TypedMethodResponse<boolean>>
        {
            let userVaults: UserVault[];

            // masterKey will be "" when updating vaultPreferencesStoreState. This is fine since it'll be the only thing
            // being updated at that point
            if (masterKey)
            {
                const verifiedUserVaults = await this.getVerifiedUserVaults(masterKey, [userVaultID]);
                userVaults = verifiedUserVaults[0];
            }
            else 
            {
                if (!environment.cache.currentUser?.userID)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "No User");
                }

                userVaults = await this.getUserVaults(environment.cache.currentUser.userID, [userVaultID]);
            }

            if (userVaults.length != 1)
            {
                return TypedMethodResponse.fail(undefined, undefined, `Invalid number of UserVaulst: ${userVaults.length}`)
            }

            const oldUserVault = userVaults[0];
            const newUserVault: CondensedVaultData = JSON.vaulticParse(newData);

            const transaction = new Transaction();
            if (newUserVault.vaultPreferencesStoreState)
            {
                if (!environment.cache.currentUser?.userID)
                {
                    return TypedMethodResponse.fail(errorCodes.NO_USER, "saveUserVault");
                }

                const currentVaultPreferences = JSON.vaulticParse((JSON.vaulticParse(currentData) as CondensedVaultData).vaultPreferencesStoreState);
                const state = environment.repositories.changeTrackings.trackStateDifferences(environment.cache.currentUser.userID, masterKey, JSON.vaulticParse(newUserVault.vaultPreferencesStoreState),
                    currentVaultPreferences, transaction);

                if (!(await environment.repositories.vaultPreferencesStoreStates.updateState(
                    oldUserVault.userVaultID, "", state, transaction)))
                {
                    return TypedMethodResponse.fail(undefined, undefined, "VaultPreferencesStoreState Update Failed");
                }
            }

            const saved = await transaction.commit();
            if (!saved)
            {
                return TypedMethodResponse.transactionFail();
            }

            return TypedMethodResponse.success(true);
        }
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<TypedMethodResponse<DeepPartial<UserVault>[] | undefined>> 
    {
        if (!environment.cache.currentUser?.userID)
        {
            return TypedMethodResponse.fail();
        }

        let userVaultsToBackup = await this.retrieveAndVerifyAll(masterKey, getUserVaults);
        if (!userVaultsToBackup)
        {
            return TypedMethodResponse.fail();
        }

        userVaultsToBackup = userVaultsToBackup as UserVault[];
        if (userVaultsToBackup.length == 0)
        {
            return TypedMethodResponse.success();
        }

        const partialUserVaultsToBackup: Partial<UserVault>[] = [];

        for (let i = 0; i < userVaultsToBackup.length; i++)
        {
            const userVaultBackup = {};
            const userVault = userVaultsToBackup[i];

            if (userVault.propertiesToSync.length > 0)
            {
                Object.assign(userVaultBackup, userVault.getBackup());
            }
            else 
            {
                userVaultBackup["userVaultID"] = userVault.userVaultID;
            }

            if (userVault.vaultPreferencesStoreState.propertiesToSync.length > 0)
            {
                userVaultBackup["vaultPreferencesStoreState"] = userVault.vaultPreferencesStoreState.getBackup();
            }

            partialUserVaultsToBackup.push(userVaultBackup);
        }

        return TypedMethodResponse.success(partialUserVaultsToBackup);

        function getUserVaults(repository: Repository<UserVault>): Promise<UserVault[]>
        {
            return repository
                .createQueryBuilder('userVault')
                .leftJoinAndSelect("userVault.vaultPreferencesStoreState", "vaultPreferencesStoreState")
                .where("userVault.userID = :userID", { userID: environment.cache.currentUser.userID })
                .andWhere(`(
                    userVault.entityState != :entityState OR 
                    vaultPreferencesStoreState.entityState != :entityState
                )`,
                    { entityState: EntityState.Unchanged })
                .getMany();
        }
    }

    public async postBackupEntitiesUpdates(key: string, entities: DeepPartial<UserVault>[], transaction: Transaction): Promise<boolean> 
    {
        if (!environment.cache.currentUser?.userID)
        {
            return false;
        }

        const userVaults = await this.getVerifiedUserVaults(key, entities.filter(f => f.userVaultID).map(u => u.userVaultID!), environment.cache.currentUser.userID);
        for (let i = 0; i < entities.length; i++)
        {
            const userVault = userVaults[0].filter(uv => uv.userVaultID == entities[i].userVaultID);
            if (userVault.length != 1)
            {
                continue;
            }

            transaction.resetTracking(userVault[0], key, () => this);
            if (entities[i].vaultPreferencesStoreState)
            {
                transaction.resetTracking(userVault[0].vaultPreferencesStoreState, "", () => environment.repositories.vaultPreferencesStoreStates);
            }
        }

        return true;
    }

    public addFromServer(userVault: DeepPartial<UserVault>, transaction: Transaction): boolean
    {
        if (!UserVault.isValid(userVault))
        {
            return false;
        }

        transaction.insertExistingEntity(userVault, () => environment.repositories.userVaults);
        transaction.insertExistingEntity(userVault.vaultPreferencesStoreState!, () => environment.repositories.vaultPreferencesStoreStates);

        return true;
    }

    public async updateFromServer(currentUserVault: DeepPartial<UserVault>, newUserVault: DeepPartial<UserVault>,
        changeTrackings: Dictionary<ChangeTracking>, transaction: Transaction)
    {
        if (!newUserVault.userVaultID)
        {
            return;
        }

        const partialUserVault = {};
        let updatedUserVault = false;

        if (newUserVault.currentSignature)
        {
            partialUserVault[nameof<UserVault>("currentSignature")] = newUserVault.currentSignature;
            updatedUserVault = true;
        }

        if (newUserVault.vaultKey)
        {
            partialUserVault[nameof<UserVault>("vaultKey")] = newUserVault.vaultKey;
            updatedUserVault = true;
        }

        // need to check for null since enum value could be 0
        if (newUserVault.permissions != null)
        {
            partialUserVault[nameof<UserVault>("permissions")] = newUserVault.permissions;
            updatedUserVault = true;
        }

        if (updatedUserVault)
        {
            transaction.overrideEntity(newUserVault.userVaultID, partialUserVault, () => this);
        }

        let needsToRePushData = false;

        // Shouldn't ever happen since we don't use the vault preferences anymore atm
        if (newUserVault.vaultPreferencesStoreState && newUserVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID)
        {
            if (currentUserVault.vaultPreferencesStoreState?.entityState == EntityState.Updated)
            {
                if (!await (environment.repositories.vaultPreferencesStoreStates.mergeStates("", currentUserVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
                    newUserVault.vaultPreferencesStoreState, changeTrackings, transaction, false)))
                {
                    return;
                }

                needsToRePushData = true;
            }
            else 
            {
                const partialVaultPreferencesStoreState: DeepPartial<VaultPreferencesStoreState> = StoreState.getUpdatedPropertiesFromObject(newUserVault.vaultPreferencesStoreState);
                if (Object.keys(partialVaultPreferencesStoreState).length > 0)
                {
                    transaction.overrideEntity(newUserVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
                        partialVaultPreferencesStoreState, () => environment.repositories.vaultPreferencesStoreStates);
                }
            }
        }

        return needsToRePushData;
    }

    public async getStoreStates(masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData): Promise<TypedMethodResponse<DeepPartial<CondensedVaultData> | undefined>>
    {
        return await safetifyMethod(this, internalGetStoreStates);

        async function internalGetStoreStates(this: UserVaultRepository): Promise<TypedMethodResponse<DeepPartial<CondensedVaultData>>>
        {
            if (!storeStatesToRetrieve.vaultPreferencesStoreState)
            {
                return TypedMethodResponse.success();
            }

            const condensedVaults = await this.getVerifiedUserVaults(masterKey, [userVaultID]);
            if (!condensedVaults[0] || condensedVaults[0].length != 1)
            {
                return TypedMethodResponse.fail(undefined, "", "No user vaults");
            }

            return TypedMethodResponse.success({ vaultPreferencesStoreState: condensedVaults[0][0].vaultPreferencesStoreState.state });
        }
    }

    public async setupSharedUserVaults(masterKey: string, recipientsPrivateEncryptingKey: string, senderUserIDs: number[],
        unsetupUserVaults: UnsetupSharedClientUserVault[], transaction: Transaction): Promise<void>
    {
        const senderPublicSigningKeys = await vaulticServer.user.getPublicKeys(PublicKeyType.Signing, senderUserIDs);
        if (!senderPublicSigningKeys.Success)
        {
            await environment.repositories.logs.log(undefined, "Failed to get public keys");
            return;
        }

        for (let i = 0; i < unsetupUserVaults.length; i++)
        {
            const unsetupUserVault = unsetupUserVaults[i].userVault;
            const senderPublicSigningKey = senderPublicSigningKeys?.UsersAndPublicKeys?.[unsetupUserVaults[i].vaultKey.message.senderUserID];
            if (!senderPublicSigningKey || !senderPublicSigningKey.PublicSigningKey)
            {
                await environment.repositories.logs.log(undefined, "No public key for user");
                continue;
            }

            const newUserVault = new UserVault().makeReactive();
            newUserVault.vaultPreferencesStoreState = new VaultPreferencesStoreState().makeReactive();

            newUserVault.userVaultID = unsetupUserVault.userVaultID;
            newUserVault.userID = unsetupUserVault.userID;
            newUserVault.vaultID = unsetupUserVault.vaultID;
            newUserVault.userOrganizationID = unsetupUserVault.userOrganizationID;
            newUserVault.isOwner = false;
            newUserVault.permissions = unsetupUserVault.permissions;

            try
            {
                // first time loading this vaultKey from a shared vault, switch the key to use symmetric encryption
                // for faster subsequent decryption and better security
                if (unsetupUserVaults[i].vaultKey.algorithm == Algorithm.Vaultic_Key_Share)
                {
                    const result = await vaultHelper.evaluateVaultKeyFromSender(senderPublicSigningKey.PublicSigningKey, recipientsPrivateEncryptingKey, unsetupUserVaults[i].vaultKey);
                    if (!result.success)
                    {
                        await environment.repositories.logs.log(undefined, "Failed to evaluate vault key from sender");
                        continue;
                    }

                    newUserVault.vaultKey = result.value;
                }
                // this shouldn't ever happen since the userVault is already setup i.e. we shouldn't be in this method
                else
                {
                    newUserVault.vaultKey = unsetupUserVault.vaultKey;
                }
            }
            catch (e)
            {
                await environment.repositories.logs.log(undefined, e.toString());
            }

            newUserVault.vaultPreferencesStoreState.userVaultID = unsetupUserVault.userVaultID;
            newUserVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID = unsetupUserVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID;
            newUserVault.vaultPreferencesStoreState.state = "{}";

            transaction.insertEntity(newUserVault, masterKey, () => this);
            transaction.insertEntity(newUserVault.vaultPreferencesStoreState, "", () => environment.repositories.vaultPreferencesStoreStates);
        }
    }
}

const userVaultaultRepository: UserVaultRepository = new UserVaultRepository();
export default userVaultaultRepository;
export type UserVaultRepositoryType = typeof userVaultaultRepository;