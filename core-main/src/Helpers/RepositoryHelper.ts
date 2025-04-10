import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { User } from "../Database/Entities/User";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { UnsetupSharedClientUserVault } from "@vaultic/shared/Types/Entities";
import { Algorithm, SignedVaultKey } from "@vaultic/shared/Types/Keys";
import { CurrentUserDataIdentifiersAndKeys } from "../Types/Responses";
import { ChangeTracking } from "../Database/Entities/ChangeTracking";

export async function safetifyMethod<T>(calle: any, method: () => Promise<TypedMethodResponse<T>>, onFail?: () => Promise<any>, onSucceed?: () => Promise<any>): Promise<TypedMethodResponse<T | undefined>>
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
        else
        {
            await onSucceed?.();
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
        await environment.repositories.logs.log(undefined, `Exception: ${JSON.stringify(e)}`, callStack);
    }

    await onFail?.();
    return TypedMethodResponse.fail();
}

export async function getCurrentUserDataIdentifiersAndKeys(masterKey: string, user: User): Promise<CurrentUserDataIdentifiersAndKeys>
{
    let userData = {}
    userData["user"] =
    {
        userID: user.userID,
        currentSignature: user.currentSignature,
    };

    userData["userChanges"] =
    {
        userID: user.userID,
        lastLoadedChangeVersion: user.lastLoadedChangeVersion,
    };

    const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, undefined, user.userID);
    if (userVaults[0].length > 0)
    {
        userData["userVaults"] = [];
        userData["vaults"] = [];

        userData["userVaultChanges"] = [];
        userData["vaultChanges"] = [];

        for (let i = 0; i < userVaults[0].length; i++)
        {
            const userVault = userVaults[0][i];

            userData["userVaults"].push({
                userOrganizationID: userVault.userOrganizationID,
                userVaultID: userVault.userVaultID,
                currentSignature: userVault.currentSignature,
                entityState: userVault.entityState,
                permissions: userVault.permissions,
            });

            userData["vaults"].push({
                userOrganizationID: userVault.userOrganizationID,
                userVaultID: userVault.userVaultID,
                vaultID: userVault.vault.vaultID,
                currentSignature: userVault.vault.currentSignature,
                entityState: userVault.vault.entityState,
            });

            userData["userVaultChanges"].push({
                userOrganizationID: userVault.userOrganizationID,
                userVaultID: userVault.userVaultID,
                lastLoadedChangeVersion: userVault.lastLoadedChangeVersion
            });

            userData["vaultChanges"].push({
                userOrganizationID: userVault.userOrganizationID,
                userVaultID: userVault.userVaultID,
                vaultID: userVault.vault.vaultID,
                lastLoadedChangeVersion: userVault.vault.lastLoadedChangeVersion
            });
        }
    }

    return { identifiers: userData, keys: userVaults[1] };
}

