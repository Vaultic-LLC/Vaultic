import { DataSource } from "typeorm";
import axiosHelper from "./Server/AxiosHelper";
import { DeviceInfo } from "./Types/Device";
import { CryptUtility, GeneratorUtility, HashUtility } from "./Types/Utilities";
import { initRepositories, VaulticRepositories } from "./Database/Repositories";
import { VaulticCache } from "./Cache";

export interface SessionHandler
{
    setSession: (sessionHash: string) => Promise<void>;
    getSession: () => Promise<string>;
}

export interface InternalEnvironment
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
    createDataSource: (isTest: boolean) => DataSource;
}

class Environment
{
    private internalEnvironment: InternalEnvironment;
    private internalDatabaseDataSouce: DataSource;
    private internalRepositories: VaulticRepositories;
    private internalCache: VaulticCache;

    get isTest() { return this.internalEnvironment.isTest; }
    get sessionHandler() { return this.internalEnvironment.sessionHandler; }
    get utilities() { return this.internalEnvironment.utilities; }
    get databaseDataSouce() { return this.internalDatabaseDataSouce; }
    get repositories() { return this.internalRepositories; }
    get cache() { return this.internalCache; }

    constructor()
    {
        this.internalCache = new VaulticCache();
    }

    async init(environment: InternalEnvironment)
    {
        this.internalEnvironment = environment;
        axiosHelper.init();

        this.internalDatabaseDataSouce = environment.createDataSource(this.internalEnvironment.isTest);
        await this.internalDatabaseDataSouce.initialize();

        this.internalRepositories = initRepositories();
    }

    getDeviceInfo()
    {
        return this.internalEnvironment.getDeviceInfo();
    }
}

export const environment = new Environment();
