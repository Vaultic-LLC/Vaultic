import { ECEncryptionResult, MethodResponse, PublicPrivateKey, TypedMethodResponse } from './MethodResponse';
import { BaseResponse, CreateCheckoutResponse, DeactivateUserSubscriptionResponse, DeleteDeviceResponse, FinishRegistrationResponse, GenerateRandomPhraseResponse, GetChartDataResponse, GetDevicesResponse, GetUserDataBreachesResponse, GetUserDeactivationKeyResponse, LoadDataResponse, LogResponse, LogUserInResponse, UseSessionLicenseAndDeviceAuthenticationResponse, ValidateEmailResponse } from './Responses';

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

export interface VaultHelper
{
	loadArchivedVault: (masterKey: string, userVaultID: number) => Promise<boolean | CondensedVaultData | null>;
	unarchiveVault: (masterKey: string, userVaultID: number, select: boolean) => Promise<boolean | CondensedVaultData | null>
};

export interface Helpers
{
	validation: ValidationHelper;
	vaultic: VaulticHelper;
	server: ServerHelper;
	vault: VaultHelper;
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

export interface VaultController
{
	deleteVault: (userVaultID: number) => Promise<BaseResponse>;
}

export interface VaulticServer
{
	app: AppController;
	session: SessionController;
	user: UserController;
	value: ValueController;
	vault: VaultController;
}

export interface Environment
{
	isTest: () => Promise<boolean>;
}

export interface VaulticCache
{
	clear: () => Promise<void>;
}

export interface UserRepository
{
	getLastUsedUserEmail: () => Promise<string | null>;
	getLastUsedUserPreferences: () => Promise<string | null>;
	createUser: (masterKey: string, email: string) => Promise<TypedMethodResponse<boolean | undefined>>
	// getCurrentUser: () => User | undefined;
	// setCurrentUser: (masterKey: string, userIdentifier: string) => Promise<boolean>;
	getCurrentUserData: (masterKey: string, response: any) => Promise<string>;
	verifyUserMasterKey: (masterKey: string, email?: string) => Promise<boolean>;
	saveUser: (masterKey: string, data: string, backup: boolean) => Promise<boolean>;
}

export interface VaultRepository
{
	setActiveVault: (masterKey: string, userVaultID: number) => Promise<boolean | CondensedVaultData>;
	saveVault: (masterKey: string, vaultID: number, data: string, backup: boolean) => Promise<boolean>;
	createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean) => Promise<boolean | CondensedVaultData>;
	archiveVault: (masterKey: string, userVaultID: number, backup: boolean) => Promise<boolean>;
}

export interface UserVaultRepository
{
	saveUserVault: (masterKey: string, vaultID: number, data: string, backup: boolean) => Promise<boolean>;
}

export interface LogRepository
{
	getExportableLogData: () => Promise<string>;
}

export interface Repositories
{
	users: UserRepository;
	vaults: VaultRepository;
	userVaults: UserVaultRepository;
	logs: LogRepository;
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
	id: number;
	color: string;
	lastUsed: boolean;
}

export interface IAPI
{
	getDeviceInfo: () => Promise<DeviceInfo>;
	environment: Environment;
	server: VaulticServer;
	utilities: Utilities;
	helpers: Helpers;
	repositories: Repositories;
	cache: VaulticCache;
}
