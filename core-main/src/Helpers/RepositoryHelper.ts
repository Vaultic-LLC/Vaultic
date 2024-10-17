import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { User } from "../Database/Entities/User";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { EntityState } from "@vaultic/shared/Types/Entities";

export async function safetifyMethod<T>(calle: any, method: () => Promise<TypedMethodResponse<T>>): Promise<TypedMethodResponse<T | undefined>>
{
    try
    {
        const response: TypedMethodResponse<T> = await method.apply(calle);
        if (!response.success)
        {
            response.addToCallStack(method.name);
            await environment.repositories.logs.logMethodResponse(response);
        }

        return response;
    }
    catch (e)
    {
        if (e instanceof TypedMethodResponse)
        {
            const response = e as TypedMethodResponse<any>;

            response.addToCallStack(method.name);
            await environment.repositories.logs.logMethodResponse(response);

            return response;
        }

        await environment.repositories.logs.log(undefined, `Exception: ${JSON.stringify(e)}`, method.name);
    }

    return TypedMethodResponse.fail();
}

export async function getUserDataSignatures(masterKey: string, email: string): Promise<UserDataPayload>
{
    let userData = {}
    const user = await environment.repositories.users.findByEmail(masterKey, email);
    if (!user)
    {
        return userData;
    }

    userData["user"] =
    {
        userID: user.userID,
        currentSignature: user.currentSignature,
        appStoreState:
        {
            appStoreStateID: user.appStoreState.appStoreStateID,
            currentSignature: user.appStoreState.currentSignature,
        },
        userPreferencesStoreState:
        {
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
                vaultPreferencesStoreState:
                {
                    vaultPreferencesStoreStateID: userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
                    currentSignature: userVault.vaultPreferencesStoreState.currentSignature
                }
            });

            userData["vaults"].push({
                vaultID: userVault.vault.vaultID,
                currentSignature: userVault.vault.currentSignature,
                entityState: userVault.vault.entityState,
                vaultStoreState:
                {
                    vaultStoreStateID: userVault.vault.vaultStoreState.vaultStoreStateID,
                    currentSignature: userVault.vault.vaultStoreState.currentSignature
                },
                passwordStoreState:
                {
                    passwordStoreStateID: userVault.vault.passwordStoreState.passwordStoreStateID,
                    currentSignature: userVault.vault.passwordStoreState.currentSignature
                },
                valueStoreState:
                {
                    valueStoreStateID: userVault.vault.valueStoreState.valueStoreStateID,
                    currentSignature: userVault.vault.valueStoreState.currentSignature
                },
                filterStoreState:
                {
                    filterStoreStateID: userVault.vault.filterStoreState.filterStoreStateID,
                    currentSignature: userVault.vault.filterStoreState.currentSignature
                },
                groupStoreState:
                {
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

    console.log(`\nBacking up user: ${JSON.stringify(userToBackup[1])}`);
    console.log(`\nBacking up userVaults: ${JSON.stringify(userVaultsToBackup[1])}`);
    console.log(`\nBacking up vaults: ${JSON.stringify(vaultsToBackup[1])}`);

    const backupResponse = await vaulticServer.user.backupData(userToBackup[1], userVaultsToBackup[1], vaultsToBackup[1]);
    if (!backupResponse.Success)
    {
        console.log(`backup failed: ${JSON.stringify(backupResponse)}`);
        console.log('\n')
        // TODO: merge objects returned from response and keep trying

        return false;
    }
    else
    {
        const transaction = new Transaction();
        if (userToBackup[1])
        {
            await environment.repositories.users.postBackupEntityUpdates(masterKey, userToBackup[1], transaction);
        }

        if (userVaultsToBackup[1] && userVaultsToBackup[1].length > 0) 
        {
            await environment.repositories.userVaults.postBackupEntitiesUpdates(masterKey, userVaultsToBackup[1], transaction);
        }

        if (vaultsToBackup[1] && vaultsToBackup[1].length > 0)
        {
            await environment.repositories.vaults.postBackupEntitiesUpdates(masterKey, vaultsToBackup[1], transaction);
        }

        if (!await transaction.commit())
        {
            console.log('backup transaction failed');
            return false;
        }
    }

    console.log('Backup succeeded');
    return true;
}

// For any data in serverUserDataPayload, if the matching data entityState is unchanged or inserted in 
// clientUserDataPayload, then just override it
// If the entity state is updated, then I need to merge them by updatedTime

// for each data in clientUserDataPayload with an entityState of Deleted and that isn't in
// serverUserDataPayload, remove it
export async function checkMergeMissingData(masterKey: string, email: string, clientUserDataPayload: UserDataPayload, serverUserDataPayload: UserDataPayload, transaction?: Transaction): Promise<boolean>
{
    if (!serverUserDataPayload)
    {
        return false;
    }

    transaction = transaction ?? new Transaction();
    let needsToRePushData = false;

    if (serverUserDataPayload.user)
    {
        if (!clientUserDataPayload.user)
        {
            // The user was never successfully created
            if (!User.isValid(serverUserDataPayload.user))
            {
                if (!serverUserDataPayload.user.publicKey || !serverUserDataPayload.user.privateKey)
                {
                    await environment.repositories.logs.log(undefined, "No Public or Private Key for User", "checkMergeMissingData")
                    return false;
                }

                return (await environment.repositories.users.createUser(masterKey, email, serverUserDataPayload.user.publicKey!, serverUserDataPayload.user.privateKey!, transaction)).success;
            }

            if (!(await environment.repositories.users.addFromServer(masterKey, serverUserDataPayload.user, transaction)))
            {
                return false;
            }
        }
        else
        {
            await environment.repositories.users.updateFromServer(clientUserDataPayload.user, serverUserDataPayload.user, transaction);
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
                await environment.repositories.vaults.updateFromServer(clientUserDataPayload.vaults![vaultIndex], serverVault, transaction);
            }
            else 
            {
                // don't want to return if this fails since we could have others that succeed
                if (!environment.repositories.vaults.addFromServer(serverVault, transaction))
                {
                    await environment.repositories.logs.log(undefined, `Failed to add vault from server. VaultID: ${serverVault?.vaultID}`);
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
                await environment.repositories.userVaults.updateFromServer(clientUserDataPayload.userVaults![userVaultIndex], serverUserVault, transaction);
            }
            else 
            {
                // don't want to return if this fails since we could have others that succeed
                if (!environment.repositories.userVaults.addFromServer(serverUserVault, transaction))
                {
                    await environment.repositories.logs.log(undefined, `Failed to add userVault from server. UserVaultID: ${serverUserVault?.userVaultID}`);
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
                // TODO: implement
                //await environment.repositories.vaults.deleteFromServer(clientUserDataPayload.vaults[i]);
            }
        }
    }

    return await transaction.commit();
}

export async function reloadAllUserData(masterKey: string, email: string, userDataPayload: UserDataPayload): Promise<boolean>
{
    // Yeet all data so we don't have to worry about different users data potentially being tangled
    const transaction = new Transaction();
    transaction.raw("DELETE FROM users");
    transaction.raw("DELETE FROM vaults");
    transaction.raw("DELETE FROM userVaults");

    return await checkMergeMissingData(masterKey, email, {}, userDataPayload, transaction);
}