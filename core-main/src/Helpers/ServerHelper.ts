import * as opaque from "@serenity-kit/opaque";
import { stsServer } from "../Server/VaulticServer";
import { FinishRegistrationResponse, LogUserInResponse, OpaqueResponse } from "../Types/Responses";
import axiosHelper from "../Server/AxiosHelper";
import { environment } from "../Environment";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { checkMergeMissingData, getUserDataSignatures, reloadAllUserData, safetifyMethod } from "../Helpers/RepositoryHelper";
import { UserDataPayload } from "../Types/ServerTypes";
import vaultHelper from "./VaultHelper";
import { TypedMethodResponse } from "../Types/MethodResponse";

export interface ServerHelper
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
    logUserIn: (masterKey: string, email: string, firstLogin: boolean) => Promise<TypedMethodResponse<LogUserInResponse | undefined>>;
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

// TODO: wrap in safetify. If verification fails, notify user and then just re do again with reloadAllData = true
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
                // TODO: this only contains data that the user needs to update, not everything.
                const result = await axiosHelper.api.decryptEndToEndData(userDataE2EEncryptedFieldTree, finishResponse);
                if (!result.success)
                {
                    return TypedMethodResponse.failWithValue({ Success: false, message: result.errorMessage });
                }

                if (reloadAllData)
                {
                    await reloadAllUserData(masterKey, result.value.userDataPayload);
                }
                else 
                {
                    await checkMergeMissingData(masterKey, currentSignatures, result.value.userDataPayload);
                }

                // TODO: this will fail when logging in for the first time after registering
                // needs to be done after merging data in case the user needed to have been added
                // TODO: doesn't account for if verification fails
                await environment.repositories.users.setCurrentUser(masterKey, email);

                const payload = await decyrptUserDataPayloadVaults(masterKey, finishResponse.userDataPayload);
                if (!payload)
                {
                    // TODO: log error
                    console.log(`Payload failed`)
                }
                else 
                {
                    finishResponse.userDataPayload = payload as UserDataPayload;
                }
            }

            // TODO: not needed?
            // finishResponse = Object.assign(finishResponse, result.value);
        }

        return TypedMethodResponse.success(finishResponse);
    }
}

async function decyrptUserDataPayloadVaults(masterKey: string, payload?: UserDataPayload): Promise<boolean | UserDataPayload | undefined>
{
    const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
    if (!currentUser)
    {
        console.log('no user');
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