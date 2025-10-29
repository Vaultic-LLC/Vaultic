import { Promisify } from "../Helpers/TypeScriptHelper";
import { AppController, ClientUserController, ClientVaultController, OrganizationController, SessionController } from "./Controllers";
import { DeviceInfo } from "./Device";
import { ClientEnvironment, ClientVaulticCache } from "./Environment";
import { RepositoryHelper, ServerHelper, ValidationHelper, VaulticHelper } from "./Helpers";
import { ClientLogRepository, ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "./Repositories";
import { ClientCryptUtility, ClientGeneratorUtility, ClientHashUtility, ICoreGeneratorUtility } from "./Utilities";

export interface Utilities extends CoreUtilities
{
    generator: Promisify<ClientGeneratorUtility>;
}

export interface Helpers extends CoreHelpers
{
    vaultic: VaulticHelper;
}

export interface VaulticServer
{
    app: AppController;
    session: SessionController;
    user: ClientUserController;
    vault: ClientVaultController;
    organization: OrganizationController;
}

export interface Repositories
{
    users: ClientUserRepository;
    vaults: ClientVaultRepository;
    userVaults: ClientUserVaultRepository;
    logs: ClientLogRepository;
}

// This is everything that the API needs, includeding things that are platform dependent
export interface PlatformDependentAPIResolver
{
    getDeviceInfo: () => Promise<DeviceInfo>;
    environment: ClientEnvironment;
    server: VaulticServer;
    utilities: Utilities;
    helpers: Helpers;
    repositories: Repositories;
    cache: Promisify<ClientVaulticCache>;
}

export interface CoreUtilities
{
    crypt: ClientCryptUtility;
    generator: Promisify<ICoreGeneratorUtility>;
    hash: ClientHashUtility;
}

export interface CoreHelpers
{
    validation: Promisify<ValidationHelper>;
    server: ServerHelper;
    repositories: RepositoryHelper;
}

// Not all things in the api are available in core-main so this is a subset of things that are
export class CoreAPIResolver
{
    environment: ClientEnvironment;
    server: VaulticServer;
    utilities: CoreUtilities;
    helpers: CoreHelpers;
    repositories: Repositories;
    cache: Promisify<ClientVaulticCache>;

    constructor(environment: ClientEnvironment, cache: Promisify<ClientVaulticCache>, server: VaulticServer, utilities: CoreUtilities, helpers: CoreHelpers, repositories: Repositories)
    {
        this.environment = environment;
        this.cache = cache;
        this.server = server;
        this.utilities = utilities;
        this.helpers = helpers;
        this.repositories = repositories;
    }

    toPlatformDependentAPIResolver(getDeviceInfo: () => Promise<DeviceInfo>, vaulticHelper: VaulticHelper, generatorUtility: Promisify<ClientGeneratorUtility>): PlatformDependentAPIResolver
    {
        return {
            ...this,
            getDeviceInfo,
            helpers:
            {
                ...this.helpers,
                vaultic: vaulticHelper,
            },
            utilities:
            {
                ...this.utilities,
                generator: generatorUtility
            }
        }
    }
}