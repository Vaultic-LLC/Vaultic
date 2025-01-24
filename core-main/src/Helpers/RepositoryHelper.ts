import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { User } from "../Database/Entities/User";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { CurrentSignaturesVaultKeys } from "../Types/Responses";

export async function safetifyMethod<T>(calle: any, method: () => Promise<TypedMethodResponse<T>>, onFail?: () => Promise<any>): Promise<TypedMethodResponse<T | undefined>>
{
    try
    {
        const response: TypedMethodResponse<T> = await method.apply(calle);
        if (!response.success)
        {
            response.addToCallStack(method.name);
            await environment.repositories.logs.logMethodResponse(response);
            await onFail?.();
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
            await onFail?.();

            return response;
        }

        const callStack = `${method.name}\n${Error().stack}`;
        await environment.repositories.logs.log(undefined, `Exception: ${JSON.vaulticStringify(e)}`, callStack);
    }

    await onFail?.();
    return TypedMethodResponse.fail();
}

export async function getUserDataSignatures(masterKey: string, email: string): Promise<CurrentSignaturesVaultKeys>
{
    let userData = {}
    const user = await environment.repositories.users.findByEmail(masterKey, email);
    if (!user)
    {
        return { signatures: userData, keys: [] };
    }

    userData["user"] =
    {
        userID: user.userID,
        currentSignature: user.currentSignature,
        appStoreState:
        {
            appStoreStateID: user.appStoreState.appStoreStateID,
            currentSignature: user.appStoreState.currentSignature,
            entityState: user.appStoreState.entityState
        },
        userPreferencesStoreState:
        {
            userPreferencesStoreStateID: user.userPreferencesStoreState.userPreferencesStoreStateID,
            currentSignature: user.userPreferencesStoreState.currentSignature,
            entityState: user.userPreferencesStoreState.entityState
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
                permissions: userVault.permissions,
                vaultPreferencesStoreState:
                {
                    vaultPreferencesStoreStateID: userVault.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
                    currentSignature: userVault.vaultPreferencesStoreState.currentSignature,
                    entityState: userVault.vaultPreferencesStoreState.entityState
                }
            });

            userData["vaults"].push({
                vaultID: userVault.vault.vaultID,
                currentSignature: userVault.vault.currentSignature,
                entityState: userVault.vault.entityState,
                vaultStoreState:
                {
                    vaultStoreStateID: userVault.vault.vaultStoreState.vaultStoreStateID,
                    currentSignature: userVault.vault.vaultStoreState.currentSignature,
                    entityState: userVault.vault.vaultStoreState.entityState
                },
                passwordStoreState:
                {
                    passwordStoreStateID: userVault.vault.passwordStoreState.passwordStoreStateID,
                    currentSignature: userVault.vault.passwordStoreState.currentSignature,
                    entityState: userVault.vault.passwordStoreState.entityState
                },
                valueStoreState:
                {
                    valueStoreStateID: userVault.vault.valueStoreState.valueStoreStateID,
                    currentSignature: userVault.vault.valueStoreState.currentSignature,
                    entityState: userVault.vault.valueStoreState.entityState
                },
                filterStoreState:
                {
                    filterStoreStateID: userVault.vault.filterStoreState.filterStoreStateID,
                    currentSignature: userVault.vault.filterStoreState.currentSignature,
                    entityState: userVault.vault.filterStoreState.entityState
                },
                groupStoreState:
                {
                    groupStoreStateID: userVault.vault.groupStoreState.groupStoreStateID,
                    currentSignature: userVault.vault.groupStoreState.currentSignature,
                    entityState: userVault.vault.groupStoreState.entityState
                }
            });
        }
    }

    return { signatures: userData, keys: userVaults[1] };
}

