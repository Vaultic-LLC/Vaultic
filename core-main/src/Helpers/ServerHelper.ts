import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import { FinishRegistrationResponse, LogUserInResponse, OpaqueResponse } from "../Types/Responses";
import axiosHelper from "../Server/AxiosHelper";

export interface ServerHelper
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
    logUserIn: (masterKey: string, email: string) => Promise<LogUserInResponse>;
};

async function registerUser(masterKey: string, email: string, firstName: string, lastName: string): Promise<FinishRegistrationResponse>
{
    const { clientRegistrationState, registrationRequest } =
        opaque.client.startRegistration({
            // TODO: should hash this so that even if the registration record is stolen, an attacker would 
            // only be able to derive the hash and not the actual master key
            password: masterKey
        });

    const startResponse = await stsServer.registration.start(registrationRequest, email);
    if (!startResponse.Success)
    {
        return startResponse;
    }

    const { registrationRecord } = opaque.client.finishRegistration({
        clientRegistrationState,
        registrationResponse: startResponse.ServerRegistrationResponse!,
        // TODO: should hash this so that even if the registration record is stolen, an attacker would 
        // only be able to derive the hash and not the actual master key
        password: masterKey,
    });

    return await stsServer.registration.finish(startResponse.PendingUserToken!,
        registrationRecord, firstName, lastName);
}

async function logUserIn(masterKey: string, email: string): Promise<LogUserInResponse>
{
    const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
        password: masterKey,
    });

    const startResponse = await stsServer.login.start(startLoginRequest, email);
    if (!startResponse.Success)
    {
        return startResponse;
    }

    const loginResult = opaque.client.finishLogin({
        clientLoginState,
        loginResponse: startResponse.StartServerLoginResponse!,
        password: masterKey,
    });

    if (!loginResult)
    {
        return { Success: false, RestartOpaqueProtocol: true } as OpaqueResponse;
    }

    const { finishLoginRequest, sessionKey, exportKey } = loginResult;

    let finishResponse = await stsServer.login.finish(startResponse.PendingUserToken!, finishLoginRequest);
    if (finishResponse.Success)
    {
        await axiosHelper.api.setSessionInfoAndExportKey(finishResponse.Session?.Hash!, sessionKey, exportKey);

        const storeStates = ['AppStoreState', 'SettingsStoreState', 'FilterStoreState', 'GroupStoreState', 'PasswordStoreState',
            'ValueStoreState', 'UserPreferencesStoreState'];

        const result = await axiosHelper.api.decryptEndToEndData(storeStates, finishResponse);
        if (!result.success)
        {
            return { Success: false, message: result.errorMessage };
        }

        finishResponse = Object.assign(finishResponse, result.value);
    }

    return finishResponse;
}

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn
};

export default serverHelper;