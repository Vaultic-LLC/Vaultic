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
import { VaultPreferencesStoreState } from "../Entities/States/VaultPreferencesStoreState";

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
                .leftJoinAndSelect('userVault.vaultPreferencesStoreState', 'vaultPreferencesStoreState')
                .leftJoinAndSelect('userVault.vault', 'vault')
                .leftJoinAndSelect('vault.vaultStoreState', 'vaultStoreState')
                .leftJoinAndSelect('vault.passwordStoreState', 'passwordStoreState')
                .leftJoinAndSelect('vault.valueStoreState', 'valueStoreState')
                .leftJoinAndSelect('vault.filterStoreState', 'filterStoreState')
                .leftJoinAndSelect('vault.groupStoreState', 'groupStoreState')
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
            const currentUser = await environment.repositories.users.getCurrentUser();
            if (!currentUser)
            {
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
        const decryptableProperties = propertiesToDecrypt ?? Vault.getDecrypableProperties();

        for (let i = 0; i < userVaults[0].length; i++)
        {
            const condensedUserVault = userVaults[0][i].condense();

            const decryptedVaultPreferences = await environment.utilities.crypt.decrypt(masterKey, condensedUserVault.vaultPreferencesStoreState);
            if (!decryptedVaultPreferences.success)
            {
                return null;
            }

            condensedUserVault.vaultPreferencesStoreState = decryptedVaultPreferences.value!;

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
        const newUserVault: CondensedVaultData = JSON.parse(data);

        const transaction = new Transaction();
        if (newUserVault.vaultPreferencesStoreState)
        {
            if (!(await environment.repositories.vaultPreferencesStoreStates.updateState(
                oldUserVault.userVaultID, masterKey, newUserVault.vaultPreferencesStoreState, transaction)))
            {
                return false;
            }
        }

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
        const currentUser = await environment.repositories.users.getCurrentUser();
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

    public async postBackupEntitiesUpdates(entities: Partial<UserVault>[]): Promise<boolean> 
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return false;
        }

        try 
        {
            this.repository
                .createQueryBuilder("userVaults")
                .update()
                .set(
                    {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]",
                    }
                )
                .where("userID = :userID", { userID: currentUser.userID })
                .andWhere("userVaultID IN (:...userVaultIDs)", { userVaultIDs: entities.map(e => e.userVaultID) })
                .execute();
        }
        catch 
        {
            // TODO: log
            return false;
        }

        const vaultPreferencesToUpdate: Partial<VaultPreferencesStoreState>[] = entities
            .filter(uv => uv.vaultPreferencesStoreState && uv.vaultPreferencesStoreState.vaultPreferencesStoreStateID)
            .map(uv => uv.vaultPreferencesStoreState!);

        if (vaultPreferencesToUpdate.length > 0)
        {
            return await environment.repositories.vaultPreferencesStoreStates.postBackupEntitiesUpdates(vaultPreferencesToUpdate);
        }

        return true;
    }

    public addFromServer(userVault: Partial<UserVault>, transaction: Transaction): boolean
    {
        if (!UserVault.isValid(userVault))
        {
            return false;
        }

        transaction.insertExistingEntity(userVault, () => environment.repositories.userVaults);
        transaction.insertExistingEntity(userVault.vaultPreferencesStoreState!, () => environment.repositories.vaultPreferencesStoreStates);

        return true;
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