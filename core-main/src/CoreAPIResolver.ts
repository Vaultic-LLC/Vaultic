import { RequireMFAOn, RequiresMFA } from "@vaultic/shared/Types/Device";
import { AppController, ClientUserController, ClientVaultController, OrganizationController, SessionController } from "@vaultic/shared/Types/Controllers";
import { ClientCryptUtility, ClientHashUtility, ICoreGeneratorUtility } from "@vaultic/shared/Types/Utilities";
import { RepositoryHelper, ServerHelper, ValidationHelper } from "@vaultic/shared/Types/Helpers";
import { ClientEnvironment, ClientVaulticCache } from "@vaultic/shared/Types/Environment";
import { ClientLogRepository, ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "@vaultic/shared/Types/Repositories";
import { CoreAPIResolver } from "@vaultic/shared/Types/API";
import { Promisify } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { CondensedVaultData, UserData } from "@vaultic/shared/Types/Entities";
import { ServerAllowSharingFrom } from "@vaultic/shared/Types/ClientServerTypes";
import { BreachRequestVault } from "@vaultic/shared/Types/DataTypes";
import { RandomValueType } from "@vaultic/shared/Types/Fields";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { environment } from "./Environment";
import { handleUserLogOut, safeBackupData } from "./Helpers/RepositoryHelper";
import validationHelper from "./Helpers/ValidationHelper";
import serverHelper from "./Helpers/ServerHelper";

const appController: AppController =
{
	log: (exception: string, message: string) => environment.server.api.app.log(exception, message)
};

const sessionController: SessionController =
{
	expire: () => environment.server.api.session.expire(),
	extend: () => environment.server.api.session.extend()
};

const userController: ClientUserController =
{
	validateEmail: (email: string) => environment.server.api.user.validateEmail(email),
	verifyEmail: (pendingUserToken: string, emailVerificationCode: string) => environment.server.api.user.verifyEmail(pendingUserToken, emailVerificationCode),
	getDevices: () => environment.server.api.user.getDevices(),
	registerDevice: (name: string, requiresMFA: RequiresMFA) => environment.server.api.user.registerDevice(name, requiresMFA),
	updateDevice: (name: string, requiresMFA: RequiresMFA, desktopDeviceID?: number, mobileDeviceID?: number) => environment.server.api.user.updateDevice(name, requiresMFA, desktopDeviceID, mobileDeviceID),
	deleteDevice: (desktopDeviceID?: number, mobileDeviceID?: number) => environment.server.api.user.deleteDevice(desktopDeviceID, mobileDeviceID),
	createCheckout: () => environment.server.api.user.createCheckout(),
	getChartData: (data: string) => environment.server.api.user.getChartData(data),
	deactivateUserSubscription: (email: string, deactivationKey: string) =>  environment.server.api.user.deactivateUserSubscription(email, deactivationKey),
	reportBug: (description: string) => environment.server.api.user.reportBug(description),
	getSettings: () => environment.server.api.user.getSettings(),
	updateSettings: (username?: string, allowSharedVaultsFromOthers?: boolean, allowSharingFrom?: ServerAllowSharingFrom, addedAllowSharingFrom?: number[], removedAllowSharingFrom?: number[], requireMFAOn?: RequireMFAOn) => environment.server.api.user.updateSettings(username, allowSharedVaultsFromOthers, allowSharingFrom, addedAllowSharingFrom, removedAllowSharingFrom, requireMFAOn),
	searchForUsers: (username: string, excludedUserIDs: string) => environment.server.api.user.searchForUsers(username, excludedUserIDs),
	getMFAKey: () => environment.server.api.user.getMFAKey(),
	getUserInfo: () => environment.server.api.user.getUserInfo(),
	startEmailVerification: (email: string) => environment.server.api.user.startEmailVerification(email),
	finishEmailVerification: (verificationCode: string) => environment.server.api.user.finishEmailVerification(verificationCode),
};

const vaultController: ClientVaultController =
{
	getMembers: (userOrganizationID: number, vaultID: number) => environment.server.api.vault.getMembers(userOrganizationID, vaultID),
	getVaultDataBreaches: (getVaultDataBreachesData: string) => environment.server.api.vault.getVaultDataBreaches(getVaultDataBreachesData),
	checkPasswordsForBreach: (checkPasswordForBreachData: string) =>  environment.server.api.vault.checkPasswordsForBreach(checkPasswordForBreachData),
	dismissVaultDataBreach: (userOrganizaitonID: number, vaultID: number, vaultDataBreachID: number) => environment.server.api.vault.dismissVaultDataBreach(userOrganizaitonID, vaultID, vaultDataBreachID),
	clearDataBreaches: (vaults: BreachRequestVault[]) => environment.server.api.vault.clearDataBreaches(vaults)
}

const organizationController: OrganizationController =
{
	getOrganizations: () => environment.server.api.organization.getOrganizations(),
	createOrganization: (masterKey: string, createOrganizationData: string) => environment.server.api.organization.createOrganization(masterKey, createOrganizationData),
	updateOrganization: (masterKey: string, updateOrganizationData: string) => environment.server.api.organization.updateOrganization(masterKey, updateOrganizationData),
	deleteOrganization: (organizationID: number) => environment.server.api.organization.deleteOrganization(organizationID)
}

const cryptUtility: Promisify<ClientCryptUtility> =
{
	symmetricEncrypt: (key: string, value: string) => environment.utilities.crypt.symmetricEncrypt(key, value),
	symmetricDecrypt: (key: string, value: string) => environment.utilities.crypt.symmetricDecrypt(key, value),
	ECEncrypt: (recipientPublicKey: string, value: string) => environment.utilities.crypt.ECEncrypt(recipientPublicKey, value),
	ECDecrypt: (tempPublicKey: string, usersPrivateKey: string, value: string) => environment.utilities.crypt.ECDecrypt(tempPublicKey, usersPrivateKey, value)
};

const generatorUtility: Promisify<ICoreGeneratorUtility> =
{
	generateRandomPasswordOrPassphrase: async (type: RandomValueType, length: number, includeNumbers: boolean, includeSpecialCharacters: boolean, includeAbmiguousCharacters: boolean, passphraseSeperator: string) => environment.utilities.generator.generateRandomPasswordOrPassphrase(type, length, includeNumbers, includeSpecialCharacters, includeAbmiguousCharacters, passphraseSeperator),
	ECKeys: () => environment.utilities.generator.ECKeys()
};

const hashUtility: Promisify<ClientHashUtility> =
{
	hash: (algorithm: Algorithm, value: string, salt?: string) => environment.utilities.hash.hash(algorithm, value, salt)
};

const currentValidationHelper: Promisify<ValidationHelper> =
{
	isWeak: async (value: string) => validationHelper.isWeak(value),
	containsNumber: (async (value: string) => (validationHelper.containsNumber(value))) as (value: string) => Promise<true> | Promise<false>,
	containsSpecialCharacter: (async (value: string) => (validationHelper.containsSpecialCharacter(value))) as (value: string) => Promise<true> | Promise<false>,
	containsUppercaseAndLowercaseNumber: (async (value: string) => (validationHelper.containsUppercaseAndLowercaseNumber(value))) as (value: string) => Promise<true> | Promise<false>
};

const currentServerHelper: ServerHelper =
{
	registerUser: (masterKey: string, pendingUserToken: string, firstName: string, lastName: string) => serverHelper.registerUser(masterKey, pendingUserToken, firstName, lastName),
	logUserIn: (masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean, mfaCode?: string) => serverHelper.logUserIn(masterKey, email, firstLogin, reloadAllData, mfaCode),
	updateKSFParams: (newParams: string) => serverHelper.updateKSFParams(newParams)
};

const repositoryHelepr: RepositoryHelper =
{
	backupData: (masterKey: string) =>  safeBackupData(masterKey),
	handleUserLogOut: () => handleUserLogOut()
}

const clientEnvironment: ClientEnvironment =
{
	isTest: async () => environment.isTest,
	failedToInitalizeDatabase: async () => environment.failedToInitalizeDatabase,
	recreateDatabase: () => environment.recreateDatabase(),
	hasConnection: () => environment.hasConnection()
};

const cache: Promisify<ClientVaulticCache> =
{
	clear: async () => environment.cache.clear(),
	setMasterKey: (masterKey: string) => environment.cache.setMasterKey(masterKey),
	clearMasterKey: async () => environment.cache.clearMasterKey()
}

const userRepository: ClientUserRepository =
{
	getLastUsedUserInfo: () => environment.repositories.users.getLastUsedUserInfo(),
	getLastUsedUserPreferences: () => environment.repositories.users.getLastUsedUserPreferences(),
	createUser: (masterKey: string, email: string, firstName: string, lastName: string) => environment.repositories.users.createUser(masterKey, email, firstName, lastName),
	setCurrentUser: (masterKey: string, email: string) => environment.repositories.users.setCurrentUser(masterKey, email),
	getCurrentUserData: (masterKey: string) => environment.repositories.users.getCurrentUserData(masterKey),
	verifyUserMasterKey: (masterKey: string, email?: string, isVaulticKey?: boolean) => environment.repositories.users.verifyUserMasterKey(masterKey, email, isVaulticKey),
	saveUser: (masterKey: string, changes: string, hintID?: string) => environment.repositories.users.saveUser(masterKey, changes, hintID),
	getStoreStates: (masterKey: string, storeStatesToRetrieve: UserData) => environment.repositories.users.getStoreStates(masterKey, storeStatesToRetrieve),
	getValidMasterKey: () => environment.repositories.users.getValidMasterKey(),
	updateUserEmail: (email: string) => environment.repositories.users.updateUserEmail(email),
	deleteAccount: () => environment.repositories.users.deleteAccount()
};

const vaultRepository: ClientVaultRepository =
{
	updateVault: (masterKey: string, updateVaultData: string) => environment.repositories.vaults.updateVault(masterKey, updateVaultData),
	setActiveVault: (masterKey: string, userVaultID: number) => environment.repositories.vaults.setActiveVault(masterKey, userVaultID),
	saveVaultData: (masterKey: string, userVaultID: number, changes: string, hintID?: string) => environment.repositories.vaults.saveVaultData(masterKey, userVaultID, changes, hintID),
	createNewVaultForUser: (masterKey: string, updateVaultData: string) => environment.repositories.vaults.createNewVaultForUser(masterKey, updateVaultData),
	getStoreStates: (masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData) => environment.repositories.vaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrieve),
	deleteVault: (masterKey: string, userVaultID: number) => environment.repositories.vaults.deleteVault(masterKey, userVaultID),
	syncVaults: (email: string, masterKey?: string, reloadAllData?: boolean) => environment.repositories.vaults.syncVaults(email, masterKey, reloadAllData),
};

const userVaultRepository: ClientUserVaultRepository =
{
	saveUserVault: (masterKey: string, userVaultID: number, changes: string, hintID?: string) => environment.repositories.userVaults.saveUserVault(masterKey, userVaultID, changes, hintID),
	getStoreStates: (masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData) => environment.repositories.userVaults.getStoreStates(masterKey, userVaultID, storeStatesToRetrieve)
};

const logRepository: ClientLogRepository =
{
	getExportableLogData: () => environment.repositories.logs.getExportableLogData(),
	log: (errorCode?: number, message?: string, callStack?: string) => environment.repositories.logs.log(errorCode, message, callStack)
}

export const coreAPIResolver: CoreAPIResolver = new CoreAPIResolver(clientEnvironment, cache, 
{
	app: appController,
	session: sessionController,
	user: userController,
	vault: vaultController,
	organization: organizationController
}, 
{
	crypt: cryptUtility,
	generator: generatorUtility,
	hash: hashUtility
}, {
	validation: currentValidationHelper,
	server: currentServerHelper,
	repositories: repositoryHelepr
}, {
	users: userRepository,
	vaults: vaultRepository,
	userVaults: userVaultRepository,
	logs: logRepository
});