import { DeviceInfo } from "@vaultic/shared/Types/Device";
import { DataSource } from "typeorm";
import { SessionHandler } from "../Environment";
import { CoreCryptUtility } from "../Utilities/CoreCryptUtility";
import { CoreDataUtility } from "../Utilities/CoreDataUtility";
import CoreGeneratorUtility from "../Utilities/CoreGeneratorUtility";
import { CoreHashUtility } from "../Utilities/CoreHashUtility";
import { VaulticRepositories } from "../Database/Repositories";
import { VaulticCache } from "../Cache";
import { PostTransactionHooks } from "@vaultic/shared/Types/Repositories";

// List of stuff that core-main needs that is platform dependent 
export interface InternalEnvironment
{
    isTest: boolean;
    sessionHandler: SessionHandler;
    utilities:
    {
        crypt: CoreCryptUtility;
        hash: CoreHashUtility;
        generator: CoreGeneratorUtility;
        data: CoreDataUtility;
    };
    postHooks?: PostTransactionHooks,
    database:
    {
        createDataSource: (isTest: boolean) => DataSource;
        deleteDatabase: (isTest: boolean) => Promise<boolean>
    };
    getDeviceInfo: () => DeviceInfo;
    hasConnection: () => Promise<boolean>;
}

export interface Environment 
{
    isTest: boolean;
    sessionHandler: SessionHandler;
    utilities:
    {
        crypt: CoreCryptUtility;
        hash: CoreHashUtility;
        generator: CoreGeneratorUtility;
        data: CoreDataUtility;
    };
    databaseDataSouce: DataSource;
    repositories: VaulticRepositories;
    cache: VaulticCache;
    failedToInitalizeDatabase: boolean;
    postHooks?: PostTransactionHooks;
    setupDatabase: () => Promise<void>;
    recreateDatabase: () => Promise<boolean>;
    getDeviceInfo: () => DeviceInfo;
    hasConnection: () => Promise<boolean>;
}