export async function backupData(masterKey: string, dataToBackup?: UserDataPayload, reloadingAllData?: boolean)
{
    const postData: { userDataPayload: UserDataPayload } = { userDataPayload: (dataToBackup ?? {}) };
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
    if (!backupResponse.Success)
    {
        return await checkMergeMissingData(masterKey, "", vaultsToBackup.value?.keys, postData.userDataPayload, backupResponse.userDataPayload, undefined, dataToBackup, reloadingAllData);
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
            return false;
        }
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
export async function checkMergeMissingData(
    masterKey: string,
    email: string,
    vaultKeys: string[],
    currentLocalData: UserDataPayload,
    serverUserDataPayload: UserDataPayload,
    transaction?: Transaction,
    backingUpData?: UserDataPayload,
    reloadingAllData?: boolean): Promise<boolean>
{
    transaction = transaction ?? new Transaction();

    let user: User | null = null;
    if (!reloadingAllData)
    {
        user = await environment.repositories.users.findByEmail(masterKey, email);
    }

    let userChangeTrackings = [];
    if (user)
    {
        userChangeTrackings = await environment.repositories.changeTrackings.getChangeTrackingsForUser(masterKey, user.userID);
    }

    let needsToRePushData = false;
    const dataToBackup: UserDataPayload = backingUpData ?? {};

    if (serverUserDataPayload?.user || userChangeTrackings.length > 0)
    {
        if (!currentLocalData.user)
        {
            // The user was never successfully created
            if (!User.isValid(serverUserDataPayload.user))
            {
                return (await environment.repositories.users.createUser(masterKey, email, serverUserDataPayload.user.firstName!, serverUserDataPayload.user.lastName!, transaction)).success;
            }

            if (!(await environment.repositories.users.addFromServer(masterKey, serverUserDataPayload.user, transaction)))
            {
                return false;
            }
        }
        else
        {
            const response = await environment.repositories.users.updateFromServer(masterKey, user, serverUserDataPayload?.user ?? {}, serverUserDataPayload?.userChanges,
                userChangeTrackings, dataToBackup.userChanges, transaction);

            if (response?.needsToRePushData)
            {
                needsToRePushData = true;
            }

            if (response?.changes?.allChanges?.length > 0)
            {
                needsToRePushData = true;
                dataToBackup.userChanges = response.changes;
            }
        }
    }

    // Needs to be done before userVaults for when adding a new vault + userVault. Vault has to be saved before userVault.
    if (serverUserDataPayload?.vaults)
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
                const vaultIndex = currentLocalData.vaults?.findIndex(v => v.vaultID == serverVault.vaultID) ?? -1;
                if (vaultIndex >= 0)
                {
                    await environment.repositories.vaults.updateVaultFromServer(serverVault, transaction);
                }
            }
        }
    }

    // do these seperately from userVaults since they don't match 1-1, i.e. you can have the entire store from one userVault but only some changes for another
    if (serverUserDataPayload?.vaultChanges && serverUserDataPayload.vaultChanges.length > 0)
    {
        for (let i = 0; i < serverUserDataPayload.vaultChanges.length; i++)
        {
            const serverVaultChanges = serverUserDataPayload.vaultChanges[i];
            const vaultIndex = currentLocalData.vaultChanges?.findIndex(v => v.vaultID == serverVaultChanges.vaultID) ?? -1;
            if (vaultIndex >= 0)
            {
                const serverVaultIndex = serverUserDataPayload?.vaults?.findIndex(v => v.vaultID == serverVaultChanges.vaultID) ?? -1;
                let serverVault = serverVaultIndex >= 0 ? serverUserDataPayload?.vaults?.[serverVaultIndex] : undefined;

                let changeTrackings: ChangeTracking[] = [];
                if (user)
                {
                    changeTrackings = await environment.repositories.changeTrackings.getChangeTrackingsForVault(vaultKeys[vaultIndex], user.userID,
                        currentLocalData.vaultChanges![vaultIndex].userVaultID, currentLocalData.vaultChanges![vaultIndex].vaultID);
                }

                let currentVaultToBackupIndex = dataToBackup.vaultChanges?.findIndex(v => v.vaultID == currentLocalData.vaultChanges![vaultIndex].vaultID) ?? -1;
                let currentVaultToBackup = undefined;

                if (currentVaultToBackupIndex >= 0)
                {
                    currentVaultToBackup = dataToBackup.vaultChanges[currentVaultToBackupIndex];
                }

                const response = await environment.repositories.vaults.updateVaultChanges(vaultKeys[vaultIndex], currentLocalData.vaultChanges![vaultIndex], serverVault,
                    serverVaultChanges, changeTrackings, currentVaultToBackup, transaction);

                if (response.needsToRePushData)
                {
                    needsToRePushData = true;
                }

                if (response?.changes?.allChanges?.length > 0)
                {
                    if (currentVaultToBackupIndex >= 0)
                    {
                        dataToBackup.vaultChanges[currentVaultToBackupIndex] = response.changes;
                    }
                    else
                    {
                        if (!dataToBackup.vaultChanges)
                        {
                            dataToBackup.vaultChanges = [];
                        }

                        dataToBackup.vaultChanges.push(response.changes);
                    }
                }
            }
        }
    }
    else
    {
        const vaultIDs = currentLocalData.vaults?.map(v => v.vaultID) ?? [];
        for (let i = 0; i < vaultIDs.length; i++)
        {
            const currentVaultIndex = currentLocalData.vaultChanges?.findIndex(v => v.vaultID == vaultIDs[i]) ?? -1;
            if (currentVaultIndex >= 0)
            {
                const currentVaultChanges = currentLocalData.vaultChanges![currentVaultIndex];
                const serverVaultIndex = serverUserDataPayload?.vaults?.findIndex(v => v.vaultID == vaultIDs[i]) ?? -1;
                let serverVault = serverVaultIndex >= 0 ? serverUserDataPayload?.vaults?.[serverVaultIndex] : undefined;

                let changeTrackings: ChangeTracking[] = [];
                if (user)
                {
                    changeTrackings = await environment.repositories.changeTrackings.getChangeTrackingsForVault(vaultKeys[currentVaultIndex], user.userID,
                        currentVaultChanges.userVaultID, currentVaultChanges.vaultID);
                }

                let currentVaultToBackupIndex = dataToBackup.vaultChanges?.findIndex(v => v.vaultID == currentLocalData.vaultChanges![currentVaultIndex].vaultID) ?? -1;
                let currentVaultToBackup = undefined;

                if (currentVaultToBackupIndex >= 0)
                {
                    currentVaultToBackup = dataToBackup.vaultChanges[currentVaultToBackupIndex];
                }

                const response = await environment.repositories.vaults.updateVaultChanges(vaultKeys[currentVaultIndex], currentVaultChanges, serverVault,
                    undefined, changeTrackings, currentVaultToBackup, transaction);

                if (response.needsToRePushData)
                {
                    needsToRePushData = true;
                }

                if (response?.changes?.allChanges?.length > 0)
                {
                    if (currentVaultToBackupIndex >= 0)
                    {
                        dataToBackup.vaultChanges[currentVaultToBackupIndex] = response.changes;
                    }
                    else
                    {
                        if (!dataToBackup.vaultChanges)
                        {
                            dataToBackup.vaultChanges = [];
                        }

                        dataToBackup.vaultChanges.push(response.changes);
                    }
                }
            }
        }
    }

    if (serverUserDataPayload?.userVaults)
    {
        for (let i = 0; i < serverUserDataPayload.userVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.userVaults[i];
            const userVaultIndex = currentLocalData.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;
            if (userVaultIndex >= 0)
            {
                await environment.repositories.userVaults.updateUserVaultFromServer(serverUserVault, transaction);
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

    let userVaultChanges: { [key: number]: ChangeTracking[] } | undefined = undefined;
    if (user)
    {
        const userVaults = currentLocalData.userVaults?.map(uv => uv.userVaultID) ?? [];
        if (userVaults.length > 0)
        {
            userVaultChanges = await environment.repositories.changeTrackings.getChangeTrackingsForUserVault(masterKey, user.userID, userVaults);
        }
    }

    // do these seperately from userVaults since they don't match 1-1, i.e. you can have the entire store from one userVault but only some changes for another
    if (serverUserDataPayload?.userVaultChanges && serverUserDataPayload.userVaultChanges.length > 0)
    {
        for (let i = 0; i < serverUserDataPayload.userVaultChanges.length; i++)
        {
            const serverUserVaultChanges = serverUserDataPayload.userVaultChanges[i];
            const userVaultChangesIndex = currentLocalData.userVaultChanges?.findIndex(uv => uv.userVaultID == serverUserVaultChanges.userVaultID) ?? -1;

            if (userVaultChangesIndex >= 0)
            {
                const serverUserVaultIndex = serverUserDataPayload?.userVaults?.findIndex(uv => uv.userVaultID == serverUserVaultChanges.userVaultID) ?? -1;
                let serverUserVault = serverUserVaultIndex >= 0 ? serverUserDataPayload?.userVaults[serverUserVaultIndex] : undefined;

                let currentUserVaultToBackupIndex = dataToBackup.userVaultChanges?.findIndex(uv => uv.userVaultID == currentLocalData.userVaultChanges![userVaultChangesIndex].userVaultID) ?? -1;
                let currentUserVaultToBackup = undefined;

                if (currentUserVaultToBackupIndex >= 0)
                {
                    currentUserVaultToBackup = dataToBackup.vaultChanges[currentUserVaultToBackupIndex];
                }

                const response = await environment.repositories.userVaults.updateUserVaultChanges(masterKey, currentLocalData.userVaultChanges![userVaultChangesIndex], serverUserVault, serverUserVaultChanges,
                    userVaultChanges[serverUserVaultChanges.userVaultID], currentUserVaultToBackup, transaction);

                if (response.needsToRePushData)
                {
                    needsToRePushData = true;
                }

                if (response?.changes?.allChanges?.length > 0)
                {
                    if (currentUserVaultToBackupIndex >= 0)
                    {
                        dataToBackup.userVaultChanges[currentUserVaultToBackupIndex] = response.changes;
                    }
                    else
                    {
                        if (!dataToBackup.userVaultChanges)
                        {
                            dataToBackup.userVaultChanges = [];
                        }

                        dataToBackup.userVaultChanges.push(response.changes);
                    }
                }
            }
        }
    }
    else if (userVaultChanges)
    {
        const userVaultIDs = Object.keys(userVaultChanges);
        for (let i = 0; i < userVaultIDs.length; i++)
        {
            const currentUserVaultIndex = currentLocalData.userVaultChanges?.findIndex(v => v.userVaultID.toString() == userVaultIDs[i]) ?? -1;
            if (currentUserVaultIndex >= 0)
            {
                const serverUserVaultIndex = serverUserDataPayload?.userVaults?.findIndex(uv => uv.userVaultID.toString() == userVaultIDs[i]) ?? -1;
                let serverUserVault = serverUserVaultIndex >= 0 ? serverUserDataPayload?.userVaults[serverUserVaultIndex] : undefined;

                let currentUserVaultToBackupIndex = dataToBackup.userVaultChanges?.findIndex(uv => uv.userVaultID == currentLocalData.userVaultChanges![currentUserVaultIndex].userVaultID) ?? -1;
                let currentUserVaultToBackup = undefined;

                if (currentUserVaultToBackupIndex >= 0)
                {
                    currentUserVaultToBackup = dataToBackup.vaultChanges[currentUserVaultToBackupIndex];
                }

                const response = await environment.repositories.userVaults.updateUserVaultChanges(masterKey, currentLocalData.userVaultChanges![currentUserVaultIndex], serverUserVault,
                    undefined, userVaultChanges[userVaultIDs[i]], currentUserVaultToBackup, transaction);

                if (response.needsToRePushData)
                {
                    needsToRePushData = true;
                }

                if (response?.changes?.allChanges?.length > 0)
                {
                    if (currentUserVaultToBackupIndex >= 0)
                    {
                        dataToBackup.userVaultChanges[currentUserVaultToBackupIndex] = response.changes;
                    }
                    else
                    {
                        if (!dataToBackup.userVaultChanges)
                        {
                            dataToBackup.userVaultChanges = [];
                        }

                        dataToBackup.userVaultChanges.push(response.changes);
                    }
                }
            }
        }
    }

    if (serverUserDataPayload?.sharedUserVaults)
    {
        const serverVaultsToSetup: UnsetupSharedClientUserVault[] = [];
        const allSenderUserIDs: number[] = [];

        for (let i = 0; i < serverUserDataPayload.sharedUserVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.sharedUserVaults[i];
            if (serverUserVault.isSetup === false)
            {
                // If we failed to backup after setting up the shared userVault before, well have the userVault locally but the server
                // will still think it needs to be setup
                const userVault = currentLocalData.userVaults?.filter(uv => uv.userVaultID == serverUserVault.userVaultID);
                if (!userVault || userVault.length == 0)
                {
                    const parsedVaultKey: SignedVaultKey = JSON.parse(serverUserVault.vaultKey);

                    // something went wrong
                    if (parsedVaultKey.algorithm != Algorithm.Vaultic_Key_Share)
                    {
                        await environment.repositories.logs.log(undefined, "Unseutp UserVault algorithm isn't correct");
                        continue;
                    }

                    allSenderUserIDs.push(parsedVaultKey.message.senderUserID);

                    const unsetupSUV: UnsetupSharedClientUserVault =
                    {
                        userVault: serverUserVault,
                        vaultKey: parsedVaultKey
                    };

                    serverVaultsToSetup.push(unsetupSUV);
                }

                needsToRePushData = true;
            }
            else
            {
                // These will be passed to the server within userVaults, not sharedUserVaults. sharedUserVaults is only for passed data back from the server
                const userVaultIndex = currentLocalData.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;
                if (userVaultIndex >= 0)
                {
                    environment.repositories.userVaults.updateUserVaultFromServer(serverUserVault, transaction);
                }
            }
        }

        if (serverVaultsToSetup.length > 0)
        {
            const privateEncryptingKey = serverUserDataPayload?.user?.privateEncryptingKey ?? (await environment.repositories.users.findByEmail(masterKey, email))?.privateEncryptingKey;

            // This should never happen
            if (privateEncryptingKey == null)
            {
                await environment.repositories.logs.log(undefined, "Unable to find Users Private Encrypting Key");

                // return or else saving Vaults later will throw a Foreign Key Exception
                return;
            }
            else
            {
                try
                {
                    const decryptedPrivateEncryptingKey = await environment.utilities.crypt.symmetricDecrypt(masterKey, privateEncryptingKey);
                    if (decryptedPrivateEncryptingKey.success)
                    {
                        await environment.repositories.userVaults.setupSharedUserVaults(masterKey, decryptedPrivateEncryptingKey.value, allSenderUserIDs, serverVaultsToSetup, transaction);
                    }
                }
                catch { }
            }
        }
    }

    if (serverUserDataPayload?.removedUserVaults)
    {
        for (let i = 0; i < serverUserDataPayload.removedUserVaults.length; i++)
        {
            const serverUserVault = serverUserDataPayload.removedUserVaults[i];
            const userVaultIndex = currentLocalData.userVaults?.findIndex(uv => uv.userVaultID == serverUserVault.userVaultID) ?? -1;

            if (userVaultIndex >= 0)
            {
                transaction.deleteEntity(serverUserVault.userVaultID, () => environment.repositories.userVaults);
            }
        }
    }

    if (serverUserDataPayload?.removedVaults)
    {
        for (let i = 0; i < serverUserDataPayload.removedVaults.length; i++)
        {
            const serverVault = serverUserDataPayload.removedVaults[i];
            const vaultIndex = currentLocalData.vaults?.findIndex(v => v.vaultID == serverVault.vaultID) ?? -1;

            if (vaultIndex >= 0)
            {
                transaction.deleteEntity(serverVault.vaultID, () => environment.repositories.vaults);
            }
        }
    }

    // we've handled all trackedChanges. Clear them
    environment.repositories.changeTrackings.clearChangeTrackings(transaction);
    if (!(await transaction.commit()))
    {
        return false;
    }

    if (needsToRePushData)
    {
        return await backupData(masterKey, dataToBackup, reloadingAllData);
    }

    return true;
}

export async function handleUserLogOut()
{
    if (environment.cache.isSyncing)
    {
        const interval = setInterval(() =>
        {
            if (environment.cache.isSyncing)
            {
                return;
            }

            environment.cache.clear();
            clearInterval(interval);
        }, 500);
    }
    else
    {
        if (environment.cache.currentUser)
        {
            await environment.repositories.vaults.syncVaults(environment.cache.currentUser.email!);
            environment.cache.clear();
        }
    }
}