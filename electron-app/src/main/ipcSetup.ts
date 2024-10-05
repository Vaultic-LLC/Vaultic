import { ipcMain } from "electron";
import hashUtility from "./Utilities/HashUtility";
import { getDeviceInfo } from "./Objects/DeviceInfo";
import vaulticServer from "./Core/Server/VaulticServer";
import cryptUtility from "./Utilities/CryptUtility";
import generatorUtility from "./Utilities/Generator";
import validationHelper from "./Core/Helpers/ValidationHelper";
import vaulticHelper from "./Helpers/VaulticHelper";
import { environment } from "./Core/Environment";
import serverHelper from "./Core/Helpers/ServerHelper";

export default function setupIPC()
{
	ipcMain.handle('device:info', (e) => validateSender(e, () => getDeviceInfo()));

	ipcMain.handle('appController:log', (e, exception: string, message: string) => validateSender(e, () => vaulticServer.app.log(exception, message)));

	ipcMain.handle('sessionController:expire', (e) => validateSender(e, () => vaulticServer.session.expire()));

	ipcMain.handle('userController:validateEmail', (e, email: string) => validateSender(e, () => vaulticServer.user.validateEmail(email)));
	ipcMain.handle('userController:deleteDevice', (e, masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => vaulticServer.user.deleteDevice(masterKey, desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:createCheckout', (e) => validateSender(e, () => vaulticServer.user.createCheckout()));
	ipcMain.handle('userController:getChartData', (e, data: string) => validateSender(e, () => vaulticServer.user.getChartData(data)));
	ipcMain.handle('userController:getUserDataBreaches', (e, passwordStoreState: string) => validateSender(e, () => vaulticServer.user.getUserDataBreaches(passwordStoreState)));
	ipcMain.handle('userController:dismissUserDataBreach', (e, breechID: number) => validateSender(e, () => vaulticServer.user.dismissUserDataBreach(breechID)));
	ipcMain.handle('userController:deactivateUserSubscription', (e, email: string, deactivationKey: string) => validateSender(e, () => vaulticServer.user.deactivateUserSubscription(email, deactivationKey)));
	ipcMain.handle('userController:getDevices', (e) => validateSender(e, () => vaulticServer.user.getDevices()));
	ipcMain.handle('userController:reportBug', (e, descrption: string) => validateSender(e, () => vaulticServer.user.reportBug(descrption)));

	ipcMain.handle('valueController:generateRandomPhrase', (e, length: number) => validateSender(e, () => vaulticServer.value.generateRandomPhrase(length)));

	ipcMain.handle('vaultController:deleteVault', (e, userVaultID: number) => validateSender(e, () => vaulticServer.vault.deleteVault(userVaultID)));

	ipcMain.handle('cryptUtility:encrypt', (e, key: string, value: string) => validateSender(e, () => cryptUtility.encrypt(key, value)));
	ipcMain.handle('cryptUtility:decrypt', (e, key: string, value: string) => validateSender(e, () => cryptUtility.decrypt(key, value)));
	ipcMain.handle('cryptUtility:ECEncrypt', (e, recipientPublicKey: string, value: string) => validateSender(e, () => cryptUtility.ECEncrypt(recipientPublicKey, value)));
	ipcMain.handle('cryptUtility:ECDecrypt', (e, tempPublicKey: string, usersPrivateKey: string, value: string) =>
		validateSender(e, () => cryptUtility.ECDecrypt(tempPublicKey, usersPrivateKey, value)));

	ipcMain.handle('hashUtility:hash', (e, value, salt) => validateSender(e, () => hashUtility.hash(value, salt)));
	ipcMain.handle('hashUtility:insecureHash', (e, value) => validateSender(e, () => hashUtility.insecureHash(value)));
	ipcMain.handle('hashUtility:compareHashes', (e, a, b) => validateSender(e, () => hashUtility.compareHashes(a, b)));

	ipcMain.handle('generatorUtility:uniqueId', (e) => validateSender(e, () => generatorUtility.uniqueId()));
	ipcMain.handle('generatorUtility:randomValue', (e, length: number) => validateSender(e, () => generatorUtility.randomValue(length)));
	ipcMain.handle('generatorUtility:randomPassword', (e, length: number) => validateSender(e, () => generatorUtility.randomPassword(length)));
	ipcMain.handle('generatorUtility:ECKeys', (e) => validateSender(e, () => generatorUtility.ECKeys()));

	ipcMain.handle('validationHelper:isWeak', (e, value: string, type: string) => validateSender(e, () => validationHelper.isWeak(value, type)));
	ipcMain.handle('validationHelper:containsNumber', (e, value: string) => validateSender(e, () => validationHelper.containsNumber(value)));
	ipcMain.handle('validationHelper:containsSpecialCharacter', (e, value: string) => validateSender(e, () => validationHelper.containsSpecialCharacter(value)));
	ipcMain.handle('validationHelper:containsUppercaseAndLowercaseNumber', (e, value: string) => validateSender(e, () => validationHelper.containsUppercaseAndLowercaseNumber(value)));

	ipcMain.handle('vaulticHelper:downloadDeactivationKey', (e) => validateSender(e, () => vaulticHelper.downloadDeactivationKey()));
	ipcMain.handle('vaulticHelper:readCSV', (e) => validateSender(e, () => vaulticHelper.readCSV()));
	ipcMain.handle('vaulticHelper:writeCSV', (e, fileName: string, data: string) => validateSender(e, () => vaulticHelper.writeCSV(fileName, data)));

	ipcMain.handle('serverHelper:registerUser', (e, masterKey: string, email: string, firstName: string, lastName: string) =>
		validateSender(e, () => serverHelper.registerUser(masterKey, email, firstName, lastName)));
	ipcMain.handle('serverHelper:logUserIn', (e, masterKey: string, email: string, firstLogin: boolean) =>
		validateSender(e, () => serverHelper.logUserIn(masterKey, email, firstLogin)));

	ipcMain.handle('userRepository:getLastUsedUserEmail', (e) => validateSender(e, () => environment.repositories.users.getLastUsedUserEmail()));
	ipcMain.handle('userRepository:getLastUsedUserPreferences', (e) => validateSender(e, () => environment.repositories.users.getLastUsedUserPreferences()));
	ipcMain.handle('userRepository:createUser', (e, masterKey: string, email: string) => validateSender(e, () => environment.repositories.users.createUser(masterKey, email)));
	ipcMain.handle('userRepository:getCurrentUserData', (e, masterKey: string) => validateSender(e, () => environment.repositories.users.getCurrentUserData(masterKey)));
	ipcMain.handle('userRepository:verifyUserMasterKey', (e, masterKey: string, email?: string) => validateSender(e, () => environment.repositories.users.verifyUserMasterKey(masterKey, email)));
	ipcMain.handle('userRepository:saveUser', (e, masterKey: string, data: string, backup: boolean) => validateSender(e, () => environment.repositories.users.saveUser(masterKey, data, backup)));

	ipcMain.handle('vaultRepository:setActiveVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => environment.repositories.vaults.setActiveVault(masterKey, userVaultID)));
	ipcMain.handle('vaultRepository:saveVault', (e, masterKey: string, userVaultID: number, data: string, backup: boolean) => validateSender(e, () => environment.repositories.vaults.saveVault(masterKey, userVaultID, data, backup)));
	ipcMain.handle('vaultRepository:createNewVaultForUser', (e, masterKey: string, name: string, setAsActive: boolean, doBackup: boolean) => validateSender(e, () => environment.repositories.vaults.createNewVaultForUser(masterKey, name, setAsActive, doBackup)));
	ipcMain.handle('vaultRepository:archiveVault', (e, masterKey: string, userVaultID: number, backup: boolean) => validateSender(e, () => environment.repositories.vaults.archiveVault(masterKey, userVaultID, backup)));

	ipcMain.handle('userVaultRepository:saveUserVault', (e, masterKey: string, userVaultID: number, data: string, backup: boolean) => validateSender(e, () => environment.repositories.userVaults.saveUserVault(masterKey, userVaultID, data, backup)));
	ipcMain.handle('userVaultRepository:loadArchivedVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => environment.repositories.userVaults.loadArchivedVault(masterKey, userVaultID)));
	ipcMain.handle('userVaultRepository:unarchiveVault', (e, masterKey: string, userVaultID: number, select: boolean) => validateSender(e, () => environment.repositories.userVaults.unarchiveVault(masterKey, userVaultID, select)));

	ipcMain.handle('environment:isTest', (e) => validateSender(e, () => environment.isTest));

	ipcMain.handle('cache:clear', (e) => validateSender(e, () => environment.cache.clear()));
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
