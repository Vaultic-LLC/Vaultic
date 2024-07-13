import { MethodResponse } from './MethodResponse';
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, FinishRegistrationResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserDeactivationKeyResponse, LoadDataResponse, LogResponse, LogUserInResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from './Responses';

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

export interface ServerHelper
{
	registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
	logUserIn: (masterKey: string, email: string) => Promise<LogUserInResponse>;
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
	backupStores(data: string): Promise<UseSessionLicenseAndDeviceAuthenticationResponse>;
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

export interface IAPI
{
	getDeviceInfo: () => Promise<DeviceInfo>;
	environment: Environment;
	server: VaulticServer;
	utilities: Utilities;
	helpers: Helpers;
	files: Files;
}
