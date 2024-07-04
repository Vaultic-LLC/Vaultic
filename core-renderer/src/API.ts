import { IAPI } from "./Types/APITypes"

let internalAPI: IAPI;

class API 
{
    get environment() { return internalAPI?.environment; }
    get server() { return internalAPI?.server; }
    get utilities() { return internalAPI?.utilities; }
    get helpers() { return internalAPI?.helpers; }
    get files() { return internalAPI?.files; }

    constructor()
    {
    }

    setAPI(api: IAPI)
    {
        internalAPI = api;
    }

    getDeviceInfo()
    {
        return internalAPI?.getDeviceInfo();
    }
}

export const api: API = new API();
