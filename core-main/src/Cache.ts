import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { environment } from "./Environment";
import { Algorithm, VaulticKey } from "@vaultic/shared/Types/Keys";

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