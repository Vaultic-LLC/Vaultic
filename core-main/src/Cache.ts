import { ClientVaulticCache } from "@vaultic/shared/Types/Environment";
import { environment } from "./Environment";

export class VaulticCache
{
    private internalCurrentUserID: number | undefined;
    private internalSessionKey: string | undefined;
    private internalExportKey: string | undefined;

    get currentUserID() { return this.internalCurrentUserID; }
    get sessionKey() { return this.internalSessionKey; }
    get exportKey() { return this.internalExportKey; }

    constructor()
    {
        this.clear();
    }

    clear()
    {
        this.internalCurrentUserID = undefined;
        this.internalSessionKey = undefined;
        this.internalExportKey = undefined;
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