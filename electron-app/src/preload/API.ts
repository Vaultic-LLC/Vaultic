import { ipcRenderer } from "electron"
import { API, AppController, CryptUtility, File, GeneratorUtility, HashUtility, SessionController, StoreController, UserController, ValidationHelper, ValueController, VaulticHelper } from "./Types/APITypes"
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
	validateEmail: (email: string) => ipcRenderer.invoke('sessionController:validateEmail', email),
	createAccount: (data: string) => ipcRenderer.invoke('sessionController:createAccount', data),
	validateEmailAndMasterKey: (email: string, masterKey: string) => ipcRenderer.invoke('sessionController:validateEmailAndMasterKey', email, masterKey),
	expire: () => ipcRenderer.invoke('sessionController:expire')
};

const userController: UserController =
{
	deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => ipcRenderer.invoke('userController:deleteDevice', masterKey, desktopDeviceID, mobileDeviceID),
	backupSettings: (data: string) => ipcRenderer.invoke('userController:backupSettings', data),
	backupAppStore: (data: string) => ipcRenderer.invoke('userController:backupAppStore', data),
	backupUserPreferences: (data: string) => ipcRenderer.invoke('userController:backupUserPreferences', data),
	getUserData: () => ipcRenderer.invoke('userController:getUserData'),
	createCheckout: () => ipcRenderer.invoke('userController:createCheckout'),
	getChartData: (data: string) => ipcRenderer.invoke('userController:getChartData', data),
	getUserDataBreaches: (passwordStoreState: string) => ipcRenderer.invoke('userController:getUserDataBreaches', passwordStoreState),
	dismissUserDataBreach: (breechID: number) => ipcRenderer.invoke('userController:dismissUserDataBreach', breechID),
	deactivateUserSubscription: (email: string, deactivationKey: string) => ipcRenderer.invoke('userController:deactivateUserSubscription', email, deactivationKey),
	getDevices: () => ipcRenderer.invoke('userController:getDevices'),
	reportBug: () => ipcRenderer.invoke('userController:reportBug'),
};

const filterController: StoreController =
{
	add: (data: string) => ipcRenderer.invoke('filterController:add', data),
	update: (data: string) => ipcRenderer.invoke('filterController:update', data),
	delete: (data: string) => ipcRenderer.invoke('filterController:delete', data)
};

const groupController: StoreController =
{
	add: (data: string) => ipcRenderer.invoke('groupController:add', data),
	update: (data: string) => ipcRenderer.invoke('groupController:update', data),
	delete: (data: string) => ipcRenderer.invoke('groupController:delete', data)
};

const passwordController: StoreController =
{
	add: (data: string) => ipcRenderer.invoke('passwordController:add', data),
	update: (data: string) => ipcRenderer.invoke('passwordController:update', data),
	delete: (data: string) => ipcRenderer.invoke('passwordController:delete', data)
};

const valueController: ValueController =
{
	add: (data: string) => ipcRenderer.invoke('valueController:add', data),
	update: (data: string) => ipcRenderer.invoke('valueController:update', data),
	delete: (data: string) => ipcRenderer.invoke('valueController:delete', data),
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
	insecureHash: (value: string) => ipcRenderer.invoke('hashUtility:insecureHash', value)
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

const api: API =
{
	getDeviceInfo,
	server: {
		app: appController,
		session: sessionController,
		user: userController,
		filter: filterController,
		group: groupController,
		password: passwordController,
		value: valueController,
	},
	utilities: {
		crypt: cryptUtility,
		hash: hashUtility,
		generator: generatorUtility,
	},
	helpers: {
		validation: validationHelper,
		vaultic: vaulticHelper
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
