import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import axiosHelper from "../Server/AxiosHelper";
import { environment } from "../Environment";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { checkMergeMissingData, getUserDataSignatures, reloadAllUserData, safetifyMethod } from "../Helpers/RepositoryHelper";
import vaultHelper from "./VaultHelper";
import { FinishRegistrationResponse, LogUserInResponse } from "@vaultic/shared/Types/Responses";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { ServerHelper } from "@vaultic/shared/Types/Helpers";
import { CurrentSignaturesVaultKeys } from "../Types/Responses";

async function registerUser(masterKey: string, email: string, firstName: string, lastName: string): Promise<FinishRegistrationResponse>
{
    // TODO: switch to argon2 hash
    const passwordHash = environment.utilities.hash.insecureHash(masterKey);
    const { clientRegistrationState, registrationRequest } =
        opaque.client.startRegistration({
            password: passwordHash
        });

    const startResponse = await stsServer.registration.start(registrationRequest, email);
    if (!startResponse.Success)
    {
        return startResponse;
    }

    const { registrationRecord, exportKey } = opaque.client.finishRegistration({
        clientRegistrationState,
        registrationResponse: startResponse.ServerRegistrationResponse!,
        password: passwordHash,
    });

    const keys = await environment.utilities.generator.ECKeys();

    // wrap private key in masterKey encryption and exportKey encryption for future use
    const masterKeyEncryptedPrivateKey = await environment.utilities.crypt.encrypt(masterKey, keys.private);
    if (!masterKeyEncryptedPrivateKey.success)
    {
        await environment.repositories.logs.log(errorCodes.ENCRYPTION_FAILED, "Private Key Master Key Encryption");
        return { Success: false }
    }

    const exportKeyEncryptedPrivateKey = await environment.utilities.crypt.encrypt(exportKey, masterKeyEncryptedPrivateKey.value!);
    if (!exportKeyEncryptedPrivateKey.success)
    {
        await environment.repositories.logs.log(errorCodes.ENCRYPTION_FAILED, "Private Key Export Key Encryption");
        return { Success: false }
    }

    const response = await stsServer.registration.finish(startResponse.PendingUserToken!,
        registrationRecord, firstName, lastName, keys.public, exportKeyEncryptedPrivateKey.value!);

    if (response.Success)
    {
        response.PublicKey = keys.public;

        // only return the masterKey encrypted private key since we're already local
        response.PrivateKey = masterKeyEncryptedPrivateKey.value!;
    }

    return response;
}

async function logUserIn(masterKey: string, email: string,
    firstLogin: boolean = false, reloadAllData: boolean = false): Promise<TypedMethodResponse<LogUserInResponse | undefined>>
{
    // clear the cache if we fail in case we failed after setting the current user
    return await safetifyMethod(this, internalLogUserIn, async () => environment.cache.clear());

    async function internalLogUserIn(): Promise<TypedMethodResponse<LogUserInResponse>>
    {
        console.time("1");
        const passwordHash = environment.utilities.hash.insecureHash(masterKey);
        const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
            password: passwordHash,
        });

        const startResponse = await stsServer.login.start(startLoginRequest, email);
        if (!startResponse.Success)
        {
            return TypedMethodResponse.failWithValue(startResponse);
        }

        const loginResult = opaque.client.finishLogin({
            clientLoginState,
            loginResponse: startResponse.StartServerLoginResponse!,
            password: passwordHash,
        });

        if (!loginResult)
        {
            return TypedMethodResponse.failWithValue({ Success: false, RestartOpaqueProtocol: true });
        }

        const { finishLoginRequest, sessionKey, exportKey } = loginResult;
        console.timeEnd("1");

        let currentSignatures: CurrentSignaturesVaultKeys;
        if (!firstLogin && !reloadAllData)
        {
            currentSignatures = await getUserDataSignatures(masterKey, email);
        }

        console.time("2");
        let finishResponse = await stsServer.login.finish(firstLogin, startResponse.PendingUserToken!, finishLoginRequest, currentSignatures?.signatures ?? {});
        if (finishResponse.Success)
        {
            await environment.cache.setSessionInfo(sessionKey, exportKey, finishResponse.Session?.Hash!);

            if (!firstLogin)
            {
                console.timeEnd("2");
                console.time("3");

                // Don't have to worry about shared vaults not being e2e encrypted when they are first shared since only display
                // vaults of them run through here
                const result = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, finishResponse);
                if (!result.success)
                {
                    return TypedMethodResponse.failWithValue({ Success: false, message: result.errorMessage });
                }

                console.timeEnd("3");
                console.time("4");

                if (reloadAllData)
                {
                    await reloadAllUserData(masterKey, email, result.value.userDataPayload);
                }
                else 
                {
                    await checkMergeMissingData(masterKey, email, currentSignatures?.keys ?? [], currentSignatures?.signatures ?? {}, result.value.userDataPayload);
                }

                console.timeEnd("4");
                console.time("5");

                // This has to go after merging in the event that the user isn't in the local data yet
                await environment.repositories.users.setCurrentUser(masterKey, email);

                // const payload = await decyrptUserDataPayloadVaults(masterKey, finishResponse.userDataPayload);
                // if (!payload)
                // {
                //     return TypedMethodResponse.fail(undefined, undefined, "Failed to decrypt UserDataPayloadVaults");
                // }
                // else
                // {
                //     finishResponse.userDataPayload = payload as UserDataPayload;
                // }

                console.timeEnd("5");
            }
        }

        return TypedMethodResponse.success(finishResponse);
    }
}

// TODO: this shouldn't be needed until I return displayVaults from the server again
// async function decyrptUserDataPayloadVaults(masterKey: string, payload?: UserDataPayload): Promise<boolean | UserDataPayload | undefined>
// {
//     const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
//     if (!currentUser)
//     {
//         return false;
//     }

//     for (let i = 0; i < (payload?.archivedVaults?.length ?? 0); i++)
//     {
//         await decryptAndSetName(payload!.archivedVaults[i]);
//     }

//     for (let i = 0; i < (payload?.sharedVaults?.length ?? 0); i++)
//     {
//         await decryptAndSetName(payload!.sharedVaults[i]);
//     }

//     return payload;

//     async function decryptAndSetName(vault: ServerDisplayVault)
//     {
//         const vaultKey = await vaultHelper.decryptVaultKey(masterKey, currentUser.privateKey, true, vault.vaultKey!, vault.isSetup);
//         if (!vaultKey.success)
//         {
//             return false;
//         }

//         const decryptedName = await environment.utilities.crypt.decrypt(vaultKey.value!, vault.name!);
//         if (!decryptedName.success)
//         {
//             return false;
//         }

//         vault.name = decryptedName.value;
//     }
// }

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn
};

export default serverHelper;