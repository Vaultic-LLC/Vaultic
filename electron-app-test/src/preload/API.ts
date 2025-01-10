import { ipcRenderer } from "electron";

import { DeviceInfo } from "@vaultic/shared/Types/Device";
import { AppController, ClientUserController, ClientVaultController, SessionController, ValueController } from "@vaultic/shared/Types/Controllers";
import { ClientCryptUtility, ClientGeneratorUtility, HashUtility } from "@vaultic/shared/Types/Utilities";
import { RepositoryHelper, ServerHelper, ValidationHelper, VaulticHelper } from "@vaultic/shared/Types/Helpers";
import { ClientEnvironment, ClientVaulticCache } from "@vaultic/shared/Types/Environment";
import { ClientLogRepository, ClientUserRepository, ClientUserVaultRepository, ClientVaultRepository } from "@vaultic/shared/Types/Repositories";
import { IAPI } from "@vaultic/shared/Types/API";
import { Promisify } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { CondensedVaultData, UserData } from "@vaultic/shared/Types/Entities";

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

const userController: ClientUserController =
{
    validateEmail: (email: string) => ipcRenderer.invoke('userController:validateEmail', email),
    deleteDevice: (masterKey: string, desktopDeviceID?: number, mobileDeviceID?: number) => ipcRenderer.invoke('userController:deleteDevice', masterKey, desktopDeviceID, mobileDeviceID),
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

const vaultController: ClientVaultController =
{
    deleteVault: (userVaultID: number) => ipcRenderer.invoke('vaultController:deleteVault', userVaultID)
}

const cryptUtility: ClientCryptUtility =
{
    encrypt: (key: string, value: string) => ipcRenderer.invoke('cryptUtility:encrypt', key, value),
    decrypt: (key: string, value: string) => ipcRenderer.invoke('cryptUtility:decrypt', key, value),
    ECEncrypt: (recipientPublicKey: string, value: string) => ipcRenderer.invoke('cryptUtility:ECEncrypt', recipientPublicKey, value),
    ECDecrypt: (tempPublicKey: string, userPrivateKey: string, value: string) => ipcRenderer.invoke('cryptUtility:ECDecrypt', tempPublicKey, userPrivateKey, value)
};

const hashUtility: Promisify<HashUtility> =
{
    hash: (value: string, salt: string) => ipcRenderer.invoke('hashUtility:hash', value, salt),
    insecureHash: (value: string) => ipcRenderer.invoke('hashUtility:insecureHash', value),
    compareHashes: (a: string, b: string) => ipcRenderer.invoke('hashUtility:compareHashes', a, b)
};

const generatorUtility: Promisify<ClientGeneratorUtility> =
{
    uniqueId: () => ipcRenderer.invoke('generatorUtility:uniqueId'),
    randomValue: (length: number) => ipcRenderer.invoke('generatorUtility:randomValue', length),
    randomPassword: (length: number) => ipcRenderer.invoke('generatorUtility:randomPassword', length),
    ECKeys: () => ipcRenderer.invoke('generatorUtility:ECKeys')
};

const validationHelper: Promisify<ValidationHelper> =
{
    isWeak: (value: string, type: string) => ipcRenderer.invoke('validationHelper:isWeak', value, type),
    containsNumber: (value: string) => ipcRenderer.invoke('validationHelper:containsNumber', value),
    containsSpecialCharacter: (value: string) => ipcRenderer.invoke('validationHelper:containsSpecialCharacter', value),
    containsUppercaseAndLowercaseNumber: (value: string) => ipcRenderer.invoke('validationHelper:containsUppercaseAndLowercaseNumber', value)
};

const vaulticHelper: VaulticHelper =
{
    downloadDeactivationKey: () => ipcRenderer.invoke('vaulticHelper:downloadDeactivationKey'),
    readCSV: () => ipcRenderer.invoke('vaulticHelper:readCSV'),
    writeCSV: (fileName: string, data: string) => ipcRenderer.invoke('vaulticHelper:writeCSV', fileName, data)
};

const serverHelper: ServerHelper =
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => ipcRenderer.invoke('serverHelper:registerUser', masterKey, email, firstName, lastName),
    logUserIn: (masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean) => ipcRenderer.invoke('serverHelper:logUserIn', masterKey, email, firstLogin, reloadAllData)
};

