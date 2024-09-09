import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import { FinishRegistrationResponse, LogUserInResponse, OpaqueResponse } from "../Types/Responses";
import axiosHelper from "../Server/AxiosHelper";
import { environment } from "../Environment";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { checkMergeMissingData, getUserDataSignatures } from "../Database/Repositories";

export interface ServerHelper
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
    logUserIn: (masterKey: string, email: string) => Promise<LogUserInResponse>;
};

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

    const { registrationRecord } = opaque.client.finishRegistration({
        clientRegistrationState,
        registrationResponse: startResponse.ServerRegistrationResponse!,
        password: passwordHash,
    });

    return await stsServer.registration.finish(startResponse.PendingUserToken!,
        registrationRecord, firstName, lastName);
}

async function logUserIn(masterKey: string, email: string): Promise<LogUserInResponse>
{
    const passwordHash = environment.utilities.hash.insecureHash(masterKey);
    const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
        password: passwordHash,
    });

    const startResponse = await stsServer.login.start(startLoginRequest, email);
    if (!startResponse.Success)
    {
        return startResponse;
    }

    const loginResult = opaque.client.finishLogin({
        clientLoginState,
        loginResponse: startResponse.StartServerLoginResponse!,
        password: passwordHash,
    });

    if (!loginResult)
    {
        return { Success: false, RestartOpaqueProtocol: true } as OpaqueResponse;
    }

    const { finishLoginRequest, sessionKey, exportKey } = loginResult;

    const currentSignatures = await getUserDataSignatures(masterKey, email);
    let finishResponse = await stsServer.login.finish(startResponse.PendingUserToken!, finishLoginRequest, currentSignatures);

    if (finishResponse.Success)
    {
        await axiosHelper.api.setSessionInfoAndExportKey(finishResponse.Session?.Hash!, sessionKey, exportKey);

        // TODO: this will fail when logging in for the first time after registering
        await environment.repositories.users.setCurrentUser(masterKey, email);

        // TODO: this only contains data that the user needs to update, not everything.
        const result = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, finishResponse);
        if (!result.success)
        {
            return { Success: false, message: result.errorMessage };
        }

        await checkMergeMissingData(currentSignatures, result);

        // TODO: not needed?
        // finishResponse = Object.assign(finishResponse, result.value);
    }

    return finishResponse;
}

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn
};

export default serverHelper;