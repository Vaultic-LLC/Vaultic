import { environment } from "../../Environment";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepository";
import { UserVault } from "../Entities/UserVault";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";
import { VaultKey } from "../../Types/Properties";
import { CondensedVaultData } from "../../Types/Repositories";
import { Vault } from "../Entities/Vault";
import { User } from "../Entities/User";

class UserVaultRepository extends VaulticRepository<UserVault>
{
    protected getRepository(): Repository<UserVault> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserVault);
    }

    private async getUserVaults(currentUser: User, userVaultID?: number): Promise<UserVault[]>
    {
        return this.retrieveManyReactive(getUserVaultsQuery);

        function getUserVaultsQuery(repository: Repository<UserVault>)
        {
            const userVaultQuery = repository
                .createQueryBuilder('userVault')
                .leftJoinAndSelect('userVault.vault', 'vault')
                .where('userVault.userID = :userID', { userID: currentUser?.userID });

            if (userVaultID)
            {
                userVaultQuery.andWhere("userVault.userVaultID = :userVaultID", { userVaultID });
            }

            return userVaultQuery.getMany();
        }
    }

    public async getVerifiedUserVaults(masterKey: string, userVaultID?: number): Promise<[UserVault[], string[]]>
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            console.log('no user')
            return [[], []];
        }

        const userVaults: UserVault[] = await this.getUserVaults(currentUser, userVaultID);
        if (userVaults.length == 0)
        {
            console.log('no user vaults')
            return [[], []];
        }

        const decryptedPrivateKey = await environment.utilities.crypt.decrypt(masterKey, currentUser.privateKey);
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

    public async saveUserVault(masterKey: string, userVaultID: number, data: string): Promise<boolean>
    {
        const userVaults = await this.getVerifiedUserVaults(masterKey, userVaultID);
        if (userVaults[0].length != 1)
        {
            return false;
        }

        const oldUserVault = userVaults[0][0];
        const parsedData = JSON.parse(data);

        oldUserVault.copyFrom(parsedData);

        // there shouldn't be any encrypted properties that are being updated through this method
        // const succeeded = await oldUserVault.encryptAndSetFromObject!(masterKey, newUserVault);
        // if (!succeeded)
        // {
        //     return false;
        // }

        const transaction = new Transaction();
        transaction.updateEntity(oldUserVault, masterKey, () => this);

        const saved = await transaction.commit();
        if (!saved)
        {
            return false;
        }

        // TODO: this should be done seperatly. not being able to backup shouldn't be considered the same 
        // as an error while saving
        const backupResponse = await vaulticServer.user.backupData(undefined, [oldUserVault], undefined);
        if (!backupResponse.Success)
        {
            //return JSON.stringify(backupResponse);
        }

        return true;
    }
}

const userVaultaultRepository: UserVaultRepository = new UserVaultRepository();
export default userVaultaultRepository;
export type UserVaultRepositoryType = typeof userVaultaultRepository;