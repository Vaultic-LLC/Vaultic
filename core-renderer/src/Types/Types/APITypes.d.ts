import { MethodResponse } from './MethodResponse';
import { BaseResponse, CreateAccountResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserDeactivationKeyResponse, LoadDataResponse, LogResponse, MutateStoreResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse, ValidateUserResponse } from './Responses';
export interface CryptUtility
{
    encrypt: (key: string, value: string) => Promise<MethodResponse>;
    decrypt: (key: string, value: string) => Promise<MethodResponse>;
}
export interface GeneratorUtility
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
}
export interface Helpers
{
    validation: ValidationHelper;
    vaultic: VaulticHelper;
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
    validateEmail: (email: string) => Promise<ValidateEmailResponse>;
    createAccount: (data: string) => Promise<CreateAccountResponse>;
    validateEmailAndMasterKey: (email: string, key: string) => Promise<ValidateUserResponse>;
    expire: () => Promise<BaseResponse>;
}
export interface StoreController
{
    add: (data: string) => Promise<MutateStoreResponse>;
    update: (data: string) => Promise<MutateStoreResponse>;
    delete: (data: string) => Promise<MutateStoreResponse>;
}
export interface UserController
{
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => Promise<DeleteDeviceResponse>;
    backupSettings: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
    backupAppStore: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
    backupUserPreferences: (data: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
    createCheckout: () => Promise<CreateCheckoutResponse>;
    getChartData: (data: string) => Promise<GetChartDataResponse>;
    getUserDataBreaches: (passwordStoreState: string) => Promise<GetUserDataBreachesResponse>;
    dismissUserDataBreach: (breachID: number) => Promise<BaseResponse>;
    deactivateUserSubscription: (email: string, deactivationKey: string) => Promise<DeactivateUserSubscriptionResponse>;
    getDevices: () => Promise<GetDevicesResponse>;
    reportBug: (description: string) => Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
}
export interface ValueController extends StoreController
{
    generateRandomPhrase: (length: number) => Promise<GenerateRandomPhraseResponse>;
}
export interface VaulticServer
{
    session: SessionController;
    app: AppController;
    user: UserController;
    filter: StoreController;
    group: StoreController;
    password: StoreController;
    value: ValueController;
}

export interface IAPI
{
    getDeviceInfo: () => Promise<DeviceInfo>;
    server: VaulticServer;
    utilities: Utilities;
    helpers: Helpers;
}
