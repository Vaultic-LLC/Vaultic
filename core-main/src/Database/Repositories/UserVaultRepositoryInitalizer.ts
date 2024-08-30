import { environment } from "../../Environment";
import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepositoryInitalizer";
import { UserVault } from "../Entities/UserVault";
import Transaction from "../Transaction";
import vaulticServer from "../../Server/VaulticServer";

class UserVaultRepository extends VaulticRepository<UserVault>
{
    protected getRepository(): Repository<UserVault> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserVault);
    }

    public async getByVaultID(vaultID: number): Promise<UserVault | null>
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return null;
        }

        return this.retrieveReactive((repository) => repository.findOneBy({
            userID: currentUser.userID,
            vaultID: vaultID
        }));
    }

    public async getUserVaults(vaultID?: number): Promise<UserVault[]>
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return [];
        }

        return this.retrieveManyReactive(getUserVaultsQuery);

        function getUserVaultsQuery(repository: Repository<UserVault>)
        {
            const userVaultQuery = repository
                .createQueryBuilder('userVault')
                .leftJoinAndSelect('userVault.vault', 'vault')
                .where('userVault.userID = :userID', { userID: currentUser?.userID });

            if (vaultID)
            {
                userVaultQuery.andWhere("vault.vaultID = :vaultID", { vaultID });
            }

            return userVaultQuery.getMany();
        }
    }

    public async saveUserVault(masterKey: string, vaultID: number, data: string): Promise<boolean>
    {
        const userVaults = await this.getUserVaults(vaultID);
        if (userVaults.length != 1)
        {
            return false;
        }

        const parsedData = JSON.parse(data);
        Object.assign(userVaults, parsedData);

        const { vaultPreferencesStoreState, ...newUserVault } = userVaults[0];

        const succeeded = await userVaults[0].encryptAndSetEach!(masterKey, Object.keys(newUserVault));
        if (!succeeded)
        {
            return false;
        }

        const transaction = new Transaction();
        transaction.updateEntity(userVaults[0], masterKey, () => this);

        const saved = await transaction.commit();
        if (!saved)
        {
            return false;
        }

        // TODO: this should be done seperatly. not being able to backup shouldn't be considered the same 
        // as an error while saving
        const backupResponse = await vaulticServer.user.backupData(undefined, [userVaults[0]], undefined);
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