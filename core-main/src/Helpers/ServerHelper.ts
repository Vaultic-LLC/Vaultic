import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import { LogUserInResponse, OpaqueResponse, StartRegistrationResponse } from "../Types/Responses";
import axiosHelper from "../Server/AxiosHelper";

export interface ServerHelper
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<StartRegistrationResponse>;
    logUserIn: (masterKey: string, email: string) => Promise<LogUserInResponse>;
};

async function registerUser(masterKey: string, email: string, firstName: string, lastName: string): Promise<StartRegistrationResponse>
{
    const { clientRegistrationState, registrationRequest } =
        opaque.client.startRegistration({
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

    const { finishLoginRequest, sessionKey } = loginResult;

    const finishResponse = await stsServer.login.finish(startResponse.PendingUserToken!, finishLoginRequest);
    if (finishResponse.Success)
    {
        await axiosHelper.api.setSession(finishResponse.session?.Token!, sessionKey);
    }

    return finishResponse;
}

const serverHelper: ServerHelper =
{
    registerUser,
    logUserIn
};

export default serverHelper;