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
	ipcMain.handle('device:info', (e) => validateSender(e, () => getDeviceInfo()));

	ipcMain.handle('appController:log', (e, exception: string, message: string) => validateSender(e, () => vaulticServer.app.log(exception, message)));

	ipcMain.handle('sessionController:validateEmail', (e, email: string) => validateSender(e, () => vaulticServer.session.validateEmail(email)));
	ipcMain.handle('sessionController:createAccount', (e, data: string) => validateSender(e, () => vaulticServer.session.createAccount(data)));
	ipcMain.handle('sessionController:validateEmailAndMasterKey', (e, email: string, key: string) => validateSender(e, () => vaulticServer.session.validateEmailAndMasterKey(email, key)));
	ipcMain.handle('sessionController:expire', (e) => validateSender(e, () => vaulticServer.session.expire()));

	ipcMain.handle('userController:deleteDevice', (e, masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => vaulticServer.user.deleteDevice(masterKey, desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:backupSettings', (e, data: string) => validateSender(e, () => vaulticServer.user.backupSettings(data)));
	ipcMain.handle('userController:backupAppStore', (e, data: string) => validateSender(e, () => vaulticServer.user.backupAppStore(data)));
	ipcMain.handle('userController:backupUserPreferences', (e, data: string) => validateSender(e, () => vaulticServer.user.backupUserPreferences(data)));
	ipcMain.handle('userController:getUserData', (e) => validateSender(e, () => vaulticServer.user.getUserData()));
	ipcMain.handle('userController:createCheckout', (e) => validateSender(e, () => vaulticServer.user.createCheckout()));
	ipcMain.handle('userController:getChartData', (e, data: string) => validateSender(e, () => vaulticServer.user.getChartData(data)));
	ipcMain.handle('userController:getUserDataBreaches', (e, passwordStoreState: string) => validateSender(e, () => vaulticServer.user.getUserDataBreaches(passwordStoreState)));
	ipcMain.handle('userController:dismissUserDataBreach', (e, breechID: number) => validateSender(e, () => vaulticServer.user.dismissUserDataBreach(breechID)));
	ipcMain.handle('userController:deactivateUserSubscription', (e, email: string, deactivationKey: string) => validateSender(e, () => vaulticServer.user.deactivateUserSubscription(email, deactivationKey)));
	ipcMain.handle('userController:getDevices', (e) => validateSender(e, () => vaulticServer.user.getDevices()));
	ipcMain.handle('userController:reportBug', (e, descrption: string) => validateSender(e, () => vaulticServer.user.reportBug(descrption)));

	ipcMain.handle('filterController:add', (e, data: string) => validateSender(e, () => vaulticServer.filter.add(data)));
	ipcMain.handle('filterController:update', (e, data: string) => validateSender(e, () => vaulticServer.filter.update(data)));
	ipcMain.handle('filterController:delete', (e, data: string) => validateSender(e, () => vaulticServer.filter.delete(data)));

	ipcMain.handle('groupController:add', (e, data: string) => validateSender(e, () => vaulticServer.group.add(data)));
	ipcMain.handle('groupController:update', (e, data: string) => validateSender(e, () => vaulticServer.group.update(data)));
	ipcMain.handle('groupController:delete', (e, data: string) => validateSender(e, () => vaulticServer.group.delete(data)));

	ipcMain.handle('passwordController:add', (e, data: string) => validateSender(e, () => vaulticServer.password.add(data)));
	ipcMain.handle('passwordController:update', (e, data: string) => validateSender(e, () => vaulticServer.password.update(data)));
	ipcMain.handle('passwordController:delete', (e, data: string) => validateSender(e, () => vaulticServer.password.delete(data)));

	ipcMain.handle('valueController:add', (e, data: string) => validateSender(e, () => vaulticServer.value.add(data)));
	ipcMain.handle('valueController:update', (e, data: string) => validateSender(e, () => vaulticServer.value.update(data)));
	ipcMain.handle('valueController:delete', (e, data: string) => validateSender(e, () => vaulticServer.value.delete(data)));
	ipcMain.handle('valueController:generateRandomPhrase', (e, length: number) => validateSender(e, () => vaulticServer.value.generateRandomPhrase(length)));

	ipcMain.handle('cryptUtility:encrypt', (e, key: string, value: string) => validateSender(e, () => cryptUtility.encrypt(key, value)));
	ipcMain.handle('cryptUtility:decrypt', (e, key: string, value: string) => validateSender(e, () => cryptUtility.decrypt(key, value)));

	ipcMain.handle('hashUtility:hash', (e, value, salt) => validateSender(e, () => hashUtility.hash(value, salt)));
	ipcMain.handle('hashUtility:insecureHash', (e, value) => validateSender(e, () => hashUtility.insecureHash(value)));

	ipcMain.handle('generatorUtility:uniqueId', (e) => validateSender(e, () => generatorUtility.uniqueId()));
	ipcMain.handle('generatorUtility:randomValue', (e, length: number) => validateSender(e, () => generatorUtility.randomValue(length)));
	ipcMain.handle('generatorUtility:randomPassword', (e, length: number) => validateSender(e, () => generatorUtility.randomPassword(length)));

	ipcMain.handle('validationHelper:isWeak', (e, value: string, type: string) => validateSender(e, () => validationHelper.isWeak(value, type)));
	ipcMain.handle('validationHelper:containsNumber', (e, value: string) => validateSender(e, () => validationHelper.containsNumber(value)));
	ipcMain.handle('validationHelper:containsSpecialCharacter', (e, value: string) => validateSender(e, () => validationHelper.containsSpecialCharacter(value)));
	ipcMain.handle('validationHelper:containsUppercaseAndLowercaseNumber', (e, value: string) => validateSender(e, () => validationHelper.containsUppercaseAndLowercaseNumber(value)));

	ipcMain.handle('vaulticHelper:downloadDeactivationKey', (e) => validateSender(e, () => vaulticHelper.downloadDeactivationKey()));

	ipcMain.handle('appFile:exists', (e) => validateSender(e, () => vaulticFiles.app.exists()));
	ipcMain.handle('appFile:read', (e) => validateSender(e, () => vaulticFiles.app.read()));
	ipcMain.handle('appFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.app.write(data)));

	ipcMain.handle('settingsFile:exists', (e) => validateSender(e, () => vaulticFiles.settings.exists()));
	ipcMain.handle('settingsFile:read', (e) => validateSender(e, () => vaulticFiles.settings.read()));
	ipcMain.handle('settingsFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.settings.write(data)));

	ipcMain.handle('passwordFile:exists', (e) => validateSender(e, () => vaulticFiles.password.exists()));
	ipcMain.handle('passwordFile:read', (e) => validateSender(e, () => vaulticFiles.password.read()));
	ipcMain.handle('passwordFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.password.write(data)));

	ipcMain.handle('valueFile:exists', (e) => validateSender(e, () => vaulticFiles.value.exists()));
	ipcMain.handle('valueFile:read', (e) => validateSender(e, () => vaulticFiles.value.read()));
	ipcMain.handle('valueFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.value.write(data)));

	ipcMain.handle('filterFile:exists', (e) => validateSender(e, () => vaulticFiles.filter.exists()));
	ipcMain.handle('filterFile:read', (e) => validateSender(e, () => vaulticFiles.filter.read()));
	ipcMain.handle('filterFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.filter.write(data)));

	ipcMain.handle('groupFile:exists', (e) => validateSender(e, () => vaulticFiles.group.exists()));
	ipcMain.handle('groupFile:read', (e) => validateSender(e, () => vaulticFiles.group.read()));
	ipcMain.handle('groupFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.group.write(data)));

	ipcMain.handle('userPreferencesFile:exists', (e) => validateSender(e, () => vaulticFiles.userPreferences.exists()));
	ipcMain.handle('userPreferencesFile:read', (e) => validateSender(e, () => vaulticFiles.userPreferences.read()));
	ipcMain.handle('userPreferencesFile:write', (e, data: string) => validateSender(e, () => vaulticFiles.userPreferences.write(data)));
}

function validateSender(event: Electron.IpcMainInvokeEvent, onSuccess: () => any): any
{
	// only allow requests from ourselves
	if ((new URL(event.senderFrame.url)).host === 'localhost:33633')
	{
		return onSuccess();
	}

	return undefined;
}