// Only call within a method wrapped in safetifyMethod
export async function backupData(masterKey: string)
{
    console.time("6");
    const userToBackup = await environment.repositories.users.getEntityThatNeedsToBeBackedUp(masterKey);
    if (!userToBackup.success)
    {
        return false;
    }

    const userVaultsToBackup = await environment.repositories.userVaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!userVaultsToBackup.success)
    {
        return false;
    }

    const vaultsToBackup = await environment.repositories.vaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!vaultsToBackup.success)
    {
        return false;
    }

    console.timeEnd("6");
    console.time("7");
    const postData: { userDataPayload: UserDataPayload } = { userDataPayload: {} };
    if (userToBackup.value)
    {
        postData.userDataPayload["user"] = userToBackup.value;
    }

    if (userVaultsToBackup.value && userVaultsToBackup.value.length > 0)
    {
        postData.userDataPayload["userVaults"] = userVaultsToBackup.value;
    }

    if (vaultsToBackup.value?.vaults && vaultsToBackup.value.vaults.length > 0)
    {
        postData.userDataPayload["vaults"] = vaultsToBackup.value.vaults;
    }

    const backupResponse = await vaulticServer.user.backupData(postData);
    console.timeEnd("7");
    if (!backupResponse.Success)
    {
        console.time("8");
        const s = await checkMergeMissingData(masterKey, "", vaultsToBackup.value?.keys, postData.userDataPayload, backupResponse.userDataPayload);
        console.timeEnd("8");
        return s;
    }
    else
    {
        console.time("9");
        const transaction = new Transaction();
        if (userToBackup.value)
        {
            await environment.repositories.users.postBackupEntityUpdates(masterKey, userToBackup.value, transaction);
        }

        if (userVaultsToBackup.value && userVaultsToBackup.value.length > 0) 
        {
            await environment.repositories.userVaults.postBackupEntitiesUpdates(masterKey, userVaultsToBackup.value, transaction);
        }

        if (vaultsToBackup.value?.vaults && vaultsToBackup.value?.vaults?.length > 0)
        {
            await environment.repositories.vaults.postBackupEntitiesUpdates(masterKey, vaultsToBackup.value.vaults, transaction);
        }

        // all data succesfully backed up, no need for change trackings anymore
        await environment.repositories.changeTrackings.clearChangeTrackings(masterKey, transaction);

        if (!await transaction.commit())
        {
            return false;
        }
        console.timeEnd("9");
    }

    return true;
}

export async function safeBackupData(masterKey: string): Promise<TypedMethodResponse<boolean | undefined>>
{
    return await safetifyMethod(this, internalDoBackupData);

    async function internalDoBackupData(this: any): Promise<TypedMethodResponse<boolean>>
    {
        const success = await backupData(masterKey);
        if (!success)
        {
            return TypedMethodResponse.fail();
        }

        return TypedMethodResponse.success(true);
    }
}

