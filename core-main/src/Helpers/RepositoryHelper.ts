import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { User } from "../Database/Entities/User";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { EntityState } from "@vaultic/shared/Types/Entities";
import { ChangeTracking } from "../Database/Entities/ChangeTracking";
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
        console.log('no user');
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

    console.log('signature data');
    return { signatures: userData, keys: userVaults[1] };
}

// Only call within a method wrapped in safetifyMethod
export async function backupData(masterKey: string)
{
    const userToBackup = await environment.repositories.users.getEntityThatNeedsToBeBackedUp(masterKey);
    if (!userToBackup.success)
    {
        console.log('no user to backup');
        return false;
    }

    const userVaultsToBackup = await environment.repositories.userVaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!userVaultsToBackup.success)
    {
        console.log('no user vaults to backup');
        return false;
    }

    const vaultsToBackup = await environment.repositories.vaults.getEntitiesThatNeedToBeBackedUp(masterKey);
    if (!vaultsToBackup.success)
    {
        console.log('no vaults to backup');
        return false;
    }

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

    //console.log(`\nBacking up user: ${JSON.vaulticStringify(userToBackup.value)}`);
    //console.log(`\nBacking up userVaults: ${JSON.vaulticStringify(userVaultsToBackup.value)}`);
    //console.log(`\nBacking up vaults: ${JSON.vaulticStringify(vaultsToBackup.value.vaults)}`);

    const backupResponse = await vaulticServer.user.backupData(postData);
    if (!backupResponse.Success)
    {
        console.log(`backup failed: ${JSON.vaulticStringify(backupResponse)}`);
        //console.log('\nbackup failed');
        return await checkMergeMissingData(masterKey, "", vaultsToBackup.value?.keys, postData.userDataPayload, backupResponse.userDataPayload)
    }
    else
    {
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

        if (!await transaction.commit())
        {
            console.log('backup transaction failed');
            return false;
        }
    }

    console.log('Backup succeeded');
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

// for each data in clientUserDataPayload with an entityState of Deleted and that isn't in
// serverUserDataPayload, remove it
export async function checkMergeMissingData(masterKey: string, email: string, vaultKeys: string[], clientUserDataPayload: UserDataPayload, serverUserDataPayload: UserDataPayload, transaction?: Transaction): Promise<boolean>
{
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

                console.log('\nCreating User');
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
    //console.log(`\nMerging Vaults: ${JSON.stringify(serverUserDataPayload.vaults)}`);
    if (serverUserDataPayload.vaults)
    {
        for (let i = 0; i < serverUserDataPayload.vaults.length; i++)
        {
            //console.log(`\nChecking vault: ${i}`);
            const serverVault = serverUserDataPayload.vaults[i];
            const vaultIndex = clientUserDataPayload.vaults?.findIndex(v => v.vaultID == serverVault.vaultID) ?? -1;

            if (vaultIndex >= 0)
            {
                //console.log(`\nUpdating Vault: ${JSON.stringify(clientUserDataPayload.vaults![vaultIndex])}`);
                //console.log(`\nserver vault: ${JSON.vaulticStringify(serverVault)}`);
                if (await environment.repositories.vaults.updateFromServer(vaultKeys[vaultIndex], clientUserDataPayload.vaults![vaultIndex], serverVault, changeTrackings, transaction))
                {
                    needsToRePushData = true;
                }
            }
            else 
            {
                //console.log(`\nAdding Vault: ${JSON.stringify(serverVault)}`)
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
                    await environment.repositories.logs.log(undefined, `Failed to add userVault from server. UserVaultID: ${serverUserVault?.userVaultID}`);
                }
            }
        }
    }

    // TODO: is this how deleted vaults on another device should be handled? Waht about in updateFromServer?
    // Is this even necessary? I think what I intended with this is deleting vaults that were deleted on another device or
    // something similar to the change tracking where anything left in the array isn't on this device or something
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

    const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);

    // user will be undefined if we are adding it from the server. no change trackings to clear then obviously
    if (currentUser)
    {
        // we've handled all trackedChanges. Clear them
        transaction.deleteEntity<ChangeTracking>({ userID: currentUser.userID }, () => environment.repositories.changeTrackings);
    }

    console.log('\n committing new states')
    if (!(await transaction.commit()))
    {
        return false;
    }

    console.log('\nchecking to re pushd data');
    if (needsToRePushData)
    {
        console.log('\nNeeds to re backup data!');
        return await backupData(masterKey);
    }

    console.log('\nfinised merging');
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