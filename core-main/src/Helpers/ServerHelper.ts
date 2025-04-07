import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import { environment } from "../Environment";
import { safetifyMethod } from "../Helpers/RepositoryHelper";
import { FinishRegistrationResponse, LogUserInResponse, StartRegistrationResponse } from "@vaultic/shared/Types/Responses";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { ServerHelper } from "@vaultic/shared/Types/Helpers";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";

async function registerUser(masterKey: string, pendingUserToken: string, firstName: string, lastName: string): Promise<StartRegistrationResponse | FinishRegistrationResponse>
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

    const startResponse = await stsServer.registration.start(registrationRequest, pendingUserToken);
    if (!startResponse.Success)
    {
        return startResponse;
    }

    const { registrationRecord } = opaque.client.finishRegistration({
        clientRegistrationState,
        registrationResponse: startResponse.ServerRegistrationResponse!,
        password: passwordHash.value,
    });

    return await stsServer.registration.finish(pendingUserToken, registrationRecord, firstName, lastName);
}

async function logUserIn(masterKey: string, email: string,
    firstLogin: boolean = false, reloadAllData: boolean = false, mfaCode?: string): Promise<TypedMethodResponse<LogUserInResponse | undefined>>
{
    if (environment.cache.isSyncing)
    {
        return TypedMethodResponse.failWithValue({ Success: false, isSyncing: true });
    }
    // clear the cache if we fail in case we failed after setting the current user
    return await safetifyMethod(this, internalLogUserIn, async () => environment.cache.clear());

    async function internalLogUserIn(): Promise<TypedMethodResponse<LogUserInResponse>>
    {
        if (!environment.cache.passwordHash || !environment.cache.clientLoginState || !environment.cache.startLoginRequest)
        {
            const passwordHash = await environment.utilities.hash.hash(Algorithm.SHA_256, masterKey);
            if (!passwordHash.success)
            {
                return TypedMethodResponse.fail(errorCodes.HASHING_FAILED);
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
            return TypedMethodResponse.fail(undefined, undefined, "OPAQUE Finish Login", undefined,
                undefined, { Success: false, RestartOpaqueProtocol: true });
        }

        const { finishLoginRequest, sessionKey, exportKey } = loginResult;

        let masterKeyVaulticKey: string | undefined;
        if (!firstLogin && !reloadAllData)
        {
            const currentUser = await environment.repositories.users.findByEmail(masterKey, email, false);
            if (currentUser)
            {
                const vaulticKey: VaulticKey =
                {
                    algorithm: currentUser.masterKeyEncryptionAlgorithm,
                    key: masterKey
                };

                masterKeyVaulticKey = JSON.stringify(vaulticKey);
            }
        }

        let finishResponse = await stsServer.login.finish(firstLogin, startResponse.PendingUserToken!, finishLoginRequest);
        if (finishResponse.Success)
        {
            await environment.cache.setSessionInfo(sessionKey, exportKey, finishResponse.Session?.Hash!);

            if (!firstLogin && !reloadAllData)
            {
                await environment.repositories.users.setCurrentUser(masterKeyVaulticKey, email);
            }
        }

        environment.cache.clearLoginData();
        finishResponse.masterKey = masterKeyVaulticKey;
        return TypedMethodResponse.success(finishResponse);
    }
}

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn,
};

export default serverHelper;