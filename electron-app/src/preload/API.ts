import { ipcRenderer } from "electron"
import { IAPI, AppController, CryptUtility, Environment, GeneratorUtility, HashUtility, ServerHelper, SessionController, UserController, ValidationHelper, ValueController, VaulticHelper, UserRepository, VaultRepository, UserVaultRepository, VaultController, VaulticCache, CondensedVaultData, VaultHelper, LogRepository } from "./Types/APITypes"
import { DeviceInfo } from "./Types/Device";

export function getDeviceInfo(): Promise<DeviceInfo>
{
	return ipcRenderer.invoke('device:info');
}

const appController: AppController =
{
	log: (exception: string, message: string) => ipcRenderer.invoke('appController:log', exception, message)
};

const sessionController: SessionController =
{
	expire: () => ipcRenderer.invoke('sessionController:expire')
};

const userController: UserController =
{
	validateEmail: (email: string) => ipcRenderer.invoke('userController:validateEmail', email),
	deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => ipcRenderer.invoke('userController:deleteDevice', masterKey, desktopDeviceID, mobileDeviceID),
	getUserData: () => ipcRenderer.invoke('userController:getUserData'),
	createCheckout: () => ipcRenderer.invoke('userController:createCheckout'),
	getChartData: (data: string) => ipcRenderer.invoke('userController:getChartData', data),
	getUserDataBreaches: (passwordStoreState: string) => ipcRenderer.invoke('userController:getUserDataBreaches', passwordStoreState),
	dismissUserDataBreach: (breechID: number) => ipcRenderer.invoke('userController:dismissUserDataBreach', breechID),
	deactivateUserSubscription: (email: string, deactivationKey: string) => ipcRenderer.invoke('userController:deactivateUserSubscription', email, deactivationKey),
	getDevices: () => ipcRenderer.invoke('userController:getDevices'),
	reportBug: () => ipcRenderer.invoke('userController:reportBug'),
};

const valueController: ValueController =
{
	generateRandomPhrase: (length: number) => ipcRenderer.invoke('valueController:generateRandomPhrase', length)
};

const vaultController: VaultController =
{
	deleteVault: (userVaultID: number) => ipcRenderer.invoke('vaultController:deleteVault', userVaultID)
}

const cryptUtility: CryptUtility =
{
	encrypt: (key: string, value: string) => ipcRenderer.invoke('cryptUtility:encrypt', key, value),
	decrypt: (key: string, value: string) => ipcRenderer.invoke('cryptUtility:decrypt', key, value),
	ECEncrypt: (recipientPublicKey: string, value: string) => ipcRenderer.invoke('cryptUtility:ECEncrypt', recipientPublicKey, value),
	ECDecrypt: (tempPublicKey: string, userPrivateKey: string, value: string) => ipcRenderer.invoke('cryptUtility:ECDecrypt', tempPublicKey, userPrivateKey, value)
};

const hashUtility: HashUtility =
{
	hash: (value: string, salt: string) => ipcRenderer.invoke('hashUtility:hash', value, salt),
	insecureHash: (value: string) => ipcRenderer.invoke('hashUtility:insecureHash', value),
	compareHashes: (a: string, b: string) => ipcRenderer.invoke('hashUtility:compareHashes', a, b)
};

const generatorUtility: GeneratorUtility =
{
	uniqueId: () => ipcRenderer.invoke('generatorUtility:uniqueId'),
	randomValue: (length: number) => ipcRenderer.invoke('generatorUtility:randomValue', length),
	randomPassword: (length: number) => ipcRenderer.invoke('generatorUtility:randomPassword', length),
	ECKeys: () => ipcRenderer.invoke('generatorUtility:ECKeys')
};

const validationHelper: ValidationHelper =
{
	isWeak: (value: string, type: string) => ipcRenderer.invoke('validationHelper:isWeak', value, type),
	containsNumber: (value: string) => ipcRenderer.invoke('validationHelper:containsNumber', value),
	containsSpecialCharacter: (value: string) => ipcRenderer.invoke('validationHelper:containsSpecialCharacter', value),
	containsUppercaseAndLowercaseNumber: (value: string) => ipcRenderer.invoke('validationHelper:containsUppercaseAndLowercaseNumber', value)
};

