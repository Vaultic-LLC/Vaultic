import { DeepPartial } from "../Helpers/TypeScriptHelper";
import { Organization, Member } from "./DataTypes";
import { CondensedVaultData, UserData } from "./Entities";
import { TypedMethodResponse } from "./MethodResponse";

export interface ClientUserRepository 
{
    getLastUsedUserEmail: () => Promise<string | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string, publicKey: string, privateKey: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    setCurrentUser: (masterKey: string, email: string) => Promise<TypedMethodResponse<undefined>>;
    getCurrentUserData: (masterKey: string) => Promise<TypedMethodResponse<string | undefined>>;
    verifyUserMasterKey: (masterKey: string, email?: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    saveUser: (masterKey: string, newData: string, currentData: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    getStoreStates: (masterKey: string, storesToRetrieve: UserData) => Promise<TypedMethodResponse<DeepPartial<UserData> | undefined>>;
}

export interface UpdateVaultData
{
    userVaultID: number;
    name?: string;
    shared?: boolean;
    isArchived?: boolean;
    addedOrganizations?: Organization[];
    removedOrganizations?: Organization[];
    addedMembers?: Member[];
    updatedMembers?: Member[];
    removedMembers?: Member[];
}

export interface ClientVaultRepository
{
    updateVault: (masterKey: string, updateVaultData: string, doBackup: boolean) => Promise<TypedMethodResponse<boolean | undefined>>;
    setActiveVault: (masterKey: string, userVaultID: number) => Promise<TypedMethodResponse<CondensedVaultData | undefined>>;
    saveVaultData: (masterKey: string, userVaultID: number, newData: string, currentData?: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    createNewVaultForUser: (masterKey: string, name: string, shared: boolean, setAsActive: boolean, addedOrganizations: Organization[], addedMembers: Member[], doBackupData: boolean) => Promise<TypedMethodResponse<CondensedVaultData | undefined>>;
    getStoreStates: (masterKey: string, userVaultID: number, storesToRetrieve: CondensedVaultData) => Promise<TypedMethodResponse<DeepPartial<CondensedVaultData> | undefined>>;
    deleteVault: (masterKey: string, userVaultID: number) => Promise<TypedMethodResponse<boolean | undefined>>;
}

export interface ClientUserVaultRepository
{
    saveUserVault: (masterKey: string, userVaultID: number, newData: string, currentData: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    getStoreStates: (masterKey: string, userVaultID: number, storesToRetrieve: CondensedVaultData) => Promise<TypedMethodResponse<DeepPartial<CondensedVaultData> | undefined>>;
}

export interface ClientLogRepository
{
    getExportableLogData: () => Promise<string>;
    log: (errorCode?: number, message?: string, callStack?: string) => Promise<boolean>;
}