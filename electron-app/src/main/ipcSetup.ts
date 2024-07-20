import { ipcMain } from "electron";
import hashUtility from "./Utilities/HashUtility";
import { getDeviceInfo } from "./Objects/DeviceInfo";
import vaulticServer from "./Core/Server/VaulticServer";
import cryptUtility from "./Utilities/CryptUtility";
import generatorUtility from "./Utilities/Generator";
import validationHelper from "./Core/Helpers/ValidationHelper";
import vaulticHelper from "./Helpers/VaulticHelper";
import getVaulticFiles from "./Objects/Files/Files";
import { environment } from "./Core/Environment";
import serverHelper from "./Core/Helpers/ServerHelper";

export default function setupIPC()
{
	ipcMain.handle('device:info', (e) => validateSender(e, () => getDeviceInfo()));

	ipcMain.handle('appController:log', (e, exception: string, message: string) => validateSender(e, () => vaulticServer.app.log(exception, message)));

	ipcMain.handle('sessionController:expire', (e) => validateSender(e, () => vaulticServer.session.expire()));

	ipcMain.handle('userController:validateEmail', (e, email: string) => validateSender(e, () => vaulticServer.user.validateEmail(email)));
	ipcMain.handle('userController:deleteDevice', (e, masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => vaulticServer.user.deleteDevice(masterKey, desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:backupStores', (e, data: string) => validateSender(e, () => vaulticServer.user.backupStores(data)));
	ipcMain.handle('userController:getUserData', (e) => validateSender(e, () => vaulticServer.user.getUserData()));
	ipcMain.handle('userController:createCheckout', (e) => validateSender(e, () => vaulticServer.user.createCheckout()));
	ipcMain.handle('userController:getChartData', (e, data: string) => validateSender(e, () => vaulticServer.user.getChartData(data)));
	ipcMain.handle('userController:getUserDataBreaches', (e, passwordStoreState: string) => validateSender(e, () => vaulticServer.user.getUserDataBreaches(passwordStoreState)));
	ipcMain.handle('userController:dismissUserDataBreach', (e, breechID: number) => validateSender(e, () => vaulticServer.user.dismissUserDataBreach(breechID)));
	ipcMain.handle('userController:deactivateUserSubscription', (e, email: string, deactivationKey: string) => validateSender(e, () => vaulticServer.user.deactivateUserSubscription(email, deactivationKey)));
	ipcMain.handle('userController:getDevices', (e) => validateSender(e, () => vaulticServer.user.getDevices()));
	ipcMain.handle('userController:reportBug', (e, descrption: string) => validateSender(e, () => vaulticServer.user.reportBug(descrption)));

	ipcMain.handle('valueController:generateRandomPhrase', (e, length: number) => validateSender(e, () => vaulticServer.value.generateRandomPhrase(length)));

	ipcMain.handle('cryptUtility:encrypt', (e, key: string, value: string) => validateSender(e, () => cryptUtility.encrypt(key, value)));
	ipcMain.handle('cryptUtility:decrypt', (e, key: string, value: string) => validateSender(e, () => cryptUtility.decrypt(key, value)));

	ipcMain.handle('hashUtility:hash', (e, value, salt) => validateSender(e, () => hashUtility.hash(value, salt)));
	ipcMain.handle('hashUtility:insecureHash', (e, value) => validateSender(e, () => hashUtility.insecureHash(value)));
	ipcMain.handle('hashUtility:compareHashes', (e, a, b) => validateSender(e, () => hashUtility.compareHashes(a, b)));

	ipcMain.handle('generatorUtility:uniqueId', (e) => validateSender(e, () => generatorUtility.uniqueId()));
	ipcMain.handle('generatorUtility:randomValue', (e, length: number) => validateSender(e, () => generatorUtility.randomValue(length)));
	ipcMain.handle('generatorUtility:randomPassword', (e, length: number) => validateSender(e, () => generatorUtility.randomPassword(length)));

	ipcMain.handle('validationHelper:isWeak', (e, value: string, type: string) => validateSender(e, () => validationHelper.isWeak(value, type)));
	ipcMain.handle('validationHelper:containsNumber', (e, value: string) => validateSender(e, () => validationHelper.containsNumber(value)));
	ipcMain.handle('validationHelper:containsSpecialCharacter', (e, value: string) => validateSender(e, () => validationHelper.containsSpecialCharacter(value)));
	ipcMain.handle('validationHelper:containsUppercaseAndLowercaseNumber', (e, value: string) => validateSender(e, () => validationHelper.containsUppercaseAndLowercaseNumber(value)));

	ipcMain.handle('vaulticHelper:downloadDeactivationKey', (e) => validateSender(e, () => vaulticHelper.downloadDeactivationKey()));
	ipcMain.handle('vaulticHelper:readCSV', (e) => validateSender(e, () => vaulticHelper.readCSV()));
	ipcMain.handle('vaulticHelper:writeCSV', (e, fileName: string, data: string) => validateSender(e, () => vaulticHelper.writeCSV(fileName, data)));

	ipcMain.handle('serverHelper:registerUser', (e, masterKey: string, email: string, firstName: string, lastName: string) =>
		validateSender(e, () => serverHelper.registerUser(masterKey, email, firstName, lastName)));
	ipcMain.handle('serverHelper:logUserIn', (e, masterKey: string, email: string) =>
		validateSender(e, () => serverHelper.logUserIn(masterKey, email)));

	ipcMain.handle('appFile:exists', (e) => validateSender(e, () => getVaulticFiles().app.exists()));
	ipcMain.handle('appFile:read', (e) => validateSender(e, () => getVaulticFiles().app.read()));
	ipcMain.handle('appFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().app.write(data)));

	ipcMain.handle('settingsFile:exists', (e) => validateSender(e, () => getVaulticFiles().settings.exists()));
	ipcMain.handle('settingsFile:read', (e) => validateSender(e, () => getVaulticFiles().settings.read()));
	ipcMain.handle('settingsFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().settings.write(data)));

	ipcMain.handle('passwordFile:exists', (e) => validateSender(e, () => getVaulticFiles().password.exists()));
	ipcMain.handle('passwordFile:read', (e) => validateSender(e, () => getVaulticFiles().password.read()));
	ipcMain.handle('passwordFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().password.write(data)));

	ipcMain.handle('valueFile:exists', (e) => validateSender(e, () => getVaulticFiles().value.exists()));
	ipcMain.handle('valueFile:read', (e) => validateSender(e, () => getVaulticFiles().value.read()));
	ipcMain.handle('valueFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().value.write(data)));

	ipcMain.handle('filterFile:exists', (e) => validateSender(e, () => getVaulticFiles().filter.exists()));
	ipcMain.handle('filterFile:read', (e) => validateSender(e, () => getVaulticFiles().filter.read()));
	ipcMain.handle('filterFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().filter.write(data)));

	ipcMain.handle('groupFile:exists', (e) => validateSender(e, () => getVaulticFiles().group.exists()));
	ipcMain.handle('groupFile:read', (e) => validateSender(e, () => getVaulticFiles().group.read()));
	ipcMain.handle('groupFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().group.write(data)));

	ipcMain.handle('userPreferencesFile:exists', (e) => validateSender(e, () => getVaulticFiles().userPreferences.exists()));
	ipcMain.handle('userPreferencesFile:read', (e) => validateSender(e, () => getVaulticFiles().userPreferences.read()));
	ipcMain.handle('userPreferencesFile:write', (e, data: string) => validateSender(e, () => getVaulticFiles().userPreferences.write(data)));

	ipcMain.handle('environment:isTest', (e) => validateSender(e, () => environment.isTest));
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
