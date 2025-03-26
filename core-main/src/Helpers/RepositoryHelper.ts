import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { User } from "../Database/Entities/User";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import vaulticServer from "../Server/VaulticServer";
import { ClientChangeTrackingType, UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { UnsetupSharedClientUserVault } from "@vaultic/shared/Types/Entities";
import { Algorithm, SignedVaultKey } from "@vaultic/shared/Types/Keys";
import { LastLoadedLedgerVersionsAndVaultKeys } from "../Types/Responses";
import { server } from "@serenity-kit/opaque";

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
        await environment.repositories.logs.log(undefined, `Exception: ${JSON.vaulticStringify(e)}`, callStack);
    }

    await onFail?.();
    return TypedMethodResponse.fail();
}

export async function getLastLoadedLedgerVersionsAndKeys(masterKey: string, user: User): Promise<LastLoadedLedgerVersionsAndVaultKeys>
{
    let userData = {}
    userData["userChanges"] =
    {
        userID: user.userID,
        lastLoadedChangeVersion: user.lastLoadedChangeVersion,
    };

    const userVaults = await environment.repositories.userVaults.getVerifiedUserVaults(masterKey, undefined, user.userID);
    if (userVaults[0].length > 0)
    {
        userData["userVaultChanges"] = [];
        userData["vaultChanges"] = [];

        for (let i = 0; i < userVaults[0].length; i++)
        {
            const userVault = userVaults[0][i];

            userData["userVaultLedgers"].push({
                userOrganizationID: userVault.userOrganizationID,
                userVaultID: userVault.userVaultID,
                permissions: userVault.permissions,
                lastLoadedChangeVersion: userVault.lastLoadedChangeVersion
            });

            userData["vaultLedgers"].push({
                userOrganizationID: userVault.userOrganizationID,
                userVaultID: userVault.userVaultID,
                vaultID: userVault.vault.vaultID,
                lastLoadedChangeVersion: userVault.vault.lastLoadedChangeVersion
            });
        }
    }

    return { versions: userData, keys: userVaults[1] };
}

// Only call within a method wrapped in safetifyMethod
export async function backupData(masterKey: string, currentUser: User, dataToBackup?: UserDataPayload)
{
    const postData: { userDataPayload: UserDataPayload } = { userDataPayload: (dataToBackup ?? {}) };
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
        const s = await checkMergeMissingData(masterKey, currentUser, vaultsToBackup.value?.keys, postData.userDataPayload, backupResponse.userDataPayload);
        console.timeEnd("8");
        return s;
    }
    else
    {
        console.time("9");
        console.time("9a");
        const transaction = new Transaction();
        if (userToBackup.value)
        {
            console.log('UserToBackup');
            await environment.repositories.users.postBackupEntityUpdates(masterKey, userToBackup.value, transaction);
        }
        console.timeEnd("9a");

        console.time("9b");
        if (userVaultsToBackup.value && userVaultsToBackup.value.length > 0) 
        {
            console.log('UserVaultsToBackup');
            await environment.repositories.userVaults.postBackupEntitiesUpdates(masterKey, userVaultsToBackup.value, transaction);
        }
        console.timeEnd("9b");

        console.time("9c");
        if (vaultsToBackup.value?.vaults && vaultsToBackup.value?.vaults?.length > 0)
        {
            console.log('VaultsToBackup');
            await environment.repositories.vaults.postBackupEntitiesUpdates(masterKey, vaultsToBackup.value.vaults, transaction);
        }

        console.timeEnd("9c");
        // all data succesfully backed up, no need for change trackings anymore
        console.time("9d");
        await environment.repositories.changeTrackings.clearChangeTrackings(transaction);
        console.timeEnd("9d");

        console.time("9e");
        if (!await transaction.commit())
        {
            return false;
        }
        console.timeEnd("9e");
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
export async function checkMergeMissingData(
    masterKey: string,
    currentUser: User,
    vaultKeys: string[],
    clientUserDataPayload: UserDataPayload,
    serverUserDataPayload: UserDataPayload,
    transaction?: Transaction): Promise<boolean>
{
    if (!serverUserDataPayload)
    {
        return false;
    }

    transaction = transaction ?? new Transaction();
    const changeTrackings = await environment.repositories.changeTrackings.getChangeTrackingsByStoreType(masterKey, email);

    let needsToRePushData = false;
    const dataToBackup: UserDataPayload = {};
    if (serverUserDataPayload.user)
    {
        if (!clientUserDataPayload.user)
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
            const response = await environment.repositories.users.updateFromServer(masterKey, currentUser, serverUserDataPayload.user, serverUserDataPayload.userChanges,
                changeTrackings[ClientChangeTrackingType.User], clientUserDataPayload.userChanges, transaction);

            if (response.needsToRePushAppState || response.needsToRePushUserPreferences)
            {
                needsToRePushData = true;
            }

            if (response.clientUserChangesToPush)
            {
                needsToRePushData = true;
                dataToBackup.userChanges = response.clientUserChangesToPush;
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
        const serverVaultsToSetup: UnsetupSharedClientUserVault[] = [];
        const allSenderUserIDs: number[] = [];

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
                    const parsedVaultKey: SignedVaultKey = JSON.vaulticParse(serverUserVault.vaultKey);

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

        if (serverVaultsToSetup.length > 0)
        {
            const privateEncryptingKey = serverUserDataPayload.user.privateEncryptingKey ?? (await environment.repositories.users.findByEmail(masterKey, email))?.privateEncryptingKey;

            // This should never happen
            if (privateEncryptingKey == null)
            {
                await environment.repositories.logs.log(undefined, "Unable to find Users Private Encrypting Key");

                // return or else saving Vaults later will throw a Foreign Key Exception
                return;
            }
            else
            {
                const decryptedPrivateEncryptingKey = await environment.utilities.crypt.symmetricDecrypt(masterKey, privateEncryptingKey);
                if (decryptedPrivateEncryptingKey.success)
                {
                    await environment.repositories.userVaults.setupSharedUserVaults(masterKey, decryptedPrivateEncryptingKey.value, allSenderUserIDs, serverVaultsToSetup, transaction);
                }
            }
        }
    }

    if (serverUserDataPayload.removedUserVaults)
    {
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
    await environment.repositories.changeTrackings.clearChangeTrackings(transaction);

    if (!(await transaction.commit()))
    {
        return false;
    }

    if (needsToRePushData)
    {
        return await backupData(masterKey, dataToBackup);
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

export async function mergeData()
{

}