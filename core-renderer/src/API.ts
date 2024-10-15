import { IAPI } from "./Types/APITypes"

class API 
{
    private internalAPI: IAPI;

    get environment() { return this.internalAPI?.environment; }
    get server() { return this.internalAPI?.server; }
    get utilities() { return this.internalAPI?.utilities; }
    get helpers() { return this.internalAPI?.helpers; }
    get repositories() { return this.internalAPI?.repositories; }
    get cache() { return this.internalAPI?.cache; }

    constructor()
    {
    }

    setAPI(api: IAPI)
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
