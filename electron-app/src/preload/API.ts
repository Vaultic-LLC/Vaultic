import { ipcRenderer } from "electron"
import { IAPI, AppController, CryptUtility, Environment, GeneratorUtility, HashUtility, ServerHelper, SessionController, UserController, ValidationHelper, ValueController, VaulticHelper, UserRepository, VaultRepository } from "./Types/APITypes"
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
	backupStores: (data: string) => ipcRenderer.invoke('userController:backupStores', data),
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
	logUserIn: (masterKey: string, email: string) => ipcRenderer.invoke('serverHelper:logUserIn', masterKey, email)
};

const environment: Environment =
{
	isTest: () => ipcRenderer.invoke('environment:isTest')
};

const userRepository: UserRepository =
{
	getLastUsedUserEmail: () => ipcRenderer.invoke('userRepository:getLastUsedUserEmail'),
	getLastUsedUserPreferences: () => ipcRenderer.invoke('userRepository:getLastUsedUserPreferences'),
	createUser: (masterKey: string, email: string) => ipcRenderer.invoke('userRepository:createUser', masterKey, email),
	getCurrentUserData: (masterKey: string, response: any) => ipcRenderer.invoke('userRepository:getCurrentUserData', masterKey, response),
	verifyUserMasterKey: (masterKey: string, email?: string) => ipcRenderer.invoke('userRepository:verifyUserMasterKey', masterKey, email),
};

const vaultRepository: VaultRepository =
{
	getVault: (masterKey: string, vaultID: number) => ipcRenderer.invoke('vaultRepository:getVault', masterKey, vaultID),
	saveAndBackup: (masterKey: string, vaultID: number, data: string, skipBackup: boolean) => ipcRenderer.invoke('vaultRepository:saveAndBackup', masterKey, vaultID, data, skipBackup)
};

const api: IAPI =
{
	getDeviceInfo,
	environment,
	server: {
		app: appController,
		session: sessionController,
		user: userController,
		value: valueController,
	},
	utilities: {
		crypt: cryptUtility,
		hash: hashUtility,
		generator: generatorUtility,
	},
	helpers: {
		validation: validationHelper,
		vaultic: vaulticHelper,
		server: serverHelper
	},
	repositories: {
		users: userRepository,
		vaults: vaultRepository

	}
};

export default api;
