import { environment } from "../../Environment";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepository";
import { UserVault } from "../Entities/UserVault";
import Transaction from "../Transaction";
import { EntityState, VaultKey } from "../../Types/Properties";
import { CondensedVaultData } from "../../Types/Repositories";
import { Vault } from "../Entities/Vault";
import { User } from "../Entities/User";
import { backupData } from ".";
import { nameof } from "../../Helpers/TypeScriptHelper";
import { StoreState } from "../Entities/States/StoreState";

class UserVaultRepository extends VaulticRepository<UserVault>
{
    protected getRepository(): Repository<UserVault> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserVault);
    }

    private async getUserVaults(user: User, userVaultID?: number): Promise<UserVault[]>
    {
        return this.retrieveManyReactive(getUserVaultsQuery);

        function getUserVaultsQuery(repository: Repository<UserVault>)
        {
            const userVaultQuery = repository
                .createQueryBuilder('userVault')
                .leftJoinAndSelect('userVault.vault', 'vault')
                .where('userVault.userID = :userID', { userID: user.userID });

            if (userVaultID)
            {
                userVaultQuery.andWhere("userVault.userVaultID = :userVaultID", { userVaultID });
            }

            return userVaultQuery.getMany();
        }
    }

    public async getVerifiedUserVaults(masterKey: string, userVaultID?: number, user?: User,
        query?: (repository: Repository<UserVault>) => Promise<UserVault[] | null>): Promise<[UserVault[], string[]]>
    {
        if (!user)
        {
            const currentUser = environment.repositories.users.getCurrentUser();
            if (!currentUser)
            {
                console.log('no user')
                return [[], []];
            }

            user = currentUser;
        }

        let userVaults: UserVault[] | null = [];
        if (query)
        {
            userVaults = await query(this.repository);
        }
        else 
        {
            userVaults = await this.getUserVaults(user, userVaultID);
        }

        if (!userVaults || userVaults.length == 0)
        {
            console.log('no user vaults')
            return [[], []];
        }

        const decryptedPrivateKey = await environment.utilities.crypt.decrypt(masterKey, user.privateKey);
        if (!decryptedPrivateKey.success)
        {
            console.log('no private key decrypt')
            return [[], []];
        }

        const vaultKeys: string[] = [];
        for (let i = 0; i < userVaults.length; i++)
        {
            if (!(await userVaults[i].verify(masterKey)))
            {
                console.log('un verified user vault')
                return [[], []];
            }

            const decryptedVaultKeys = await environment.utilities.crypt.decrypt(masterKey, userVaults[i].vaultKey);
            if (!decryptedVaultKeys.success)
            {
                console.log('no vault keys decrypt')
                return [[], []];
            }

            const keys: VaultKey = JSON.parse(decryptedVaultKeys.value!);
            const decryptedVaultKey = await environment.utilities.crypt.ECDecrypt(keys.publicKey, decryptedPrivateKey.value!, keys.vaultKey);
            if (!decryptedVaultKey.success)
            {
                console.log('no vault key decrypt')
                return [[], []];
            }

            if (!(await userVaults[i].vault.verify(decryptedVaultKey.value!)))
            {
                console.log('no vault verify')
                return [[], []];
            }

            vaultKeys.push(decryptedVaultKey.value!);
        }

        return [userVaults, vaultKeys];
    }

    public async getVerifiedAndDecryt(masterKey: string, propertiesToDecrypt?: string[], userVaultID?: number): Promise<CondensedVaultData[] | null>
    {
        const userVaults = await this.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length == 0)
        {
            return null;
        }

        const condensedDecryptedUserVaults: CondensedVaultData[] = [];
        for (let i = 0; i < userVaults[0].length; i++)
        {
            const condensedUserVault = userVaults[0][i].condense();
            const decryptableProperties = propertiesToDecrypt ?? Vault.getDecrypableProperties();

            for (let j = 0; j < decryptableProperties.length; j++)
            {
                const response = await environment.utilities.crypt.decrypt(userVaults[1][i], condensedUserVault[decryptableProperties[j]]);
                if (!response.success)
                {
                    return null;
                }

                condensedUserVault[decryptableProperties[j]] = response.value!;
            }

            condensedDecryptedUserVaults.push(condensedUserVault);
        }

        return condensedDecryptedUserVaults;
    }

    public async saveUserVault(masterKey: string, userVaultID: number, data: string, backup: boolean): Promise<boolean>
    {
        const userVaults = await this.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length != 1)
        {
            return false;
        }

        const oldUserVault = userVaults[0][0];
        const parsedData = JSON.parse(data);

        oldUserVault.copyFrom(parsedData);
        oldUserVault.entityState = EntityState.Updated;

        // there shouldn't be any encrypted properties that are being updated through this method.
        // No need to encrypt anything
        const transaction = new Transaction();
        transaction.updateEntity(oldUserVault, masterKey, () => this);

        const saved = await transaction.commit();
        if (!saved)
        {
            return false;
        }

        if (backup)
        {
            await backupData(masterKey);
        }

        return true;
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<UserVault>[] | null]> 
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return [false, null];
        }

        let userVaultsToBackup = await this.retrieveAndVerifyAll(masterKey, getUserVaults);
        if (!userVaultsToBackup)
        {
            return [false, null];
        }

        userVaultsToBackup = userVaultsToBackup as UserVault[];
        if (userVaultsToBackup.length == 0)
        {
            return [true, null];
        }

        const partialUserVaultsToBackup: Partial<UserVault>[] = [];

        for (let i = 0; i < userVaultsToBackup.length; i++)
        {
            const userVaultBackup = {};
            const userVault = userVaultsToBackup[i];

            if (userVault.updatedProperties.length > 0)
            {
                Object.assign(userVaultBackup, userVault.getBackup());
            }
            else 
            {
                userVaultBackup["userVaultID"] = userVault.userVaultID;
            }

            if (userVault.vaultPreferencesStoreState.updatedProperties.length > 0)
            {
                userVaultBackup["vaultPreferencesStoreState"] = userVault.vaultPreferencesStoreState.getBackup();
            }

            partialUserVaultsToBackup.push(userVaultBackup);
        }

        return [true, partialUserVaultsToBackup];

        function getUserVaults(repository: Repository<UserVault>): Promise<UserVault[]>
        {
            return repository
                .createQueryBuilder('userVault')
                .leftJoinAndSelect("userVault.vaultPreferencesStoreState", "vaultPreferencesStoreState")
                .where("userVault.userID = :userID", { userID: currentUser?.userID })
                .andWhere(`(
                    userVault.entityState != :entityState OR 
                    vaultPreferencesStoreState.entityState != :entityState
                )`,
                    { entityState: EntityState.Unchanged })
                .getMany();
        }
    }

    public async resetBackupTrackingForEntities(entities: Partial<UserVault>[]): Promise<boolean> 
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        this.repository
            .createQueryBuilder("userVaults")
            .innerJoin("userVaults.vaultPreferencesStoreState", "vaultPreferencesStoreState")
            .update()
            .set(
                {
                    entityState: EntityState.Unchanged,
                    serializedPropertiesToSync: "[]",
                    vaultPreferencesStoreState: {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]"
                    }
                }
            )
            .where("userID = :userID", { userID: currentUser.userID })
            .andWhere("userVaultID IN (:...userVaultIDs)", { userVaultIDs: entities.map(e => e.userVaultID) })
            .execute();

        return true;
    }

    public async addFromServer(userVault: Partial<UserVault>)
    {
        if (!userVault.userVaultID ||
            !userVault.vaultID ||
            !userVault.userID ||
            !userVault.signatureSecret ||
            !userVault.currentSignature ||
            !userVault.vaultKey ||
            !userVault.vaultPreferencesStoreState)
        {
            return;
        }

        // TODO: make sure this saves vaultPreferencesStoreState correctly
        this.repository.insert(userVault);
    }

    public async updateFromServer(currentUserVault: Partial<UserVault>, newUserVault: Partial<UserVault>)
    {
        const setProperties = {}
        if (!newUserVault.userVaultID)
        {
            return;
        }

        if (newUserVault.signatureSecret)
        {
            setProperties[nameof<UserVault>("signatureSecret")] = newUserVault.signatureSecret;
        }

        if (newUserVault.currentSignature)
        {
            setProperties[nameof<UserVault>("currentSignature")] = newUserVault.currentSignature;
        }

        if (newUserVault.vaultKey)
        {
            setProperties[nameof<UserVault>("vaultKey")] = newUserVault.vaultKey;
        }

        if (newUserVault.vaultPreferencesStoreState)
        {
            if (!currentUserVault.vaultPreferencesStoreState?.entityState)
            {
                currentUserVault = (await this.repository.findOneBy({
                    userVaultID: newUserVault.userVaultID
                })) as UserVault;
            }

            if (currentUserVault.vaultPreferencesStoreState?.entityState == EntityState.Updated)
            {
                // TODO: merge changes between states
            }
            else 
            {
                setProperties[nameof<UserVault>("vaultPreferencesStoreState")] =
                    StoreState.getUpdatedPropertiesFromObject(newUserVault.vaultPreferencesStoreState);
            }
        }

        return this.repository
            .createQueryBuilder()
            .update()
            .set(setProperties)
            .where("userVaultID = :userVaultID", { userVaultID: newUserVault.userVaultID })
            .execute();
    }

    public async deleteFromServerAndVault(vaultID: number)
    {
        this.repository.createQueryBuilder()
            .delete()
            .where("vaultID = :vaultID", { vaultID })
            .execute();
    }
}

const userVaultaultRepository: UserVaultRepository = new UserVaultRepository();
export default userVaultaultRepository;
export type UserVaultRepositoryType = typeof userVaultaultRepository;