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
import vaultHelper from "./Core/Helpers/VaultHelper";
import { safeBackupData } from "./Core/Helpers/RepositoryHelper";
import { CondensedVaultData, UserData, UserVaultIDAndVaultID } from "@vaultic/shared/Types/Entities";
import { AllowSharingFrom, ModifiedOrgMember } from "@vaultic/shared/Types/ClientServerTypes";
import { Member, Organization } from "@vaultic/shared/Types/DataTypes";
import { RandomValueType } from "@vaultic/shared/Types/Fields";

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
	ipcMain.handle('userController:getSharingSettings', (e) => validateSender(e, () => vaulticServer.user.getSharingSettings()));
	ipcMain.handle('userController:updateSharingSettings', (e, username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: AllowSharingFrom) => validateSender(e, () => vaulticServer.user.updateSharingSettings(username, allowSharedVaultsFromOthers, allowSharingFrom)));
	ipcMain.handle('userController:searchForUsers', (e, username: string) => validateSender(e, () => vaulticServer.user.searchForUsers(username)));

	ipcMain.handle('vaultController:getMembers', (e, userOrganizationID: number, userVaultID: number) => validateSender(e, () => vaulticServer.vault.getMembers(userOrganizationID, userVaultID)));

	ipcMain.handle('organizationController:getOrganizations', (e) => validateSender(e, () => vaulticServer.organization.getOrganizations()));
	ipcMain.handle('organizationController:createOrganization', (e, masterKey: string, createOrganizationData: string) => validateSender(e, () => vaulticServer.organization.createOrganization(masterKey, createOrganizationData)));
	ipcMain.handle('organizationController:updateOrganization', (e, masterKey: string, updateOrganizationData: string) => validateSender(e, () => vaulticServer.organization.updateOrganization(masterKey, updateOrganizationData)));
	ipcMain.handle('organizationController:deleteOrganization', (e, organizationID: number) => validateSender(e, () => vaulticServer.organization.deleteOrganization(organizationID)));

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
	ipcMain.handle('generatorUtility:generateRandomPasswordOrPassphrase', (e, type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => validateSender(e, () => generatorUtility.generateRandomPasswordOrPassphrase(type, length, includeNumbers, includeSpecialCharacters, includeAbmiguousCharacters, passphraseSeperator)));
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
	ipcMain.handle('serverHelper:logUserIn', (e, masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean) =>
		validateSender(e, () => serverHelper.logUserIn(masterKey, email, firstLogin, reloadAllData)));

	ipcMain.handle('repositoryHelper:backupData', (e, masterKey: string) => validateSender(e, () => safeBackupData(masterKey)));

	ipcMain.handle('userRepository:getLastUsedUserEmail', (e) => validateSender(e, () => environment.repositories.users.getLastUsedUserEmail()));
	ipcMain.handle('userRepository:getLastUsedUserPreferences', (e) => validateSender(e, () => environment.repositories.users.getLastUsedUserPreferences()));
	ipcMain.handle('userRepository:createUser', (e, masterKey: string, email: string, publicKey: string, privateKey: string) => validateSender(e, () => environment.repositories.users.createUser(masterKey, email, publicKey, privateKey)));
	ipcMain.handle('userRepository:setCurrentUser', (e, masterKey: string, email: string) => validateSender(e, () => environment.repositories.users.setCurrentUser(masterKey, email)));
	ipcMain.handle('userRepository:getCurrentUserData', (e, masterKey: string) => validateSender(e, () => environment.repositories.users.getCurrentUserData(masterKey)));
	ipcMain.handle('userRepository:verifyUserMasterKey', (e, masterKey: string, email?: string) => validateSender(e, () => environment.repositories.users.verifyUserMasterKey(masterKey, email)));
	ipcMain.handle('userRepository:saveUser', (e, masterKey: string, newData: string, currentData: string) => validateSender(e, () => environment.repositories.users.saveUser(masterKey, newData, currentData)));
	ipcMain.handle('userRepository:getStoreStates', (e, masterKey: string, storeStatesToRetrive: UserData) => validateSender(e, () => environment.repositories.users.getStoreStates(masterKey, storeStatesToRetrive)));

	ipcMain.handle('vaultRepository:updateVault', (e, masterKey: string, updateVaultData: string, doBackup: boolean) => validateSender(e, () => environment.repositories.vaults.updateVault(masterKey, updateVaultData, doBackup)));
	ipcMain.handle('vaultRepository:setActiveVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => environment.repositories.vaults.setActiveVault(masterKey, userVaultID)));
	ipcMain.handle('vaultRepository:saveVaultData', (e, masterKey: string, userVaultID: number, newData: string, currentData?: string) => validateSender(e, () => environment.repositories.vaults.saveVaultData(masterKey, userVaultID, newData, currentData)));
	ipcMain.handle('vaultRepository:createNewVaultForUser', (e, masterKey: string, name: string, shared: boolean, setAsActive: boolean, addedOrganizations: Organization[], addedMembers: Member[], doBackupData: boolean) => validateSender(e, () => environment.repositories.vaults.createNewVaultForUser(masterKey, name, shared, setAsActive, addedOrganizations, addedMembers, doBackupData)));
	ipcMain.handle('vaultRepository:getStoreStates', (e, masterKey: string, userVaultID: number, storeStatesToRetrive: CondensedVaultData) => validateSender(e, () => environment.repositories.vaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrive)));
	ipcMain.handle('vaultRepository:deleteVault', (e, masterKey: string, userVaultID: number) => validateSender(e, () => environment.repositories.vaults.deleteVault(masterKey, userVaultID)));

	ipcMain.handle('userVaultRepository:saveUserVault', (e, masterKey: string, userVaultID: number, newData: string, currentData: string) => validateSender(e, () => environment.repositories.userVaults.saveUserVault(masterKey, userVaultID, newData, currentData)));
	ipcMain.handle('userVaultRepository:getStoreStates', (e, masterKey: string, userVaultID: number, storeStatesToRetrive: CondensedVaultData) => validateSender(e, () => environment.repositories.userVaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrive)));

	ipcMain.handle('logRepository:getExportableLogData', (e) => validateSender(e, () => environment.repositories.logs.getExportableLogData()));
	ipcMain.handle('logRepository:log', (e) => validateSender(e, (errorCode?: number, message?: string, callStack?: string) => environment.repositories.logs.log(errorCode, message, callStack)));

	ipcMain.handle('environment:isTest', (e) => validateSender(e, () => environment.isTest));
	ipcMain.handle('environment:failedToInitalizeDatabase', (e) => validateSender(e, () => environment.failedToInitalizeDatabase));
	ipcMain.handle('environment:recreateDatabase', (e) => validateSender(e, () => environment.recreateDatabase()));

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
