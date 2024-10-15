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
    database:
    {
        createDataSource: (isTest: boolean) => DataSource;
        deleteDatabase: (isTest: boolean) => Promise<boolean>
    };
    getDeviceInfo: () => DeviceInfo;
}

class Environment
{
    private internalEnvironment: InternalEnvironment;
    private internalDatabaseDataSouce: DataSource;
    private internalRepositories: VaulticRepositories;
    private internalCache: VaulticCache;

    private internalFailedToInitalizeDatabase: boolean;

    get isTest() { return this.internalEnvironment.isTest; }
    get sessionHandler() { return this.internalEnvironment.sessionHandler; }
    get utilities() { return this.internalEnvironment.utilities; }
    get databaseDataSouce() { return this.internalDatabaseDataSouce; }
    get repositories() { return this.internalRepositories; }
    get cache() { return this.internalCache; }

    get failedToInitalizeDatabase() { return this.internalFailedToInitalizeDatabase; }

    constructor()
    {
        this.internalCache = new VaulticCache();
        this.internalFailedToInitalizeDatabase = false;
    }

    async init(environment: InternalEnvironment)
    {
        this.internalEnvironment = environment;
        axiosHelper.init();

        await this.setupDatabase();
    }

    async setupDatabase()
    {
        try
        {
            this.internalDatabaseDataSouce = this.internalEnvironment.database.createDataSource(this.internalEnvironment.isTest);
            await this.internalDatabaseDataSouce.initialize();
            this.internalRepositories = initRepositories();

            this.internalFailedToInitalizeDatabase = false;
        }
        catch (e)
        {
            console.log(e);
            this.internalFailedToInitalizeDatabase = true;
        }
    }

    async recreateDatabase()
    {
        if (!(await this.internalEnvironment.database.deleteDatabase(this.internalEnvironment.isTest)))
        {
            return false;
        }

        await this.setupDatabase();
        return this.internalFailedToInitalizeDatabase;
    }

    getDeviceInfo()
    {
        return this.internalEnvironment.getDeviceInfo();
    }
}

export const environment = new Environment();