// For any data in serverUserDataPayload, if the matching data entityState is unchanged or inserted in 
// clientUserDataPayload, then just override it
// If the entity state is updated, then I need to merge them by updatedTime
//
// any vaults / userVaults that are maked as 'removed' from the server will be deleted
export async function checkMergeMissingData(masterKey: string, email: string, vaultKeys: string[], clientUserDataPayload: UserDataPayload, serverUserDataPayload: UserDataPayload, transaction?: Transaction): Promise<boolean>
{
    console.log(`Merging Data: ${JSON.stringify(serverUserDataPayload)}`);
    if (!serverUserDataPayload)
    {
        return false;
    }

    transaction = transaction ?? new Transaction();
    let needsToRePushData = false;
    const changeTrackings = await environment.repositories.changeTrackings.getChangeTrackingsByID(masterKey, email);

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
            if (await environment.repositories.users.updateFromServer(masterKey, clientUserDataPayload.user, serverUserDataPayload.user, changeTrackings, transaction))
            {
                needsToRePushData = true;
            }
        }
    }

    // Needs to be done before userVaults for when adding a new vault + userVault. Vault has to be saved before userVault.
    if (serverUserDataPayload.vaults)
    {
        const allLocalVaults = await environment.repositories.vaults.getAllVaultIDs();
        for (let i = 0; i < serverUserDataPayload.vaults.length; i++)
        {
            const serverVault = serverUserDataPayload.vaults[i];
            if (!allLocalVaults.has(serverVault.vaultID))
            {
                // don't want to return if this fails since we could have others that succeed
                if (!environment.repositories.vaults.addFromServer(serverVault, transaction))
                {
                    await environment.repositories.logs.log(undefined, `Failed to add vault from server. VaultID: ${serverVault?.vaultID}`);
                }
            }
            else
            {
                // don't worry about updating vault that is from shared. If the vault is already on the client we can't update without the vault key, 
                // which is in a userVault we probably don't have saved yet. Not updating shouldn't cause any issues and will just be less 
                // performative since we'll have to do another run through here if the signatures don't match the servers for that vault
                const vaultIndex = clientUserDataPayload.vaults?.findIndex(v => v.vaultID == serverVault.vaultID) ?? -1;
                if (vaultIndex >= 0)
                {
                    if (await environment.repositories.vaults.updateFromServer(vaultKeys[vaultIndex], clientUserDataPayload.vaults![vaultIndex], serverVault, changeTrackings, transaction))
                    {
                        needsToRePushData = true;
                    }
                }
            }
        }
    }

    if (serverUserDataPayload.userVaults)
    {
        console.log(`User Vaults: ${JSON.stringify(serverUserDataPayload.userVaults)}\n`)
        for (let i = 0; i < serverUserDataPayload.userVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.userVaults[i];
            const userVaultIndex = clientUserDataPayload.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;

            if (userVaultIndex >= 0)
            {
                if (await environment.repositories.userVaults.updateFromServer(clientUserDataPayload.userVaults![userVaultIndex], serverUserVault, changeTrackings, transaction))
                {
                    needsToRePushData = true;
                }
            }
            else
            {
                // don't want to return if this fails since we could have others that succeed
                if (!environment.repositories.userVaults.addFromServer(serverUserVault, transaction))
                {
                    await environment.repositories.logs.log(undefined, `Failed to add userVault from server. UserVaultID: ${JSON.stringify(serverUserVault)}`);
                }
            }
        }
    }

    if (serverUserDataPayload.sharedUserVaults)
    {
        console.log(`Shared User Vaults: ${JSON.stringify(serverUserDataPayload.sharedUserVaults)}\n`)
        for (let i = 0; i < serverUserDataPayload.sharedUserVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.sharedUserVaults[i];
            if (serverUserVault.isSetup === false)
            {
                // If we failed to backup after setting up the shared userVault before, well have the userVault locally but the server
                // will still think it needs to be setup
                const userVault = clientUserDataPayload.userVaults?.filter(uv => uv.userVaultID == serverUserVault.userVaultID);
                if (!userVault || userVault.length == 0)
                {
                    await environment.repositories.userVaults.setupSharedUserVault(masterKey, serverUserVault, transaction);
                }

                needsToRePushData = true;
            }
            else
            {
                // These will be passed to the server within userVaults, not sharedUserVaults. sharedUserVaults is only for passed data back from the server
                const userVaultIndex = clientUserDataPayload.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;
                if (userVaultIndex >= 0)
                {
                    if (await environment.repositories.userVaults.updateFromServer(clientUserDataPayload.userVaults![userVaultIndex], serverUserVault, changeTrackings, transaction))
                    {
                        needsToRePushData = true;
                    }
                }
            }
        }
    }

    if (serverUserDataPayload.removedUserVaults)
    {
        console.log(`Removed User Vaults: ${JSON.stringify(serverUserDataPayload.removedUserVaults)}`);
        for (let i = 0; i < serverUserDataPayload.removedUserVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.removedUserVaults[i];
            const userVaultIndex = clientUserDataPayload.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;

            if (userVaultIndex >= 0)
            {
                transaction.deleteEntity(serverUserVault.userVaultID, () => environment.repositories.userVaults);
            }
        }
    }

    if (serverUserDataPayload.removedVaults)
    {
        console.log(`Removed Vaults: ${JSON.stringify(serverUserDataPayload.removedVaults)}`);
        for (let i = 0; i < serverUserDataPayload.removedVaults.length; i++)
        {
            const serverVault = serverUserDataPayload.removedVaults[i];
            const vaultIndex = clientUserDataPayload.vaults?.findIndex(v => v.vaultID == serverVault.vaultID) ?? -1;

            if (vaultIndex >= 0)
            {
                transaction.deleteEntity(serverVault.vaultID, () => environment.repositories.vaults);
            }
        }
    }

    // we've handled all trackedChanges. Clear them
    await environment.repositories.changeTrackings.clearChangeTrackings(masterKey, transaction);

    if (!(await transaction.commit()))
    {
        return false;
    }

    if (needsToRePushData)
    {
        return await backupData(masterKey);
    }

    return true;
}

export async function reloadAllUserData(masterKey: string, email: string, userDataPayload: UserDataPayload): Promise<boolean>
{
    // Yeet all data so we don't have to worry about different users data potentially being tangled
    const transaction = new Transaction();
    transaction.raw("DELETE FROM users");
    transaction.raw("DELETE FROM vaults");
    transaction.raw("DELETE FROM userVaults");
    transaction.raw("DELETE FROM changeTrackings");

    return await checkMergeMissingData(masterKey, email, [], {}, userDataPayload, transaction);
}