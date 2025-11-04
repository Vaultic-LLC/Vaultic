import { PlatformDependentAPIResolver } from "@vaultic/shared/Types/API"

class API 
{
    private internalAPI: PlatformDependentAPIResolver;

    get environment() { return this.internalAPI?.environment; }
    get server() { return this.internalAPI?.server; }
    get utilities() { return this.internalAPI?.utilities; }
    get helpers() { return this.internalAPI?.helpers; }
    get repositories() { return this.internalAPI?.repositories; }
    get cache() { return this.internalAPI?.cache; }

    constructor()
    {
        this.internalAPI = undefined as any as PlatformDependentAPIResolver;
    }

    setAPIResolver(api: PlatformDependentAPIResolver)
    {
        if (this.internalAPI != undefined)
        {
            return;
        }

        this.internalAPI = api;
    }

    getDeviceInfo()
    {
        return this.internalAPI?.getDeviceInfo();
    }
}

export const api: API = new API();
