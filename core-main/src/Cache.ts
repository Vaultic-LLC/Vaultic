import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { environment } from "./Environment";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";
import { User } from "./Database/Entities/User";

export class VaulticCache
{
    private internalCurrentUser: Partial<User> | undefined;
    private internalSessionKey: string | undefined;
    private internalExportKey: string | undefined;
    private internalMasterKey: string | undefined;

    private internalStartLoginRequest: string | undefined;
    private internalPasswordHash: string | undefined;
    private internalClientLoginState: string | undefined;

    private internalIsSyncing: boolean | undefined;

    get currentUser() { return this.internalCurrentUser; }
    get sessionKey() { return this.internalSessionKey; }
    get exportKey() { return this.internalExportKey; }
    get masterKey() { return this.internalMasterKey; }

    get startLoginRequest() { return this.internalStartLoginRequest; }
    get passwordHash() { return this.internalPasswordHash; }
    get clientLoginState() { return this.internalClientLoginState; }

    get isSyncing() { return this.internalIsSyncing; }
    set isSyncing(value: boolean) { this.internalIsSyncing = value; }

    constructor()
    {
        this.clear();
    }

    clear()
    {
        this.internalCurrentUser = undefined;
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

    setCurrentUser(user: User)
    {
        // cache this data so that we don't have to verify the user as much
        this.internalCurrentUser =
        {
            userID: user.userID,
            lastLoadedChangeVersion: user.lastLoadedChangeVersion,
            email: user.email,
            privateSigningKey: user.privateSigningKey,
            privateEncryptingKey: user.privateEncryptingKey
        };
    }

    async setSessionInfo(sessionKey: string, exportKey: string, tokenHash: string)
    {
        const sessionVaulticKey: VaulticKey =
        {
            algorithm: Algorithm.XCHACHA20_POLY1305,
            key: sessionKey
        };

        this.internalSessionKey = JSON.stringify(sessionVaulticKey);

        const exportVaulticKey: VaulticKey =
        {
            algorithm: Algorithm.XCHACHA20_POLY1305,
            key: exportKey
        };

        this.internalExportKey = JSON.stringify(exportVaulticKey);

        await environment.sessionHandler.setSession(tokenHash);
    }

    async setMasterKey(masterKey: string): Promise<TypedMethodResponse<undefined>>
    {
        this.internalMasterKey = masterKey;
        return TypedMethodResponse.success();
    }

    clearMasterKey()
    {
        this.internalMasterKey = undefined;
    }
}