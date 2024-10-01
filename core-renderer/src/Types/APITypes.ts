import { ECEncryptionResult, MethodResponse, PublicPrivateKey } from './MethodResponse';
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, FinishRegistrationResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserDeactivationKeyResponse, LoadDataResponse, LogResponse, LogUserInResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from './Responses';
import { UserData } from './SharedTypes';

export interface CoreCryptUtility
{
    ECEncrypt: (recipientPublicKey: string, value: string) => Promise<ECEncryptionResult>;
    ECDecrypt: (tempPublicKey: string, usersPrivateKey: string, value: string) => Promise<MethodResponse>;
}

export interface CryptUtility extends CoreCryptUtility
{
    encrypt: (key: string, value: string) => Promise<MethodResponse>;
    decrypt: (key: string, value: string) => Promise<MethodResponse>;
}

export interface CoreGeneratorUtility
{
    ECKeys: () => Promise<PublicPrivateKey>;
}

export interface GeneratorUtility extends CoreGeneratorUtility
{
    uniqueId: () => Promise<string>;
    randomValue: (length: number) => Promise<string>;
    randomPassword: (length: number) => Promise<string>;
}

export interface HashUtility
{
    hash: (value: string, salt: string) => Promise<string>;
    insecureHash: (value: string) => Promise<string>;
    compareHashes: (a: string, b: string) => Promise<boolean>;
}

export interface Utilities
{
    crypt: CryptUtility;
    hash: HashUtility;
    generator: GeneratorUtility;
}

export interface ValidationHelper
{
    isWeak: (value: string, type: string) => Promise<[boolean, string]>;
    containsNumber: (value: string) => Promise<boolean>;
    containsSpecialCharacter: (value: string) => Promise<boolean>;
    containsUppercaseAndLowercaseNumber: (value: string) => Promise<boolean>;
}

export interface VaulticHelper
{
    downloadDeactivationKey: () => Promise<GetUserDeactivationKeyResponse>;
    readCSV: () => Promise<[boolean, string]>;
    writeCSV: (fileName: string, data: string) => Promise<boolean>;
}

export interface ServerHelper
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
    logUserIn: (masterKey: string, email: string, firstLogin: boolean) => Promise<LogUserInResponse>;
};

export interface Helpers
{
    validation: ValidationHelper;
    vaultic: VaulticHelper;
    server: ServerHelper;
}

export interface DeviceInfo
{
    deviceName: string;
    model: string;
    version: string;
    platform: string;
    mac: string;
}

export interface AppController
{
    log: (exception: string, stack: string) => Promise<LogResponse>;
}

export interface SessionController
{
    expire: () => Promise<BaseResponse>;
}

export interface UserController
{
    validateEmail(email: string): Promise<ValidateEmailResponse>;
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    getUserData: () => Promise<LoadDataResponse>;
    createCheckout: () => Promise<CreateCheckoutResponse>;
    getChartData: (data: string) => Promise<GetChartDataResponse>;
    getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
    dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
    deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
    getDevices: () => Promise<GetDevicesResponse>;
    reportBug: (description: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
}

export interface ValueController
{
    generateRandomPhrase: (length: number) => Promise<GenerateRandomPhraseResponse>;
}

export interface VaulticServer
{
    app: AppController;
    session: SessionController;
    user: UserController;
    value: ValueController;
}

export interface File
{
    exists: () => Promise<boolean>;
    write: (data: string) => Promise<MethodResponse>;
    read: () => Promise<MethodResponse>;
}

export interface Files
{
    app: File;
    settings: File;
    password: File;
    value: File;
    filter: File;
    group: File;
    userPreferences: File;
}

export interface Environment 
{
    isTest: () => Promise<boolean>;
}

interface User
{
    userID: number;
    firstName: string;
    lastName: string;
    email: string;
    userIdentifier: string;
    masterKeyHash: string;
    masterKeySalt: string;
    privateKey: string;
    userVaults: UserVault[];
}

interface UserVault
{
    userVaultID: number;
    userID: number;
    user: User;
    vaultID: number;
    vault: Vault;
    vaultKey: string;
}

interface Vault
{
    vaultID: number;
    userVaults: UserVault[];
    vaultIdentifier: string;
    name: string;
    color: string;
    vaultStoreState: string;
    passwordStoreState: string;
    valueStoreState: string;
    filterStoreState: string;
    groupStoreState: string;
}

export interface CondensedVaultData
{
    userVaultID: number;
    vaultPreferencesStoreState: string;
    name: string;
    color: string;
    lastUsed: boolean;
    vaultStoreState: string;
    passwordStoreState: string;
    valueStoreState: string;
    filterStoreState: string;
    groupStoreState: string;
}

export interface DisplayVault 
{
    name: string;
    userVaultID: number;
    color: string;
    lastUsed: boolean;
}

export interface UserRepository 
{
    getLastUsedUserEmail: () => Promise<string | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string) => Promise<boolean | string>;
    getCurrentUser: () => User | undefined;
    setCurrentUser: (masterKey: string, userIdentifier: string) => Promise<boolean>;
    getCurrentUserData: (masterKey: string) => Promise<string>;
    verifyUserMasterKey: (masterKey: string, email?: string) => Promise<boolean>;
    saveUser: (masterKey: string, data: string, backup: boolean) => Promise<boolean>;
}

export interface VaultRepository
{
    setActiveVault: (masterKey: string, userVaultID: number) => Promise<boolean | CondensedVaultData>;
    saveVault: (masterKey: string, userVaultID: number, data: string, doBackup: boolean) => Promise<boolean>;
    createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean) => Promise<boolean | CondensedVaultData>;
}

export interface UserVaultRepository
{
    saveUserVault: (masterKey: string, userVaultID: number, data: string, backup: boolean) => Promise<boolean>;
}

export interface Repositories
{
    users: UserRepository;
    vaults: VaultRepository;
    userVaults: UserVaultRepository;
}

export interface IAPI
{
    getDeviceInfo: () => Promise<DeviceInfo>;
    environment: Environment;
    server: VaulticServer;
    utilities: Utilities;
    helpers: Helpers;
    repositories: Repositories;
}
