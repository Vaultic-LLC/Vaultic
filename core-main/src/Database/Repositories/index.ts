import { UserRepository, UserVaultRepository, VaultRepository } from "../../Types/Repositories";
import userRepositoryInitalizer from "./UserRepositoryInitalizer";
import userVaultaultRepositoryInitalizer from "./UserVaultRepositoryInitalizer";
import vaultRepositoryInitalizer from "./VaultRepositoryInitalizer";

export interface VaulticRepositories
{
    users: UserRepository;
    vaults: VaultRepository;
    userVaults: UserVaultRepository;
}

export function initRepositories(): VaulticRepositories
{
    const userRepository = userRepositoryInitalizer.init();
    const vaultRepository = vaultRepositoryInitalizer.init();
    const userVaultRepository = userVaultaultRepositoryInitalizer.init();

    if (!userRepository[0] || !vaultRepository[0] || !userVaultRepository[0])
    {
        // TODO: handle
    }

    const repositories: VaulticRepositories = {
        users: userRepository[1],
        vaults: vaultRepository[1],
        userVaults: userVaultRepository[1]
    };

    return repositories;
}