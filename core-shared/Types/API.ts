import { Promisify } from "../Helpers/TypeScriptHelper";
import { AppController, ClientUserController, ClientVaultController, OrganizationController, SessionController } from "./Controllers";
import { DeviceInfo } from "./Device";
import { ClientEnvironment, ClientVaulticCache } from "./Environment";
import { RepositoryHelper, ServerHelper, ValidationHelper, VaulticHelper } from "./Helpers";
import { ClientLogRepository, ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "./Repositories";
import { ClientCryptUtility, ClientGeneratorUtility, ClientHashUtility } from "./Utilities";

export interface Utilities
{
    crypt: ClientCryptUtility;
    generator: Promisify<ClientGeneratorUtility>;
    hash: ClientHashUtility;
}

export interface Helpers
{
    validation: Promisify<ValidationHelper>;
    vaultic: VaulticHelper;
    server: ServerHelper;
    repositories: RepositoryHelper;
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

export interface IAPI
{
    getDeviceInfo: () => Promise<DeviceInfo>;
    environment: ClientEnvironment;
    server: VaulticServer;
    utilities: Utilities;
    helpers: Helpers;
    repositories: Repositories;
    cache: Promisify<ClientVaulticCache>;
}
