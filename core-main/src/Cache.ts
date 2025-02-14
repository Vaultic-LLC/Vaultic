import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { environment } from "./Environment";
import { VaulticKey } from "@vaultic/shared/Types/Keys";
import { safetifyMethod } from "./Helpers/RepositoryHelper";

export class VaulticCache
{
    private internalCurrentUserID: number | undefined;
    private internalSessionKey: string | undefined;
    private internalExportKey: string | undefined;
    private internalMasterKey: string | undefined;

    private internalStartLoginRequest: string | undefined;
    private internalPasswordHash: string | undefined;
    private internalClientLoginState: string | undefined;

    get currentUserID() { return this.internalCurrentUserID; }
    get sessionKey() { return this.internalSessionKey; }
    get exportKey() { return this.internalExportKey; }
    get masterKey() { return this.internalMasterKey; }

    get startLoginRequest() { return this.internalStartLoginRequest; }
    get passwordHash() { return this.internalPasswordHash; }
    get clientLoginState() { return this.internalClientLoginState; }

    constructor()
    {
        this.clear();
    }

    clear()
    {
        this.internalCurrentUserID = undefined;
        this.internalSessionKey = undefined;
        this.internalExportKey = undefined;
        this.internalMasterKey = undefined;

        this.clearLoginData();
    }

    setLoginData(startLoginRequest: string, passwordHash: string, clientLoginState: string)
    {
        this.internalStartLoginRequest = startLoginRequest;
        this.internalPasswordHash = passwordHash;
        this.internalClientLoginState = clientLoginState;
    }

    clearLoginData()
    {
        this.internalStartLoginRequest = undefined;
        this.internalPasswordHash = undefined;
        this.internalClientLoginState = undefined;
    }

    setCurrentUserID(currentUserID: number)
    {
        this.internalCurrentUserID = currentUserID;
    }

    async setSessionInfo(sessionKey: string, exportKey: string, tokenHash: string)
    {
        this.internalSessionKey = sessionKey;
        this.internalExportKey = exportKey;

        await environment.sessionHandler.setSession(tokenHash);
    }

    async setMasterKey(masterKey: string): Promise<TypedMethodResponse<undefined>>
    {
        return safetifyMethod(this, internalSetMasterKey);

        async function internalSetMasterKey(): Promise<TypedMethodResponse<undefined>>
        {
            const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
            if (!currentUser)
            {
                return TypedMethodResponse.fail();
            }

            // the encrypting / decrypting framework expects a VaulticKey
            const masterKeyVaulticKey: VaulticKey =
            {
                algorithm: currentUser.masterKeyEncryptionAlgorithm,
                key: masterKey
            };

            this.internalMasterKey = JSON.vaulticStringify(masterKeyVaulticKey);
            return TypedMethodResponse.success();
        }
    }

    clearMasterKey()
    {
        this.internalMasterKey = undefined;
    }
}