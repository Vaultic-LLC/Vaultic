import { ipcMain } from "electron";
import { getDeviceInfo } from "./Objects/DeviceInfo";
import { CondensedVaultData, UserData } from "@vaultic/shared/Types/Entities";
import { ServerAllowSharingFrom } from "@vaultic/shared/Types/ClientServerTypes";
import { RandomValueType } from "@vaultic/shared/Types/Fields";
import { RequireMFAOn, RequiresMFA } from "@vaultic/shared/Types/Device";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import vaulticHelper from "./Helpers/VaulticHelper";
import generatorUtility from "./Utilities/Generator";
import { coreAPIResolver } from "./Core/CoreAPIResolver";

export default function setupIPC()
{
	ipcMain.handle('device:info', (e) => validateSender(e, () => getDeviceInfo()));

	ipcMain.handle('appController:log', (e, exception: string, message: string) => validateSender(e, () => coreAPIResolver.server.app.log(exception, message)));

	ipcMain.handle('sessionController:expire', (e) => validateSender(e, () => coreAPIResolver.server.session.expire()));
	ipcMain.handle('sessionController:extend', (e) => validateSender(e, () => coreAPIResolver.server.session.extend()));

	ipcMain.handle('userController:validateEmail', (e, email: string) => validateSender(e, () => coreAPIResolver.server.user.validateEmail(email)));
	ipcMain.handle('userController:verifyEmail', (e, pendingUserToken: string, emailVerificationCode: string) => validateSender(e, () => coreAPIResolver.server.user.verifyEmail(pendingUserToken, emailVerificationCode)));
	ipcMain.handle('userController:getDevices', (e) => validateSender(e, () => coreAPIResolver.server.user.getDevices()));
	ipcMain.handle('userController:registerDevice', (e, name: string, requiresMFA: RequiresMFA) => validateSender(e, () => coreAPIResolver.server.user.registerDevice(name, requiresMFA)));
	ipcMain.handle('userController:updateDevice', (e, name: string, requiresMFA: RequiresMFA, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => coreAPIResolver.server.user.updateDevice(name, requiresMFA, desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:deleteDevice', (e, desktopDeviceID?: number, mobileDeviceID?: number) => validateSender(e, () => coreAPIResolver.server.user.deleteDevice(desktopDeviceID, mobileDeviceID)));
	ipcMain.handle('userController:createCheckout', (e) => validateSender(e, () => coreAPIResolver.server.user.createCheckout()));
	ipcMain.handle('userController:getChartData', (e, data: string) => validateSender(e, () => coreAPIResolver.server.user.getChartData(data)));
	ipcMain.handle('userController:deactivateUserSubscription', (e, email: string, deactivationKey: string) => validateSender(e, () => coreAPIResolver.server.user.deactivateUserSubscription(email, deactivationKey)));
	ipcMain.handle('userController:reportBug', (e, description: string) => validateSender(e, () => coreAPIResolver.server.user.reportBug(description)));
	ipcMain.handle('userController:getSettings', (e) => validateSender(e, () => coreAPIResolver.server.user.getSettings()));
	ipcMain.handle('userController:updateSettings', (e, username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: ServerAllowSharingFrom, addedAllowSharingFrom?: number[], removedAllowSharingFrom?: number[], requireMFAOn?: RequireMFAOn) => validateSender(e, () => coreAPIResolver.server.user.updateSettings(username, allowSharedVaultsFromOthers, allowSharingFrom, addedAllowSharingFrom, removedAllowSharingFrom, requireMFAOn)));
	ipcMain.handle('userController:searchForUsers', (e, username: string, excludedUserIDs: string) => validateSender(e, () => coreAPIResolver.server.user.searchForUsers(username, excludedUserIDs)));
	ipcMain.handle('userController:getMFAKey', (e) => validateSender(e, () => coreAPIResolver.server.user.getMFAKey()));
	ipcMain.handle('userController:getUserInfo', (e) => validateSender(e, () => coreAPIResolver.server.user.getUserInfo()));
	ipcMain.handle('userController:startEmailVerification', (e, email: string) => validateSender(e, () => coreAPIResolver.server.user.startEmailVerification(email)));
	ipcMain.handle('userController:finishEmailVerification', (e, verificationCode: string) => validateSender(e, () => coreAPIResolver.server.user.finishEmailVerification(verificationCode)));

	ipcMain.handle('vaultController:getMembers', (e, userOrganizationID: number, vaultID: number) => validateSender(e, () => coreAPIResolver.server.vault.getMembers(userOrganizationID, vaultID)));
	ipcMain.handle('vaultController:getVaultDataBreaches', (e, getVaultDataBreachesData: string) => validateSender(e, () => coreAPIResolver.server.vault.getVaultDataBreaches(getVaultDataBreachesData)));
	ipcMain.handle('vaultController:checkPasswordsForBreach', (e, checkPasswordForBreachData: string) => validateSender(e, () => coreAPIResolver.server.vault.checkPasswordsForBreach(checkPasswordForBreachData)));
	ipcMain.handle('vaultController:dismissVaultDataBreach', (e, userOrganizaitonID: number, vaultID: number, vaultDataBreachID: number) => validateSender(e, () => coreAPIResolver.server.vault.dismissVaultDataBreach(userOrganizaitonID, vaultID, vaultDataBreachID)));

	ipcMain.handle('organizationController:getOrganizations', (e) => validateSender(e, () => coreAPIResolver.server.organization.getOrganizations()));
	ipcMain.handle('organizationController:createOrganization', (e, masterKey: string, createOrganizationData: string) => validateSender(e, () => coreAPIResolver.server.organization.createOrganization(masterKey, createOrganizationData)));
	ipcMain.handle('organizationController:updateOrganization', (e, masterKey: string, updateOrganizationData: string) => validateSender(e, () => coreAPIResolver.server.organization.updateOrganization(masterKey, updateOrganizationData)));
	ipcMain.handle('organizationController:deleteOrganization', (e, organizationID: number) => validateSender(e, () => coreAPIResolver.server.organization.deleteOrganization(organizationID)));

	ipcMain.handle('cryptUtility:symmetricEncrypt', (e, key: string, value: string) => validateSender(e, () => coreAPIResolver.utilities.crypt.symmetricEncrypt(key, value)));
	ipcMain.handle('cryptUtility:symmetricDecrypt', (e, key: string, value: string) => validateSender(e, () => coreAPIResolver.utilities.crypt.symmetricDecrypt(key, value)));
	ipcMain.handle('cryptUtility:ECEncrypt', (e, recipientPublicKey: string, value: string) => validateSender(e, () => coreAPIResolver.utilities.crypt.ECEncrypt(recipientPublicKey, value)));
	ipcMain.handle('cryptUtility:ECDecrypt', (e, tempPublicKey: string, usersPrivateKey: string, value: string) =>
		validateSender(e, () => coreAPIResolver.utilities.crypt.ECDecrypt(tempPublicKey, usersPrivateKey, value)));

	ipcMain.handle('generatorUtility:uniqueId', (e) => validateSender(e, () => generatorUtility.uniqueId()));
	ipcMain.handle('generatorUtility:generateRandomPasswordOrPassphrase', (e, type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => validateSender(e, () => coreAPIResolver.utilities.generator.generateRandomPasswordOrPassphrase(type, length, includeNumbers, includeSpecialCharacters, includeAbmiguousCharacters, passphraseSeperator)));
	ipcMain.handle('generatorUtility:ECKeys', (e) => validateSender(e, () => coreAPIResolver.utilities.generator.ECKeys()));

	ipcMain.handle('hashUtility:hash', (e, algorithm: Algorithm, value: string, salt?: string) => validateSender(e, () => coreAPIResolver.utilities.hash.hash(algorithm, value, salt)));

	ipcMain.handle('validationHelper:isWeak', (e, value: string) => validateSender(e, () => coreAPIResolver.helpers.validation.isWeak(value)));
	ipcMain.handle('validationHelper:containsNumber', (e, value: string) => validateSender(e, () => coreAPIResolver.helpers.validation.containsNumber(value)));
	ipcMain.handle('validationHelper:containsSpecialCharacter', (e, value: string) => validateSender(e, () => coreAPIResolver.helpers.validation.containsSpecialCharacter(value)));
	ipcMain.handle('validationHelper:containsUppercaseAndLowercaseNumber', (e, value: string) => validateSender(e, () => coreAPIResolver.helpers.validation.containsUppercaseAndLowercaseNumber(value)));

	ipcMain.handle('vaulticHelper:downloadDeactivationKey', (e) => validateSender(e, () => vaulticHelper.downloadDeactivationKey()));
	ipcMain.handle('vaulticHelper:readCSV', (e) => validateSender(e, () => vaulticHelper.readCSV()));
	ipcMain.handle('vaulticHelper:writeCSV', (e, fileName: string, data: string) => validateSender(e, () => vaulticHelper.writeCSV(fileName, data)));

	ipcMain.handle('serverHelper:registerUser', (e, masterKey: string, pendingUserToken: string, firstName: string, lastName: string) => validateSender(e, () => coreAPIResolver.helpers.server.registerUser(masterKey, pendingUserToken, firstName, lastName)));
	ipcMain.handle('serverHelper:logUserIn', (e, masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean, mfaCode?: string) => validateSender(e, () => coreAPIResolver.helpers.server.logUserIn(masterKey, email, firstLogin, reloadAllData, mfaCode)));
	ipcMain.handle('serverHelper:updateKSFParams', (e, newParams: string) => validateSender(e, () => coreAPIResolver.helpers.server.updateKSFParams(newParams)));

	ipcMain.handle('repositoryHelper:backupData', (e, masterKey: string) => validateSender(e, () => coreAPIResolver.helpers.repositories.backupData(masterKey)));
	ipcMain.handle('repositoryHelper:handleUserLogOut', (e) => validateSender(e, () => coreAPIResolver.helpers.repositories.handleUserLogOut()));

	ipcMain.handle('userRepository:getLastUsedUserInfo', (e) => validateSender(e, () => coreAPIResolver.repositories.users.getLastUsedUserInfo()));
	ipcMain.handle('userRepository:getLastUsedUserPreferences', (e) => validateSender(e, () => coreAPIResolver.repositories.users.getLastUsedUserPreferences()));
	ipcMain.handle('userRepository:createUser', (e, masterKey: string, email: string, firstName: string, lastName: string) => validateSender(e, () => coreAPIResolver.repositories.users.createUser(masterKey, email, firstName, lastName)));
	ipcMain.handle('userRepository:setCurrentUser', (e, masterKey: string, email: string) => validateSender(e, () => coreAPIResolver.repositories.users.setCurrentUser(masterKey, email)));
	ipcMain.handle('userRepository:getCurrentUserData', (e, masterKey: string) => validateSender(e, () => coreAPIResolver.repositories.users.getCurrentUserData(masterKey)));
	ipcMain.handle('userRepository:verifyUserMasterKey', (e, masterKey: string, email?: string, isVaulticKey?: boolean) => validateSender(e, () => coreAPIResolver.repositories.users.verifyUserMasterKey(masterKey, email, isVaulticKey)));
	ipcMain.handle('userRepository:saveUser', (e, masterKey: string, changes: string, hintID?: string) => validateSender(e, () => coreAPIResolver.repositories.users.saveUser(masterKey, changes, hintID)));
	ipcMain.handle('userRepository:getStoreStates', (e, masterKey: string, storeStatesToRetrieve: UserData) => validateSender(e, () => coreAPIResolver.repositories.users.getStoreStates(masterKey, storeStatesToRetrieve)));
	ipcMain.handle('userRepository:getValidMasterKey', (e) => validateSender(e, () => coreAPIResolver.repositories.users.getValidMasterKey()));
	ipcMain.handle('userRepository:updateUserEmail', (e, email: string) => validateSender(e, () => coreAPIResolver.repositories.users.updateUserEmail(email)));
	ipcMain.handle('userRepository:deleteAccount', (e) => validateSender(e, () => coreAPIResolver.repositories.users.deleteAccount()));

	ipcMain.handle('vaultRepository:updateVault', (e, masterKey: string, updateVaultData: string) => validateSender(e, () => coreAPIResolver.repositories.vaults.updateVault(masterKey, updateVaultData)));
	ipcMain.handle('vaultRepository:setActiveVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => coreAPIResolver.repositories.vaults.setActiveVault(masterKey, userVaultID)));
	ipcMain.handle('vaultRepository:saveVaultData', (e, masterKey: string, userVaultID: number, changes: string, hintID?: string) => validateSender(e, () => coreAPIResolver.repositories.vaults.saveVaultData(masterKey, userVaultID, changes, hintID)));
	ipcMain.handle('vaultRepository:createNewVaultForUser', (e, masterKey: string, updateVaultData: string) => validateSender(e, () => coreAPIResolver.repositories.vaults.createNewVaultForUser(masterKey, updateVaultData)));
	ipcMain.handle('vaultRepository:getStoreStates', (e, masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData) => validateSender(e, () => coreAPIResolver.repositories.vaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrieve)));
	ipcMain.handle('vaultRepository:deleteVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => coreAPIResolver.repositories.vaults.deleteVault(masterKey, userVaultID)));
	ipcMain.handle('vaultRepository:syncVaults', (e, email: string, masterKey?: string, reloadAllData?: boolean) => validateSender(e, () => coreAPIResolver.repositories.vaults.syncVaults(email, masterKey, reloadAllData)));

	ipcMain.handle('userVaultRepository:saveUserVault', (e, masterKey: string, userVaultID: number, changes: string, hintID?: string) => validateSender(e, () => coreAPIResolver.repositories.userVaults.saveUserVault(masterKey, userVaultID, changes, hintID)));
	ipcMain.handle('userVaultRepository:getStoreStates', (e, masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData) => validateSender(e, () => coreAPIResolver.repositories.userVaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrieve)));

	ipcMain.handle('logRepository:getExportableLogData', (e) => validateSender(e, () => coreAPIResolver.repositories.logs.getExportableLogData()));
	ipcMain.handle('logRepository:log', (e) => validateSender(e, (errorCode?: number, message?: string, callStack?: string) => coreAPIResolver.repositories.logs.log(errorCode, message, callStack)));

	ipcMain.handle('environment:isTest', (e) => validateSender(e, () => coreAPIResolver.environment.isTest()));
	ipcMain.handle('environment:failedToInitalizeDatabase', (e) => validateSender(e, () => coreAPIResolver.environment.failedToInitalizeDatabase()));
	ipcMain.handle('environment:recreateDatabase', (e) => validateSender(e, () => coreAPIResolver.environment.recreateDatabase()));
	ipcMain.handle('environment:hasConnection', (e) => validateSender(e, () => coreAPIResolver.environment.hasConnection()));

	ipcMain.handle('cache:clear', (e) => validateSender(e, () => coreAPIResolver.cache.clear()));
	ipcMain.handle('cache:setMasterKey', (e, masterKey: string) => validateSender(e, () => coreAPIResolver.cache.setMasterKey(masterKey)));
	ipcMain.handle('cache:clearMasterKey', (e) => validateSender(e, () => coreAPIResolver.cache.clearMasterKey()));
}

async function validateSender(event: Electron.IpcMainInvokeEvent, onSuccess: () => any): Promise<any>
{
	if (!event.senderFrame)
	{
		return undefined;
	}

	const url = (new URL(event.senderFrame.url));
	let pathParts = url.pathname?.split("/");

	//only allow requests from ourselves
	if (url.host === 'localhost:33633' ||
		(!url.host && pathParts.length > 0 && pathParts[pathParts.length - 1] === "index.html"))
	{
		return onSuccess();
	}

	return undefined;
}
