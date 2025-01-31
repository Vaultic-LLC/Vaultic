import { environment } from "./Environment";

export class VaulticCache
{
    private internalCurrentUserID: number | undefined;
    private internalSessionKey: string | undefined;
    private internalExportKey: string | undefined;

    private internalStartLoginRequest: string | undefined;
    private internalPasswordHash: string | undefined;
    private internalClientLoginState: string | undefined;

    get currentUserID() { return this.internalCurrentUserID; }
    get sessionKey() { return this.internalSessionKey; }
    get exportKey() { return this.internalExportKey; }

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
}