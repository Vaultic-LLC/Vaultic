import { environment } from "../../Environment";
import { Repository } from "typeorm";
import { VaulticRepositoryInitalizer } from "./VaulticRepositoryInitalizer";
import { UserVault } from "../Entities/UserVault";
import { UserVaultRepository } from "../../Types/Repositories";

class UserVaultRepositoryInitalizer extends VaulticRepositoryInitalizer<UserVault, UserVaultRepository>
{
    protected getRepository(): Repository<UserVault> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserVault);
    }

    protected getRepositoryExtension(): any 
    {
    }

}

const userVaultaultRepositoryInitalizer: UserVaultRepositoryInitalizer = new UserVaultRepositoryInitalizer();
export default userVaultaultRepositoryInitalizer;