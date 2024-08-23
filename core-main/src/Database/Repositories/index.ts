import userRepository, { UserRepositoryType } from "./UserRepositoryInitalizer";
import userVaultRepository, { UserVaultRepositoryType } from "./UserVaultRepositoryInitalizer";
import vaultRepository, { VaultRepositoryType } from "./VaultRepositoryInitalizer";

export interface VaulticRepositories
{
    users: UserRepositoryType;
    vaults: VaultRepositoryType;
    userVaults: UserVaultRepositoryType;
}

export function initRepositories(): VaulticRepositories
{
    const userRepositorySucceeded = userRepository.init();
    const vaultRepositorySucceeded = userVaultRepository.init();
    const userVaultRepositorySucceeded = vaultRepository.init();

    if (!userRepositorySucceeded || !vaultRepositorySucceeded || !userVaultRepositorySucceeded)
    {
        // TODO: add a log table that I can write to internally and that users can export 
        throw "Error from repositories";
    }

    const repositories: VaulticRepositories = {
        users: userRepository,
        vaults: vaultRepository,
        userVaults: userVaultRepository
    };

    return repositories;
}