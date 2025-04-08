import * as opaque from "@serenity-kit/opaque";
import vaulticServer, { stsServer } from "../Server/VaulticServer";
import { environment } from "../Environment";
import { safetifyMethod } from "../Helpers/RepositoryHelper";
import { FinishRegistrationResponse, LogUserInResponse, StartRegistrationResponse } from "@vaultic/shared/Types/Responses";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { ServerHelper } from "@vaultic/shared/Types/Helpers";
import { Algorithm, defaultKSFParams, KSFParams, VaulticKey } from "@vaultic/shared/Types/Keys";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import Transaction from "../Database/Transaction";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { User } from "../Database/Entities/User";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { IUserVault } from "@vaultic/shared/Types/Entities";
import axiosHelper from "../Server/AxiosHelper";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";

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
        keyStretching: {
            "argon2id-custom": defaultKSFParams()
        }
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

        let params: KSFParams = defaultKSFParams();
        if (!firstLogin)
        {
            if (!startResponse.KSFParams)
            {
                return TypedMethodResponse.fail(undefined, undefined, "no ksf params");
            }

            try
            {
                params = JSON.parse(startResponse.KSFParams);
            }
            catch (e)
            {
                return TypedMethodResponse.fail(undefined, undefined, "unable to parse ksf params");
            }
        }

        const loginResult = opaque.client.finishLogin({
            clientLoginState: environment.cache.clientLoginState,
            loginResponse: startResponse.StartServerLoginResponse,
            password: environment.cache.passwordHash,
            keyStretching:
            {
                'argon2id-custom':
                {
                    iterations: params.iterations,
                    memory: params.memory,
                    parallelism: params.parallelism
                }
            }
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

async function updateKSFParams(newParams: string): Promise<TypedMethodResponse<any>>
{
    const currentExportKey = environment.cache.exportKey;
    return await safetifyMethod(this, internalUpdateKSFParsm, onFail);

    // In case we fail after updating the export key
    async function onFail()
    {
        const vaulticExportKey: VaulticKey = JSON.parse(currentExportKey);
        environment.cache.updateExportKey(vaulticExportKey.key);
    }

    async function internalUpdateKSFParsm()
    {
        const currentUser = await environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return TypedMethodResponse.fail(undefined, undefined, "No current user");
        }

        let masterKey: string | undefined = "";
        let parsedNewParams: KSFParams | undefined;

        try
        {
            parsedNewParams = JSON.parse(newParams);
        }
        catch (e)
        {
            return TypedMethodResponse.fail(undefined, undefined, "Unable to parse params");
        }

        try
        {
            const vaulticKey: VaulticKey = JSON.parse(environment.cache.masterKey);
            masterKey = vaulticKey.key;
        }
        catch (e)
        {
            return TypedMethodResponse.fail(undefined, undefined, "Unable to parse master key");
        }

        const passwordHash = await environment.utilities.hash.hash(Algorithm.SHA_256, masterKey);
        if (!passwordHash.success)
        {
            return TypedMethodResponse.fail(undefined, undefined, "Unable to get master key");
        }

        const { clientRegistrationState, registrationRequest } =
            opaque.client.startRegistration({
                password: passwordHash.value
            });

        const startResponse = await vaulticServer.user.startUpdateKSFParams(registrationRequest);
        if (!startResponse.Success)
        {
            return TypedMethodResponse.fail(undefined, undefined, "Start Update Failed");
        }

        const { registrationRecord, exportKey } = opaque.client.finishRegistration({
            clientRegistrationState,
            registrationResponse: startResponse.ServerRegistrationResponse!,
            password: passwordHash.value,
            keyStretching: {
                "argon2id-custom": {
                    iterations: parsedNewParams.iterations,
                    memory: parsedNewParams.memory,
                    parallelism: parsedNewParams.parallelism
                }
            }
        });

        environment.cache.updateExportKey(exportKey);
        currentUser.ksfParams = newParams;

        // need to update the signature since we are update the ksfParams
        if (!await currentUser.sign(environment.cache.masterKey))
        {
            return TypedMethodResponse.fail(undefined, undefined, "Signing user");
        }

        // we need to send everything that is currently e2e encrypted so that it can be re encrypted with the new export key
        const userDataPayload: UserDataPayload = {};
        userDataPayload.user =
        {
            userID: currentUser.userID,
            ksfParams: currentUser.ksfParams,
            currentSignature: currentUser.currentSignature,
            privateSigningKey: currentUser.privateSigningKey,
            privateEncryptingKey: currentUser.privateEncryptingKey,
            appStoreState:
            {
                appStoreStateID: currentUser.appStoreState.appStoreStateID,
                state: currentUser.appStoreState.state
            },
            userPreferencesStoreState:
            {
                userPreferencesStoreStateID: currentUser.userPreferencesStoreState.userPreferencesStoreStateID,
                state: currentUser.userPreferencesStoreState.state
            }
        };

        const userVaultsToPush = (await environment.repositories.userVaults.getVerifiedUserVaults(environment.cache.masterKey))[0].map(uv =>
        {
            const uvToPush: DeepPartial<IUserVault> =
            {
                userOrganizationID: uv.userOrganizationID,
                userVaultID: uv.userVaultID,
                vaultKey: uv.vaultKey,
                vaultPreferencesStoreState:
                {
                    vaultPreferencesStoreStateID: uv.vaultPreferencesStoreState.vaultPreferencesStoreStateID,
                    state: uv.vaultPreferencesStoreState.state
                }
            };

            return uvToPush;
        });

        userDataPayload["userVaults"] = userVaultsToPush;

        const encryptedPayload = await axiosHelper.api.endToEndEncryptPostData(userDataE2EEncryptedFieldTree, { userDataPayload: userDataPayload });
        if (!encryptedPayload.success)
        {
            return TypedMethodResponse.fail(undefined, undefined, "e2e encrypt user data");
        }

        const finishResponse = await vaulticServer.user.finishUpdateKSFParams(registrationRecord, encryptedPayload.value.userDataPayload);
        if (!finishResponse.Success)
        {
            return TypedMethodResponse.fail(undefined, undefined, "Finish update params");
        }

        const transaction = new Transaction();

        const userUpdates: { [key: string]: any } = {};
        userUpdates[nameof<User>("ksfParams")] = newParams;
        userUpdates[nameof<User>("currentSignature")] = currentUser.currentSignature;

        transaction.overrideEntity(currentUser.userID, userUpdates, () => environment.repositories.users);

        await transaction.commit();
        return TypedMethodResponse.success();
    }
}

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn,
    updateKSFParams
};

export default serverHelper;