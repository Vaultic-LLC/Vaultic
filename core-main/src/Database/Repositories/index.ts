import logRepository, { LogRepositoryType } from "./LogRepository";
import appStoreStateRepository, { AppStoreStateRepositoryType } from "./StoreState/AppStoreStateRepository";
import filterStoreStateRepository, { FilterStoreStateRepositoryType } from "./StoreState/FilterStoreStateRepository";
import groupStoreStateRepository, { GroupStoreStateRepositoryType } from "./StoreState/GroupStoreStateRepository";
import passwordStoreStateRepository, { PasswordStoreStateRepositoryType } from "./StoreState/PasswordStoreStateRepository";
import userPreferencesStoreStateRepository, { UserPreferencesStoreStateRepositoryType } from "./StoreState/UserPreferencesStoreStateRepository";
import valueStoreStateRepository, { ValueStoreStateRepositoryType } from "./StoreState/ValueStoreStateRepository";
import vaultPreferencesStoreStateRepository, { VaultPreferencesStoreStateRepositoryType } from "./StoreState/VaultPreferencesStoreStateRepository";
import vaultStoreStateRepository, { VaultStoreStateRepositoryType } from "./StoreState/VaultStoreStateRepository";
import userRepository, { UserRepositoryType } from "./UserRepository";
import userVaultRepository, { UserVaultRepositoryType } from "./UserVaultRepository";
import vaultRepository, { VaultRepositoryType } from "./VaultRepository";

export interface VaulticRepositories
{
    logs: LogRepositoryType;
    users: UserRepositoryType;
    appStoreStates: AppStoreStateRepositoryType;
    userPreferencesStoreStates: UserPreferencesStoreStateRepositoryType;
    userVaults: UserVaultRepositoryType;
    vaultPreferencesStoreStates: VaultPreferencesStoreStateRepositoryType;
    vaults: VaultRepositoryType;
    vaultStoreStates: VaultStoreStateRepositoryType;
    passwordStoreStates: PasswordStoreStateRepositoryType;
    valueStoreStates: ValueStoreStateRepositoryType;
    filterStoreStates: FilterStoreStateRepositoryType;
    groupStoreStates: GroupStoreStateRepositoryType;
}

export function initRepositories(): VaulticRepositories
{
    logRepository.init();

    userRepository.init();
    appStoreStateRepository.init();
    userPreferencesStoreStateRepository.init();

    userVaultRepository.init();
    vaultPreferencesStoreStateRepository.init();

    vaultRepository.init();
    vaultStoreStateRepository.init();
    passwordStoreStateRepository.init();
    valueStoreStateRepository.init();
    filterStoreStateRepository.init();
    groupStoreStateRepository.init();

    const repositories: VaulticRepositories =
    {
        logs: logRepository,
        users: userRepository,
        appStoreStates: appStoreStateRepository,
        userPreferencesStoreStates: userPreferencesStoreStateRepository,
        userVaults: userVaultRepository,
        vaultPreferencesStoreStates: vaultPreferencesStoreStateRepository,
        vaults: vaultRepository,
        vaultStoreStates: vaultStoreStateRepository,
        passwordStoreStates: passwordStoreStateRepository,
        valueStoreStates: valueStoreStateRepository,
        filterStoreStates: filterStoreStateRepository,
        groupStoreStates: groupStoreStateRepository
    };

    return repositories;
}