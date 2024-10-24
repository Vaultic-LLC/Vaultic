import { CondensedVaultData } from "./Entities";
import { TypedMethodResponse } from "./MethodResponse";

export interface ClientUserRepository 
{
    getLastUsedUserEmail: () => Promise<string | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string, publicKey: string, privateKey: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    getCurrentUserData: (masterKey: string) => Promise<TypedMethodResponse<string | undefined>>;
    verifyUserMasterKey: (masterKey: string, email?: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    saveUser: (masterKey: string, newData: string, currentData: string) => Promise<TypedMethodResponse<boolean | undefined>>;
}

export interface ClientVaultRepository
{
    setActiveVault: (masterKey: string, userVaultID: number) => Promise<TypedMethodResponse<CondensedVaultData | undefined>>;
    saveVault: (masterKey: string, userVaultID: number, newData: string, currentData?: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    createNewVaultForUser: (masterKey: string, name: string, setAsActive: boolean, doBackupData: boolean) => Promise<TypedMethodResponse<CondensedVaultData | undefined>>;
    archiveVault: (masterKey: string, userVaultID: number, backup: boolean) => Promise<TypedMethodResponse<boolean | undefined>>;
}

export interface ClientUserVaultRepository
{
    saveUserVault: (masterKey: string, userVaultID: number, newData: string, currentData: string) => Promise<TypedMethodResponse<boolean | undefined>>;
}

export interface ClientLogRepository
{
    getExportableLogData: () => Promise<string>;
    log: (errorCode?: number, message?: string, callStack?: string) => Promise<boolean>;
}