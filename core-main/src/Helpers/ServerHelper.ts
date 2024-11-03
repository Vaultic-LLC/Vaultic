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
    return await safetifyMethod(this, internalLogUserIn);

    async function internalLogUserIn(): Promise<TypedMethodResponse<LogUserInResponse>>
    {
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

        let currentSignatures = {};
        if (!firstLogin && !reloadAllData)
        {
            currentSignatures = await getUserDataSignatures(masterKey, email);
        }

        let finishResponse = await stsServer.login.finish(firstLogin, startResponse.PendingUserToken!, finishLoginRequest, currentSignatures);
        if (finishResponse.Success)
        {
            await environment.cache.setSessionInfo(sessionKey, exportKey, finishResponse.Session?.Hash!);

            if (!firstLogin)
            {
                const result = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, finishResponse);
                if (!result.success)
                {
                    return TypedMethodResponse.failWithValue({ Success: false, message: result.errorMessage });
                }

                if (reloadAllData)
                {
                    await reloadAllUserData(masterKey, email, result.value.userDataPayload);
                }
                else 
                {
                    console.log(`Merging Data: ${JSON.stringify(result.value.userDataPayload)}`);
                    await checkMergeMissingData(masterKey, email, currentSignatures, result.value.userDataPayload);
                }

                await environment.repositories.users.setCurrentUser(masterKey, email);

                const payload = await decyrptUserDataPayloadVaults(masterKey, finishResponse.userDataPayload);
                if (!payload)
                {
                    return TypedMethodResponse.fail(undefined, undefined, "Failed to decrypt UserDataPayloadVaults");
                }
                else 
                {
                    finishResponse.userDataPayload = payload as UserDataPayload;
                }
            }
        }

        console.log('Login Success');
        return TypedMethodResponse.success(finishResponse);
    }
}

async function decyrptUserDataPayloadVaults(masterKey: string, payload?: UserDataPayload): Promise<boolean | UserDataPayload | undefined>
{
    const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
    if (!currentUser)
    {
        return false;
    }

    for (let i = 0; i < (payload?.archivedVaults?.length ?? 0); i++)
    {
        const vault = payload!.archivedVaults![i];
        const vaultKey = await vaultHelper.decryptVaultKey(masterKey, currentUser.privateKey, true, vault.vaultKey!);
        if (!vaultKey.success)
        {
            return false;
        }

        const decryptedName = await environment.utilities.crypt.decrypt(vaultKey.value!, vault.name!);
        if (!decryptedName.success)
        {
            return false;
        }

        payload!.archivedVaults![i].name = decryptedName.value;
    }

    return payload;
}

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn
};

export default serverHelper;