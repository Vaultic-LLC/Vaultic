import { environment } from "../../Environment";
import vaulticServer from "../../Server/VaulticServer";
import { EntityState } from "../../Types/Properties";
import { UserDataPayload } from "../../Types/ServerTypes";
import Transaction from "../Transaction";
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

    const repositories: VaulticRepositories = {
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

export async function getUserDataSignatures(masterKey: string, email: string)
{
    const userData: UserDataPayload = {};
    const user = await environment.repositories.users.findByEmail(email);
    if (!user)
    {
        return userData;
    }

    if (!(await user.verify(masterKey)))
    {
        return userData;
    }

    userData["user"] =
    {
        userID: user.userID,
        currentSignature: user.currentSignature,
        appStoreState: {
            appStoreStateID: user.appStoreState.appStoreStateID,
            currentSignature: user.appStoreState.currentSignature,
        },
        userPreferencesStoreState: {
            userPreferencesStoreStateID: user.userPreferencesStoreState.userPreferencesStoreStateID,
            currentSignature: user.userPreferencesStoreState.currentSignature
        }
    };

    const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, undefined, user);
    if (userVaults[0].length > 0)
    {
        userData["userVaults"] = [];
        userData["vaults"] = [];

        for (let i = 0; i < userVaults[0].length; i++)
        {
            const userVault = userVaults[0][i];

            userData["userVaults"].push({
                userVaultID: userVault.userVaultID,
                currentSignature: userVault.currentSignature,
                entityState: userVault.entityState,
                vaultPreferencesStoreState: {
                    vaultPreferencesStoreStateID: userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
                    currentSignature: userVault.vaultPreferencesStoreState.currentSignature
                }
            });

            userData["vaults"].push({
                vaultID: userVault.vault.vaultID,
                currentSignature: userVault.vault.currentSignature,
                entityState: userVault.vault.entityState,
                vaultStoreState: {
                    vaultStoreStateID: userVault.vault.vaultStoreState.vaultStoreStateID,
                    currentSignature: userVault.vault.vaultStoreState.currentSignature
                },
                passwordStoreState: {
                    passwordStoreStateID: userVault.vault.passwordStoreState.passwordStoreStateID,
                    currentSignature: userVault.vault.passwordStoreState.currentSignature
                },
                valueStoreState: {
                    valueStoreStateID: userVault.vault.valueStoreState.valueStoreStateID,
                    currentSignature: userVault.vault.valueStoreState.currentSignature
                },
                filterStoreState: {
                    filterStoreStateID: userVault.vault.filterStoreState.filterStoreStateID,
                    currentSignature: userVault.vault.filterStoreState.currentSignature
                },
                groupStoreState: {
                    groupStoreStateID: userVault.vault.groupStoreState.groupStoreStateID,
                    currentSignature: userVault.vault.groupStoreState.currentSignature
                }
            });
        }
    }

    return userData;
}

export async function backupData(masterKey: string)
{
    // TODO: need to handle differnet false values. aka no current user vs unable to verify record
    // if unable to verify record, need to re pull data
    const userToBackup = await environment.repositories.users.getEntityThatNeedToBeBackedUp(masterKey);
    if (!userToBackup[0])
    {
        console.log('no user to backup');
        return false;
    }

    const userVaultsToBackup = await environment.repositories.userVaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!userVaultsToBackup[0])
    {
        console.log('no user vaults to backup');
        return false;
    }

    const vaultsToBackup = await environment.repositories.vaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!vaultsToBackup[0])
    {
        console.log('no vaults to backup');
        return false;
    }

    // TOOD: should pass this in a single object instead of individually so I can also pass that object to merge
    const backupResponse = await vaulticServer.user.backupData(userToBackup[1], userVaultsToBackup[1], vaultsToBackup[1]);
    if (!backupResponse.Success)
    {
        console.log(`backup failed: ${JSON.stringify(backupResponse)}`);
        console.log('\n')
        // TODO: merge objects returned from response and keep trying
    }
    else
    {
        if (userToBackup[1])
        {
            await environment.repositories.users.postBackupEntityUpdates(userToBackup[1]);
        }

        if (userVaultsToBackup[1] && userVaultsToBackup[1].length > 0) 
        {
            await environment.repositories.userVaults.postBackupEntitiesUpdates(userVaultsToBackup[1]);
        }

        if (vaultsToBackup[1] && vaultsToBackup[1].length > 0)
        {
            await environment.repositories.vaults.postBackupEntitiesUpdates(vaultsToBackup[1]);
        }
    }

    return true;
}

export async function checkMergeMissingData(masterKey: string, clientUserDataPayload: UserDataPayload, serverUserDataPayload: UserDataPayload)
{
    if (!serverUserDataPayload)
    {
        return;
    }
    // For any data in serverUserDataPayload, if the matching data entityState is unchanged or inserted in 
    // clientUserDataPayload, then just override it
    // If the entity state is updated, then I need to merge them by updatedTime

    // for each data in clientUserDataPayload with an entityState of Deleted and that isn't in
    // serverUserDataPayload, remove it
    const transaction = new Transaction();

    let needsToRePushData = false;
    if (serverUserDataPayload.user)
    {
        if (!clientUserDataPayload.user)
        {
            if (!(await environment.repositories.users.addFromServer(masterKey, serverUserDataPayload.user, transaction)))
            {
                return false;
            }
        }
        else 
        {
            await environment.repositories.users.updateFromServer(clientUserDataPayload.user, serverUserDataPayload.user);
        }
    }

    // Needs to be done before userVaults for when adding a new vault + userVault. Vault has to be saved before userVault.
    if (serverUserDataPayload.vaults)
    {
        for (let i = 0; i < serverUserDataPayload.vaults.length; i++)
        {
            const serverVault = serverUserDataPayload.vaults[i];
            const vaultIndex = clientUserDataPayload.vaults?.findIndex(v => v.vaultID == serverVault.vaultID) ?? -1;

            if (vaultIndex >= 0)
            {
                await environment.repositories.vaults.updateFromServer(clientUserDataPayload.vaults![vaultIndex], serverVault);
            }
            else 
            {
                if (!environment.repositories.vaults.addFromServer(serverVault, transaction))
                {
                    // TODO: log error
                }
            }
        }
    }

    if (serverUserDataPayload.userVaults)
    {
        for (let i = 0; i < serverUserDataPayload.userVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.userVaults[i];
            const userVaultIndex = clientUserDataPayload.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;

            if (userVaultIndex >= 0)
            {
                await environment.repositories.userVaults.updateFromServer(clientUserDataPayload.userVaults![userVaultIndex], serverUserVault);
            }
            else 
            {
                if (!environment.repositories.userVaults.addFromServer(serverUserVault, transaction))
                {
                    // TODO: log error
                }
            }
        }
    }

    if (needsToRePushData)
    {
        // If we merged data, need to push the updated states back to the server. If there are more updates, then 
        // can just call this method again with new data
    }

    if (clientUserDataPayload.vaults)
    {
        for (let i = 0; i < clientUserDataPayload.vaults.length; i++)
        {
            if (clientUserDataPayload.vaults[i].entityState == EntityState.Deleted)
            {
                //await environment.repositories.vaults.deleteFromServer(clientUserDataPayload.vaults[i]);
            }
        }
    }

    await transaction.commit();
}