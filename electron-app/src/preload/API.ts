import { ipcRenderer } from "electron"
import { IAPI, AppController, CryptUtility, Environment, File, GeneratorUtility, HashUtility, ServerHelper, SessionController, UserController, ValidationHelper, ValueController, VaulticHelper } from "./Types/APITypes"
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
	decrypt: (key: string, value: string) => ipcRenderer.invoke('cryptUtility:decrypt', key, value)
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
	randomPassword: (length: number) => ipcRenderer.invoke('generatorUtility:randomPassword', length)
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
	downloadDeactivationKey: () => ipcRenderer.invoke('vaulticHelper:downloadDeactivationKey')
};

const serverHelper: ServerHelper =
{
	registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => ipcRenderer.invoke('serverHelper:registerUser', masterKey, email, firstName, lastName),
	logUserIn: (masterKey: string, email: string) => ipcRenderer.invoke('serverHelper:logUserIn', masterKey, email)
};

const appFile: File =
{
	exists: () => ipcRenderer.invoke('appFile:exists'),
	read: () => ipcRenderer.invoke('appFile:read'),
	write: (data: string) => ipcRenderer.invoke('appFile:write', data)
};

const settingsFile: File =
{
	exists: () => ipcRenderer.invoke('settingsFile:exists'),
	read: () => ipcRenderer.invoke('settingsFile:read'),
	write: (data: string) => ipcRenderer.invoke('settingsFile:write', data)
};

const passwordFile: File =
{
	exists: () => ipcRenderer.invoke('passwordFile:exists'),
	read: () => ipcRenderer.invoke('passwordFile:read'),
	write: (data: string) => ipcRenderer.invoke('passwordFile:write', data)
};

const valueFile: File =
{
	exists: () => ipcRenderer.invoke('valueFile:exists'),
	read: () => ipcRenderer.invoke('valueFile:read'),
	write: (data: string) => ipcRenderer.invoke('valueFile:write', data)
};

const filterFile: File =
{
	exists: () => ipcRenderer.invoke('filterFile:exists'),
	read: () => ipcRenderer.invoke('filterFile:read'),
	write: (data: string) => ipcRenderer.invoke('filterFile:write', data)
};

const groupFile: File =
{
	exists: () => ipcRenderer.invoke('groupFile:exists'),
	read: () => ipcRenderer.invoke('groupFile:read'),
	write: (data: string) => ipcRenderer.invoke('groupFile:write', data)
};

const userPreferencesFile: File =
{
	exists: () => ipcRenderer.invoke('userPreferencesFile:exists'),
	read: () => ipcRenderer.invoke('userPreferencesFile:read'),
	write: (data: string) => ipcRenderer.invoke('userPreferencesFile:write', data)
};

const environment: Environment =
{
	isTest: () => ipcRenderer.invoke('environment:isTest')
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
	files: {
		app: appFile,
		settings: settingsFile,
		password: passwordFile,
		value: valueFile,
		filter: filterFile,
		group: groupFile,
		userPreferences: userPreferencesFile
	}
};

export default api;
