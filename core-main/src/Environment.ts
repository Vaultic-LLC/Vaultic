import axiosHelper from "./Server/AxiosHelper";
import { DeviceInfo } from "./Types/Device";
import { CryptUtility, GeneratorUtility, HashUtility } from "./Types/Utilities";

export interface SessionHandler
{
    setSession: (sessionHash: string) => Promise<void>;
    getSession: () => Promise<string>;
}

export interface IEnvironment
{
    isTest: boolean;
    sessionHandler: SessionHandler;
    utilities:
    {
        crypt: CryptUtility;
        hash: HashUtility;
        generator: GeneratorUtility;
    };
    getDeviceInfo: () => DeviceInfo;
}

let internalEnvironment: IEnvironment;
class Environment implements IEnvironment
{
    get isTest() { return internalEnvironment.isTest; }
    get sessionHandler() { return internalEnvironment.sessionHandler; }
    get utilities() { return internalEnvironment.utilities; }

    constructor()
    {
    }

    init(environment: IEnvironment)
    {
        internalEnvironment = environment;
        axiosHelper.init();
    }

    getDeviceInfo()
    {
        return internalEnvironment.getDeviceInfo();
    }
}

export const environment = new Environment();
