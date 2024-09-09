import { environment } from "../../Environment";
import vaulticServer from "../../Server/VaulticServer";
import { EntityState } from "../../Types/Properties";
import userRepository, { UserRepositoryType } from "./UserRepository";
import userVaultRepository, { UserVaultRepositoryType } from "./UserVaultRepository";
import vaultRepository, { VaultRepositoryType } from "./VaultRepository";

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

export async function getUserDataSignatures(masterKey: string, email: string)
{
    const userData = {};
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
                    vaultPreferencesStoreState: userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
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
    const userToBackup = await environment.repositories.users.getEntityThatNeedToBeBackedUp(masterKey);
    if (!userToBackup[0])
    {
        return false;
    }

    const userVaultsToBackup = await environment.repositories.userVaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!userVaultsToBackup[0])
    {
        return false;
    }

    const vaultsToBackup = await environment.repositories.vaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!vaultsToBackup[0])
    {
        return false;
    }

    // TOOD: should pass this in a single object instead of individually so I can also pass that object to merge
    const backupResponse = await vaulticServer.user.backupData(userToBackup[1], userVaultsToBackup[1], vaultsToBackup[1]);
    if (!backupResponse.Success)
    {
        // TODO: merge objects returned from response and keep trying
    }
    else
    {
        if (userToBackup[1])
        {
            await environment.repositories.users.resetBackupTrackingForEntity(userToBackup[1]);
        }

        if (userVaultsToBackup[1] && userVaultsToBackup[1].length > 0) 
        {
            await environment.repositories.userVaults.resetBackupTrackingForEntities(userVaultsToBackup[1]);
        }

        if (vaultsToBackup[1] && vaultsToBackup[1].length > 0)
        {
            await environment.repositories.vaults.resetBackupTrackingForEntities(vaultsToBackup[1]);
        }
    }

    return true;
}

export async function checkMergeMissingData(clientUserDataPayload: any, serverUserDataPayload: any)
{
    // For any data in serverUserDataPayload, if the matching data entityState is unchanged or inserted in 
    // clientUserDataPayload, then just override it
    // If the entity state is updated, then I need to merge them by updatedTime

    // for each data in clientUserDataPayload with an entityState of Deleted and that isn't in
    // serverUserDataPayload, remove it

    let needsToRePushData = false;
    if (serverUserDataPayload.user)
    {
        if (!clientUserDataPayload.user)
        {
            await environment.repositories.users.addFromServer(serverUserDataPayload.user);
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
            const vaultIndex = clientUserDataPayload.vaults?.findIndex(v => v.vaultID == serverVault.vaultID);

            if (vaultIndex == -1)
            {
                await environment.repositories.vaults.addFromServer(serverVault);
            }
            else 
            {
                await environment.repositories.vaults.updateFromServer(clientUserDataPayload.vaults[vaultIndex], serverVault);
            }
        }
    }

    if (serverUserDataPayload.userVaults)
    {
        for (let i = 0; i < serverUserDataPayload.userVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.userVaults[i];
            const userVaultIndex = clientUserDataPayload.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID);

            if (userVaultIndex == -1)
            {
                await environment.repositories.vaults.addFromServer(serverUserVault);
            }
            else 
            {
                await environment.repositories.userVaults.updateFromServer(clientUserDataPayload.userVaults[userVaultIndex], serverUserVault);
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
            if (clientUserDataPayload.vaults.entityState == EntityState.Deleted)
            {
                await environment.repositories.vaults.deleteFromServer(clientUserDataPayload.vaults[i]);
            }
        }
    }
}