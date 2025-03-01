import { ipcMain } from "electron";
import { getDeviceInfo } from "./Objects/DeviceInfo";
import vaulticServer from "./Core/Server/VaulticServer";
import generatorUtility from "./Utilities/Generator";
import validationHelper from "./Core/Helpers/ValidationHelper";
import vaulticHelper from "./Helpers/VaulticHelper";
import { environment } from "./Core/Environment";
import serverHelper from "./Core/Helpers/ServerHelper";
import { safeBackupData } from "./Core/Helpers/RepositoryHelper";
import { CondensedVaultData, UserData } from "@vaultic/shared/Types/Entities";
import { ServerAllowSharingFrom } from "@vaultic/shared/Types/ClientServerTypes";
import { BreachRequestVault } from "@vaultic/shared/Types/DataTypes";
import { RandomValueType } from "@vaultic/shared/Types/Fields";
import { RequireMFAOn, RequiresMFA } from "@vaultic/shared/Types/Device";

export default function setupIPC()
{
	ipcMain.handle('device:info', (e) => validateSender(e, () => getDeviceInfo()));

	ipcMain.handle('appController:log', (e, exception: string, message: string) => validateSender(e, () => vaulticServer.app.log(exception, message)));

	ipcMain.handle('sessionController:expire', (e) => validateSender(e, () => vaulticServer.session.expire()));
	ipcMain.handle('sessionController:extend', (e) => validateSender(e, () => vaulticServer.session.extend()));

	ipcMain.handle('userController:validateEmail', (e, email: string) => validateSender(e, () => vaulticServer.user.validateEmail(email)));
	ipcMain.handle('userController:verifyEmail', (e, pendingUserToken: string, emailVerificationCode: string) => validateSender(e, () => vaulticServer.user.verifyEmail(pendingUserToken, emailVerificationCode)));
	ipcMain.handle('userController:getDevices', (e) => validateSender(e, () => vaulticServer.user.getDevices()));
	ipcMain.handle('userController:registerDevice', (e, name: string, requiresMFA: RequiresMFA) => validateSender(e, () => vaulticServer.user.registerDevice(name, requiresMFA)));
	ipcMain.handle('userController:updateDevice', (e, name: string, requiresMFA: RequiresMFA, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => vaulticServer.user.updateDevice(name, requiresMFA, desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:deleteDevice', (e, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => vaulticServer.user.deleteDevice(desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:createCheckout', (e) => validateSender(e, () => vaulticServer.user.createCheckout()));
	ipcMain.handle('userController:getChartData', (e, data: string) => validateSender(e, () => vaulticServer.user.getChartData(data)));
	ipcMain.handle('userController:deactivateUserSubscription', (e, email: string, deactivationKey: string) => validateSender(e, () => vaulticServer.user.deactivateUserSubscription(email, deactivationKey)));
	ipcMain.handle('userController:reportBug', (e, descrption: string) => validateSender(e, () => vaulticServer.user.reportBug(descrption)));
	ipcMain.handle('userController:getSettings', (e) => validateSender(e, () => vaulticServer.user.getSettings()));
	ipcMain.handle('userController:updateSettings', (e, username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: ServerAllowSharingFrom, addedAllowSharingFrom?: number[], removedAllowSharingFrom?: number[], requireMFAOn?: RequireMFAOn) => validateSender(e, () => vaulticServer.user.updateSettings(username, allowSharedVaultsFromOthers, allowSharingFrom, addedAllowSharingFrom, removedAllowSharingFrom, requireMFAOn)));
	ipcMain.handle('userController:searchForUsers', (e, username: string, excludedUserIDs: string) => validateSender(e, () => vaulticServer.user.searchForUsers(username, excludedUserIDs)));
	ipcMain.handle('userController:getMFAKey', (e) => validateSender(e, () => vaulticServer.user.getMFAKey()));
	ipcMain.handle('userController:getUserInfo', (e) => validateSender(e, () => vaulticServer.user.getUserInfo()));

	ipcMain.handle('vaultController:getMembers', (e, userOrganizationID: number, userVaultID: number) => validateSender(e, () => vaulticServer.vault.getMembers(userOrganizationID, userVaultID)));
	ipcMain.handle('vaultController:getVaultDataBreaches', (e, getVaultDataBreachesData: string) => validateSender(e, () => vaulticServer.vault.getVaultDataBreaches(getVaultDataBreachesData)));
	ipcMain.handle('vaultController:checkPasswordForBreach', (e, checkPasswordForBreachData: string) => validateSender(e, () => vaulticServer.vault.checkPasswordForBreach(checkPasswordForBreachData)));
	ipcMain.handle('vaultController:dismissVaultDataBreach', (e, userOrganizaitonID: number, vaultID: number, vaultDataBreachID: number) => validateSender(e, () => vaulticServer.vault.dismissVaultDataBreach(userOrganizaitonID, vaultID, vaultDataBreachID)));
	ipcMain.handle('vaultController:clearDataBreaches', (e, vaults: BreachRequestVault[]) => validateSender(e, () => vaulticServer.vault.clearDataBreaches(vaults)));

	ipcMain.handle('organizationController:getOrganizations', (e) => validateSender(e, () => vaulticServer.organization.getOrganizations()));
	ipcMain.handle('organizationController:createOrganization', (e, masterKey: string, createOrganizationData: string) => validateSender(e, () => vaulticServer.organization.createOrganization(masterKey, createOrganizationData)));
	ipcMain.handle('organizationController:updateOrganization', (e, masterKey: string, updateOrganizationData: string) => validateSender(e, () => vaulticServer.organization.updateOrganization(masterKey, updateOrganizationData)));
	ipcMain.handle('organizationController:deleteOrganization', (e, organizationID: number) => validateSender(e, () => vaulticServer.organization.deleteOrganization(organizationID)));

	ipcMain.handle('cryptUtility:symmetricEncrypt', (e, key: string, value: string) => validateSender(e, () => environment.utilities.crypt.symmetricEncrypt(key, value)));
	ipcMain.handle('cryptUtility:symmetricDecrypt', (e, key: string, value: string) => validateSender(e, () => environment.utilities.crypt.symmetricDecrypt(key, value)));
	ipcMain.handle('cryptUtility:ECEncrypt', (e, recipientPublicKey: string, value: string) => validateSender(e, () => environment.utilities.crypt.ECEncrypt(recipientPublicKey, value)));
	ipcMain.handle('cryptUtility:ECDecrypt', (e, tempPublicKey: string, usersPrivateKey: string, value: string) =>
		validateSender(e, () => environment.utilities.crypt.ECDecrypt(tempPublicKey, usersPrivateKey, value)));

	ipcMain.handle('generatorUtility:uniqueId', (e) => validateSender(e, () => generatorUtility.uniqueId()));
	ipcMain.handle('generatorUtility:generateRandomPasswordOrPassphrase', (e, type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => validateSender(e, () => generatorUtility.generateRandomPasswordOrPassphrase(type, length, includeNumbers, includeSpecialCharacters, includeAbmiguousCharacters, passphraseSeperator)));
	ipcMain.handle('generatorUtility:ECKeys', (e) => validateSender(e, () => generatorUtility.ECKeys()));

	ipcMain.handle('validationHelper:isWeak', (e, value: string, type: string) => validateSender(e, () => validationHelper.isWeak(value, type)));
	ipcMain.handle('validationHelper:containsNumber', (e, value: string) => validateSender(e, () => validationHelper.containsNumber(value)));
	ipcMain.handle('validationHelper:containsSpecialCharacter', (e, value: string) => validateSender(e, () => validationHelper.containsSpecialCharacter(value)));
	ipcMain.handle('validationHelper:containsUppercaseAndLowercaseNumber', (e, value: string) => validateSender(e, () => validationHelper.containsUppercaseAndLowercaseNumber(value)));

	ipcMain.handle('vaulticHelper:downloadDeactivationKey', (e) => validateSender(e, () => vaulticHelper.downloadDeactivationKey()));
	ipcMain.handle('vaulticHelper:readCSV', (e) => validateSender(e, () => vaulticHelper.readCSV()));
	ipcMain.handle('vaulticHelper:writeCSV', (e, fileName: string, data: string) => validateSender(e, () => vaulticHelper.writeCSV(fileName, data)));

	ipcMain.handle('serverHelper:registerUser', (e, masterKey: string, pendingUserToken: string, firstName: string, lastName: string) => validateSender(e, () => serverHelper.registerUser(masterKey, pendingUserToken, firstName, lastName)));
	ipcMain.handle('serverHelper:logUserIn', (e, masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean, mfaCode?: string) => validateSender(e, () => serverHelper.logUserIn(masterKey, email, firstLogin, reloadAllData, mfaCode)));

	ipcMain.handle('repositoryHelper:backupData', (e, masterKey: string) => validateSender(e, () => safeBackupData(masterKey)));

	ipcMain.handle('userRepository:getLastUsedUserInfo', (e) => validateSender(e, () => environment.repositories.users.getLastUsedUserInfo()));
	ipcMain.handle('userRepository:getLastUsedUserPreferences', (e) => validateSender(e, () => environment.repositories.users.getLastUsedUserPreferences()));
	ipcMain.handle('userRepository:createUser', (e, masterKey: string, email: string, firstName: string, lastName: string) => validateSender(e, () => environment.repositories.users.createUser(masterKey, email, firstName, lastName)));
	ipcMain.handle('userRepository:setCurrentUser', (e, masterKey: string, email: string) => validateSender(e, () => environment.repositories.users.setCurrentUser(masterKey, email)));
	ipcMain.handle('userRepository:getCurrentUserData', (e, masterKey: string) => validateSender(e, () => environment.repositories.users.getCurrentUserData(masterKey)));
	ipcMain.handle('userRepository:verifyUserMasterKey', (e, masterKey: string, email?: string, isVaulticKey?: boolean) => validateSender(e, () => environment.repositories.users.verifyUserMasterKey(masterKey, email, isVaulticKey)));
	ipcMain.handle('userRepository:saveUser', (e, masterKey: string, newData: string, currentData: string) => validateSender(e, () => environment.repositories.users.saveUser(masterKey, newData, currentData)));
	ipcMain.handle('userRepository:getStoreStates', (e, masterKey: string, storeStatesToRetrive: UserData) => validateSender(e, () => environment.repositories.users.getStoreStates(masterKey, storeStatesToRetrive)));
	ipcMain.handle('userRepository:getValidMasterKey', (e) => validateSender(e, () => environment.repositories.users.getValidMasterKey()));

	ipcMain.handle('vaultRepository:updateVault', (e, masterKey: string, updateVaultData: string) => validateSender(e, () => environment.repositories.vaults.updateVault(masterKey, updateVaultData)));
	ipcMain.handle('vaultRepository:setActiveVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => environment.repositories.vaults.setActiveVault(masterKey, userVaultID)));
	ipcMain.handle('vaultRepository:saveVaultData', (e, masterKey: string, userVaultID: number, newData: string, currentData?: string) => validateSender(e, () => environment.repositories.vaults.saveVaultData(masterKey, userVaultID, newData, currentData)));
	ipcMain.handle('vaultRepository:createNewVaultForUser', (e, masterKey: string, updateVaultData: string) => validateSender(e, () => environment.repositories.vaults.createNewVaultForUser(masterKey, updateVaultData)));
	ipcMain.handle('vaultRepository:getStoreStates', (e, masterKey: string, userVaultID: number, storeStatesToRetrive: CondensedVaultData) => validateSender(e, () => environment.repositories.vaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrive)));
	ipcMain.handle('vaultRepository:deleteVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => environment.repositories.vaults.deleteVault(masterKey, userVaultID)));
	ipcMain.handle('vaultRepository:syncVaults', (e, masterKey: string) => validateSender(e, () => environment.repositories.vaults.syncVaults(masterKey)));

	ipcMain.handle('userVaultRepository:saveUserVault', (e, masterKey: string, userVaultID: number, newData: string, currentData: string) => validateSender(e, () => environment.repositories.userVaults.saveUserVault(masterKey, userVaultID, newData, currentData)));
	ipcMain.handle('userVaultRepository:getStoreStates', (e, masterKey: string, userVaultID: number, storeStatesToRetrive: CondensedVaultData) => validateSender(e, () => environment.repositories.userVaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrive)));

	ipcMain.handle('logRepository:getExportableLogData', (e) => validateSender(e, () => environment.repositories.logs.getExportableLogData()));
	ipcMain.handle('logRepository:log', (e) => validateSender(e, (errorCode?: number, message?: string, callStack?: string) => environment.repositories.logs.log(errorCode, message, callStack)));

	ipcMain.handle('environment:isTest', (e) => validateSender(e, () => environment.isTest));
	ipcMain.handle('environment:failedToInitalizeDatabase', (e) => validateSender(e, () => environment.failedToInitalizeDatabase));
	ipcMain.handle('environment:recreateDatabase', (e) => validateSender(e, () => environment.recreateDatabase()));
	ipcMain.handle('environment:hasConnection', (e) => validateSender(e, () => environment.hasConnection()));

	ipcMain.handle('cache:clear', (e) => validateSender(e, () => environment.cache.clear()));
	ipcMain.handle('cache:setMasterKey', (e, masterKey: string) => validateSender(e, () => environment.cache.setMasterKey(masterKey)));
	ipcMain.handle('cache:clearMasterKey', (e) => validateSender(e, () => environment.cache.clearMasterKey()));
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
