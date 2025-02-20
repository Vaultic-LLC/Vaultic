import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import axiosHelper from "../Server/AxiosHelper";
import { environment } from "../Environment";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { checkMergeMissingData, getUserDataSignatures, reloadAllUserData, safetifyMethod } from "../Helpers/RepositoryHelper";
import { FinishRegistrationResponse, LogUserInResponse } from "@vaultic/shared/Types/Responses";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { ServerHelper } from "@vaultic/shared/Types/Helpers";
import { CurrentSignaturesVaultKeys } from "../Types/Responses";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { EntityRepository } from "typeorm";

async function registerUser(masterKey: string, email: string, firstName: string, lastName: string): Promise<FinishRegistrationResponse>
{
    // TODO: switch to argon2 hash
    const passwordHash = await environment.utilities.hash.hash(Algorithm.SHA_256, masterKey);
    if (!passwordHash.success)
    {
        return { Success: false };
    }

    const { clientRegistrationState, registrationRequest } =
        opaque.client.startRegistration({
            password: passwordHash.value
        });

    const startResponse = await stsServer.registration.start(registrationRequest, email);
    if (!startResponse.Success)
    {
        return startResponse;
    }

    const { registrationRecord } = opaque.client.finishRegistration({
        clientRegistrationState,
        registrationResponse: startResponse.ServerRegistrationResponse!,
        password: passwordHash.value,
    });

    return await stsServer.registration.finish(startResponse.PendingUserToken!, registrationRecord, firstName, lastName);
}

async function logUserIn(masterKey: string, email: string,
    firstLogin: boolean = false, reloadAllData: boolean = false, mfaCode?: string): Promise<TypedMethodResponse<LogUserInResponse | undefined>>
{
    // clear the cache if we fail in case we failed after setting the current user
    return await safetifyMethod(this, internalLogUserIn, async () => environment.cache.clear());

    async function internalLogUserIn(): Promise<TypedMethodResponse<LogUserInResponse>>
    {
        if (!environment.cache.passwordHash || !environment.cache.clientLoginState || !environment.cache.startLoginRequest)
        {
            const passwordHash = await environment.utilities.hash.hash(Algorithm.SHA_256, masterKey);
            if (!passwordHash.success)
            {
                return TypedMethodResponse.fail();
            }

            const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
                password: passwordHash.value,
            });

            environment.cache.setLoginData(startLoginRequest, passwordHash.value, clientLoginState);
        }

        const startResponse = await stsServer.login.start(environment.cache.startLoginRequest, email, mfaCode);
        if (!startResponse.Success)
        {
            if (startResponse.FailedMFA)
            {
                return TypedMethodResponse.success(startResponse);
            }

            return TypedMethodResponse.failWithValue(startResponse);
        }

        const loginResult = opaque.client.finishLogin({
            clientLoginState: environment.cache.clientLoginState,
            loginResponse: startResponse.StartServerLoginResponse,
            password: environment.cache.passwordHash,
        });

        if (!loginResult)
        {
            return TypedMethodResponse.failWithValue({ Success: false, RestartOpaqueProtocol: true });
        }

        const { finishLoginRequest, sessionKey, exportKey } = loginResult;

        const currentUser = await environment.repositories.users.findByEmail(masterKey, email, false);
        let currentSignatures: CurrentSignaturesVaultKeys = { signatures: {}, keys: [] }
        let masterKeyVaulticKey: string | undefined;

        if (!firstLogin && !reloadAllData && currentUser)
        {
            const vaulticKey: VaulticKey =
            {
                algorithm: currentUser.masterKeyEncryptionAlgorithm,
                key: masterKey
            };

            masterKeyVaulticKey = JSON.vaulticStringify(vaulticKey);
            currentSignatures = await getUserDataSignatures(masterKeyVaulticKey, currentUser);
        }

        let finishResponse = await stsServer.login.finish(firstLogin, startResponse.PendingUserToken!, finishLoginRequest, currentSignatures?.signatures ?? {});
        if (finishResponse.Success)
        {
            await environment.cache.setSessionInfo(sessionKey, exportKey, finishResponse.Session?.Hash!);

            if (!firstLogin)
            {
                // Don't have to worry about shared vaults not being e2e encrypted when they are first shared since only display
                // vaults of them run through here
                console.log(`Finish Resopnse: ${JSON.stringify(finishResponse)}\n`);
                try
                {
                    const result = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, finishResponse);
                    if (!result.success)
                    {
                        return TypedMethodResponse.failWithValue({ Success: false, message: result.errorMessage });
                    }

                    if (!masterKeyVaulticKey)
                    {
                        const masterKeyEncryptedAlgorithm =
                            (result.value.userDataPayload as UserDataPayload).user?.masterKeyEncryptionAlgorithm ??
                            Algorithm.XCHACHA20_POLY1305;

                        const vaulticKey: VaulticKey =
                        {
                            algorithm: masterKeyEncryptedAlgorithm,
                            key: masterKey
                        };

                        masterKeyVaulticKey = JSON.vaulticStringify(vaulticKey);
                    }

                    console.log(masterKeyVaulticKey);
                    console.log(result.value.userDataPayload);
                    if (reloadAllData)
                    {
                        await reloadAllUserData(masterKeyVaulticKey, email, result.value.userDataPayload);
                    }
                    else
                    {
                        await checkMergeMissingData(masterKeyVaulticKey, email, currentSignatures?.keys ?? [], currentSignatures?.signatures ?? {}, result.value.userDataPayload);
                    }

                    // This has to go after merging in the event that the user isn't in the local data yet
                    await environment.repositories.users.setCurrentUser(masterKeyVaulticKey, email);
                }
                catch (e)
                {
                    console.log(e);
                }

                // const payload = await decyrptUserDataPayloadVaults(masterKey, finishResponse.userDataPayload);
                // if (!payload)
                // {
                //     return TypedMethodResponse.fail(undefined, undefined, "Failed to decrypt UserDataPayloadVaults");
                // }
                // else
                // {
                //     finishResponse.userDataPayload = payload as UserDataPayload;
                // }
            }
        }

        environment.cache.clearLoginData();
        finishResponse.masterKey = masterKeyVaulticKey ?? JSON.vaulticStringify({ algorithm: Algorithm.XCHACHA20_POLY1305, key: masterKey });
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
//         Not correct anymore
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
    logUserIn,
};

export default serverHelper;