const repositoryHelepr: RepositoryHelper =
{
    backupData: (masterKey: string) => ipcRenderer.invoke('repositoryHelper:backupData', masterKey)
}

const environment: ClientEnvironment =
{
    isTest: () => ipcRenderer.invoke('environment:isTest'),
    failedToInitalizeDatabase: () => ipcRenderer.invoke('environment:failedToInitalizeDatabase'),
    recreateDatabase: () => ipcRenderer.invoke('environment:recreateDatabase'),
    createNewDatabase: (renameCurrentTo: string) => ipcRenderer.invoke('environment:createNewDatabase', renameCurrentTo),
    setDatabaseAsCurrent: (name: string) => ipcRenderer.invoke('environment:setDatabaseAsCurrent', name)
};

const cache: Promisify<ClientVaulticCache> =
{
    clear: () => ipcRenderer.invoke('cache:clear')
}

const userRepository: ClientUserRepository =
{
    getLastUsedUserEmail: () => ipcRenderer.invoke('userRepository:getLastUsedUserEmail'),
    getLastUsedUserPreferences: () => ipcRenderer.invoke('userRepository:getLastUsedUserPreferences'),
    createUser: (masterKey: string, email: string, publicKey: string, privateKey: string) => ipcRenderer.invoke('userRepository:createUser', masterKey, email, publicKey, privateKey),
    setCurrentUser: (masterKey: string, email: string) => ipcRenderer.invoke("userRepository:setCurrentUser", masterKey, email),
    getCurrentUserData: (masterKey: string) => ipcRenderer.invoke('userRepository:getCurrentUserData', masterKey),
    verifyUserMasterKey: (masterKey: string, email?: string) => ipcRenderer.invoke('userRepository:verifyUserMasterKey', masterKey, email),
    saveUser: (masterKey: string, newData: string, currentData: string) => ipcRenderer.invoke('userRepository:saveUser', masterKey, newData, currentData),
    getStoreStates: (masterKey: string, storeStatesToRetrieve: UserData) => ipcRenderer.invoke('userRepository:getStoreStates', masterKey, storeStatesToRetrieve)
};

const vaultRepository: ClientVaultRepository =
{
    setActiveVault: (masterKey: string, userVaultID: number) => ipcRenderer.invoke('vaultRepository:setActiveVault', masterKey, userVaultID),
    saveVault: (masterKey: string, userVaultID: number, newData: string, currentData?: string) => ipcRenderer.invoke('vaultRepository:saveVault', masterKey, userVaultID, newData, currentData),
    createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackup: boolean) => ipcRenderer.invoke('vaultRepository:createNewVaultForUser', masterKey, name, setAsActive, doBackup),
    getStoreStates: (masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData) => ipcRenderer.invoke('vaultRepository:getStoreStates', masterKey, userVaultID, storeStatesToRetrieve)
};

const userVaultRepository: ClientUserVaultRepository =
{
    saveUserVault: (masterKey: string, userVaultID: number, newData: string, currentData: string) => ipcRenderer.invoke('userVaultRepository:saveUserVault', masterKey, userVaultID, newData, currentData),
    getStoreStates: (masterKey: string, userVaultID: number, storeStatesToRetrieve: CondensedVaultData) => ipcRenderer.invoke('userVaultRepository:getStoreStates', masterKey, userVaultID, storeStatesToRetrieve)
};

const logRepository: ClientLogRepository =
{
    getExportableLogData: () => ipcRenderer.invoke('logRepository:getExportableLogData'),
    log: (errorCode?: number, message?: string, callStack?: string) => ipcRenderer.invoke('logRepository:log', errorCode, message, callStack)
}

const api: IAPI =
{
    getDeviceInfo,
    environment,
    cache,
    server: {
        app: appController,
        session: sessionController,
        user: userController,
        value: valueController,
        vault: vaultController
    },
    utilities: {
        crypt: cryptUtility,
        hash: hashUtility,
        generator: generatorUtility,
    },
    helpers: {
        validation: validationHelper,
        vaultic: vaulticHelper,
        server: serverHelper,
        repositories: repositoryHelepr
    },
    repositories: {
        users: userRepository,
        vaults: vaultRepository,
        userVaults: userVaultRepository,
        logs: logRepository
    }
};

export default api;
