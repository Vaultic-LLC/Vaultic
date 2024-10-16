import { AppController, ClientUserController, ClientVaultController, SessionController, ValueController } from "./Controllers";
import { DeviceInfo } from "./Device";
import { ClientEnvironment, ClientVaulticCache } from "./Environment";
import { ClientVaultHelper, ServerHelper, ValidationHelper, VaulticHelper } from "./Helpers";
import { ClientLogRepository, ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "./Repositories";
import { ClientCryptUtility, ClientGeneratorUtility, HashUtility } from "./Utilities";

export interface Utilities
{
    crypt: ClientCryptUtility;
    hash: HashUtility;
    generator: ClientGeneratorUtility;
}

export interface Helpers
{
    validation: ValidationHelper;
    vaultic: VaulticHelper;
    server: ServerHelper;
    vault: ClientVaultHelper;
}

export interface VaulticServer
{
    app: AppController;
    session: SessionController;
    user: ClientUserController;
    value: ValueController;
    vault: ClientVaultController;
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
    cache: ClientVaulticCache;
}