const vaulticHelper: VaulticHelper =
{
	downloadDeactivationKey: () => ipcRenderer.invoke('vaulticHelper:downloadDeactivationKey'),
	readCSV: () => ipcRenderer.invoke('vaulticHelper:readCSV'),
	writeCSV: (fileName: string, data: string) => ipcRenderer.invoke('vaulticHelper:writeCSV', fileName, data)
};

const serverHelper: ServerHelper =
{
	registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => ipcRenderer.invoke('serverHelper:registerUser', masterKey, email, firstName, lastName),
	logUserIn: (masterKey: string, email: string, firstLogin: boolean) => ipcRenderer.invoke('serverHelper:logUserIn', masterKey, email, firstLogin)
};

const vaultHelper: VaultHelper =
{
	loadArchivedVault: (masterKey: string, userVaultID: number) => ipcRenderer.invoke('vaultHelper:loadArchivedVault', masterKey, userVaultID),
	unarchiveVault: (masterKey: string, userVaultID: number, select: boolean) => ipcRenderer.invoke('vaultHelper:unarchiveVault', masterKey, userVaultID, select)
}

const environment: Environment =
{
	isTest: () => ipcRenderer.invoke('environment:isTest')
};

const cache: VaulticCache =
{
	clear: () => ipcRenderer.invoke('cache:clear')
}

const userRepository: UserRepository =
{
	getLastUsedUserEmail: () => ipcRenderer.invoke('userRepository:getLastUsedUserEmail'),
	getLastUsedUserPreferences: () => ipcRenderer.invoke('userRepository:getLastUsedUserPreferences'),
	createUser: (masterKey: string, email: string) => ipcRenderer.invoke('userRepository:createUser', masterKey, email),
	getCurrentUserData: (masterKey: string, response: any) => ipcRenderer.invoke('userRepository:getCurrentUserData', masterKey, response),
	verifyUserMasterKey: (masterKey: string, email?: string) => ipcRenderer.invoke('userRepository:verifyUserMasterKey', masterKey, email),
	saveUser: (masterKey: string, data: string, backup: boolean) => ipcRenderer.invoke('userRepository:saveUser', masterKey, data, backup)
};

const vaultRepository: VaultRepository =
{
	setActiveVault: (masterKey: string, userVaultID: number) => ipcRenderer.invoke('vaultRepository:setActiveVault', masterKey, userVaultID),
	saveVault: (masterKey: string, userVaultID: number, data: string, backup: boolean) => ipcRenderer.invoke('vaultRepository:saveVault', masterKey, userVaultID, data, backup),
	createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackup: boolean) => ipcRenderer.invoke('vaultRepository:createNewVaultForUser', masterKey, name, setAsActive, doBackup),
	archiveVault: (masterKey: string, userVaultID: number, backup: boolean) => ipcRenderer.invoke('vaultRepository:archiveVault', masterKey, userVaultID, backup)
};

const userVaultRepository: UserVaultRepository =
{
	saveUserVault: (masterKey: string, userVaultID: number, data: string, backup: boolean) => ipcRenderer.invoke('userVaultRepository:saveUserVault', masterKey, userVaultID, data, backup)
};

const logRepository: LogRepository =
{
	getExportableLogData: () => ipcRenderer.invoke('logRepository:getExportableLogData')
}

const api: IAPI =
{
	getDeviceInfo,
	environment,
	cache,
	server: {
		app: appController,
		session: sessionController,
		user: userController,
		value: valueController,
		vault: vaultController
	},
	utilities: {
		crypt: cryptUtility,
		hash: hashUtility,
		generator: generatorUtility,
	},
	helpers: {
		validation: validationHelper,
		vaultic: vaulticHelper,
		server: serverHelper,
		vault: vaultHelper
	},
	repositories: {
		users: userRepository,
		vaults: vaultRepository,
		userVaults: userVaultRepository,
		logs: logRepository
	}
};

export default api;
