import { DataSource } from "typeorm";
import { initRepositories, VaulticRepositories } from "./Database/Repositories";
import { VaulticCache } from "./Cache";
import * as PolyFills from "@vaultic/shared/Types/PolyFills";
import { InternalEnvironment } from "./Types/Environment";
import { Server } from "./Types/Server";
import initServer from "./Server/VaulticServer";
PolyFills.a;

export interface SessionHandler
{
    setSession: (sessionHash: string) => Promise<void>;
    getSession: () => Promise<string>;
}

class Environment
{
    private internalEnvironment: InternalEnvironment;
    private internalDatabaseDataSouce: DataSource;
    private internalRepositories: VaulticRepositories;
    private internalServer: Server;
    private internalCache: VaulticCache;

    private internalFailedToInitalizeDatabase: boolean;

    get isTest() { return this.internalEnvironment.isTest; }
    get sessionHandler() { return this.internalEnvironment.sessionHandler; }
    get utilities() { return this.internalEnvironment.utilities; }
    get databaseDataSouce() { return this.internalDatabaseDataSouce; }
    get repositories() { return this.internalRepositories; }
    get server() { return this.internalServer; }
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
        this.internalServer = initServer(this);

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
        return !this.internalFailedToInitalizeDatabase;
    }

    getDeviceInfo()
    {
        return this.internalEnvironment.getDeviceInfo();
    }

    hasConnection()
    {
        return this.internalEnvironment.hasConnection();
    }
}

export const environment = new Environment();
