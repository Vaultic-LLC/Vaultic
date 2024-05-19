import { ipcMain } from "electron";
import hashUtility from "./Utilities/HashUtility";
import { getDeviceInfo } from "./Objects/DeviceInfo";
import vaulticServer from "./Objects/Server/VaulticServer";
import cryptUtility from "./Utilities/CryptUtility";
import generatorUtility from "./Utilities/Generator";
import validationHelper from "./Helpers/ValidationHelper";
import vaulticHelper from "./Helpers/VaulticHelper";
import vaulticFiles from "./Objects/Files/Files";

export default function setupIPC()
{
	ipcMain.handle('device:info', () => getDeviceInfo());

	ipcMain.handle('appController:log', (_, exception: string, message: string) => vaulticServer.app.log(exception, message));

	ipcMain.handle('sessionController:validateEmail', (_, email: string) => vaulticServer.session.validateEmail(email));
	ipcMain.handle('sessionController:createAccount', (_, data: string) => vaulticServer.session.createAccount(data));
	ipcMain.handle('sessionController:validateEmailAndMasterKey', (_, email: string, key: string) => vaulticServer.session.validateEmailAndMasterKey(email, key));
	ipcMain.handle('sessionController:expire', () => vaulticServer.session.expire());

	ipcMain.handle('userController:deleteDevice', (_, masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => vaulticServer.user.deleteDevice(masterKey, desktopDeviceID, mobileDeviceID));
	ipcMain.handle('userController:backupSettings', (_, data: string) => vaulticServer.user.backupSettings(data));
	ipcMain.handle('userController:backupAppStore', (_, data: string) => vaulticServer.user.backupAppStore(data));
	ipcMain.handle('userController:backupUserPreferences', (_, data: string) => vaulticServer.user.backupUserPreferences(data));
	ipcMain.handle('userController:getUserData', () => vaulticServer.user.getUserData());
	ipcMain.handle('userController:createCheckout', () => vaulticServer.user.createCheckout());
	ipcMain.handle('userController:getChartData', (_, data: string) => vaulticServer.user.getChartData(data));
	ipcMain.handle('userController:getUserDataBreaches', (_, passwordStoreState: string) => vaulticServer.user.getUserDataBreaches(passwordStoreState));
	ipcMain.handle('userController:dismissUserDataBreach', (_, breechID: number) => vaulticServer.user.dismissUserDataBreach(breechID));
	ipcMain.handle('userController:deactivateUserSubscription', (_, email: string, deactivationKey: string) => vaulticServer.user.deactivateUserSubscription(email, deactivationKey));
	ipcMain.handle('userController:getDevices', () => vaulticServer.user.getDevices());
	ipcMain.handle('userController:reportBug', (_, descrption: string) => vaulticServer.user.reportBug(descrption));

	ipcMain.handle('filterController:add', (_, data: string) => vaulticServer.filter.add(data));
	ipcMain.handle('filterController:update', (_, data: string) => vaulticServer.filter.update(data));
	ipcMain.handle('filterController:delete', (_, data: string) => vaulticServer.filter.delete(data));

	ipcMain.handle('groupController:add', (_, data: string) => vaulticServer.group.add(data));
	ipcMain.handle('groupController:update', (_, data: string) => vaulticServer.group.update(data));
	ipcMain.handle('groupController:delete', (_, data: string) => vaulticServer.group.delete(data));

	ipcMain.handle('passwordController:add', (_, data: string) => vaulticServer.password.add(data));
	ipcMain.handle('passwordController:update', (_, data: string) => vaulticServer.password.update(data));
	ipcMain.handle('passwordController:delete', (_, data: string) => vaulticServer.password.delete(data));

	ipcMain.handle('valueController:add', (_, data: string) => vaulticServer.value.add(data));
	ipcMain.handle('valueController:update', (_, data: string) => vaulticServer.value.update(data));
	ipcMain.handle('valueController:delete', (_, data: string) => vaulticServer.value.delete(data));
	ipcMain.handle('valueController:generateRandomPhrase', (_, length: number) => vaulticServer.value.generateRandomPhrase(length));

	ipcMain.handle('cryptUtility:encrypt', (_, key: string, value: string) => cryptUtility.encrypt(key, value));
	ipcMain.handle('cryptUtility:decrypt', (_, key: string, value: string) => cryptUtility.decrypt(key, value));

	ipcMain.handle('hashUtility:hash', (_, value, salt) => hashUtility.hash(value, salt));
	ipcMain.handle('hashUtility:insecureHash', (_, value) => hashUtility.insecureHash(value));

	ipcMain.handle('generatorUtility:uniqueId', () => generatorUtility.uniqueId());
	ipcMain.handle('generatorUtility:randomValue', (_, length: number) => generatorUtility.randomValue(length));
	ipcMain.handle('generatorUtility:randomPassword', (_, length: number) => generatorUtility.randomPassword(length));

	ipcMain.handle('validationHelper:isWeak', (_, value: string, type: string) => validationHelper.isWeak(value, type));
	ipcMain.handle('validationHelper:containsNumber', (_, value: string) => validationHelper.containsNumber(value));
	ipcMain.handle('validationHelper:containsSpecialCharacter', (_, value: string) => validationHelper.containsSpecialCharacter(value));
	ipcMain.handle('validationHelper:containsUppercaseAndLowercaseNumber', (_, value: string) => validationHelper.containsUppercaseAndLowercaseNumber(value));

	ipcMain.handle('vaulticHelper:downloadDeactivationKey', () => vaulticHelper.downloadDeactivationKey());

	ipcMain.handle('appFile:exists', () => vaulticFiles.app.exists());
	ipcMain.handle('appFile:read', () => vaulticFiles.app.read());
	ipcMain.handle('appFile:write', (_, data: string) => vaulticFiles.app.write(data));

	ipcMain.handle('settingsFile:exists', () => vaulticFiles.settings.exists());
	ipcMain.handle('settingsFile:read', () => vaulticFiles.settings.read());
	ipcMain.handle('settingsFile:write', (_, data: string) => vaulticFiles.settings.write(data));

	ipcMain.handle('passwordFile:exists', () => vaulticFiles.password.exists());
	ipcMain.handle('passwordFile:read', () => vaulticFiles.password.read());
	ipcMain.handle('passwordFile:write', (_, data: string) => vaulticFiles.password.write(data));

	ipcMain.handle('valueFile:exists', () => vaulticFiles.value.exists());
	ipcMain.handle('valueFile:read', () => vaulticFiles.value.read());
	ipcMain.handle('valueFile:write', (_, data: string) => vaulticFiles.value.write(data));

	ipcMain.handle('filterFile:exists', () => vaulticFiles.filter.exists());
	ipcMain.handle('filterFile:read', () => vaulticFiles.filter.read());
	ipcMain.handle('filterFile:write', (_, data: string) => vaulticFiles.filter.write(data));

	ipcMain.handle('groupFile:exists', () => vaulticFiles.group.exists());
	ipcMain.handle('groupFile:read', () => vaulticFiles.group.read());
	ipcMain.handle('groupFile:write', (_, data: string) => vaulticFiles.group.write(data));

	ipcMain.handle('userPreferencesFile:exists', () => vaulticFiles.userPreferences.exists());
	ipcMain.handle('userPreferencesFile:read', () => vaulticFiles.userPreferences.read());
	ipcMain.handle('userPreferencesFile:write', (_, data: string) => vaulticFiles.userPreferences.write(data));
}
