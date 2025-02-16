import { DeepPartial } from "../Helpers/TypeScriptHelper";
import { Organization, Member } from "./DataTypes";
import { CondensedVaultData, IUser, UserData } from "./Entities";
import { Algorithm } from "./Keys";
import { TypedMethodResponse } from "./MethodResponse";

export interface ClientUserRepository 
{
    getLastUsedUserInfo: () => Promise<Partial<IUser> | null>;
    getLastUsedUserPreferences: () => Promise<string | null>;
    createUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    setCurrentUser: (masterKey: string, email: string) => Promise<TypedMethodResponse<undefined>>;
    getCurrentUserData: (masterKey: string) => Promise<TypedMethodResponse<string | undefined>>;
    verifyUserMasterKey: (masterKey: string, email?: string, isVaulticKey?: boolean) => Promise<TypedMethodResponse<VerifyUserMasterKeyResponse | undefined>>;
    saveUser: (masterKey: string, newData: string, currentData: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    getStoreStates: (masterKey: string, storesToRetrieve: UserData) => Promise<TypedMethodResponse<DeepPartial<UserData> | undefined>>;
    getValidMasterKey: () => Promise<string | undefined>;
}

export interface VerifyUserMasterKeyResponse
{
    isValid: boolean;
    keyAlgorithm: Algorithm;
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
    updateVault: (masterKey: string, updateVaultData: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    setActiveVault: (masterKey: string, userVaultID: number) => Promise<TypedMethodResponse<CondensedVaultData | undefined>>;
    saveVaultData: (masterKey: string, userVaultID: number, newData: string, currentData?: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    createNewVaultForUser: (masterKey: string, name: string, shared: boolean, setAsActive: boolean, addedOrganizations: Organization[], addedMembers: Member[]) => Promise<TypedMethodResponse<CondensedVaultData | undefined>>;
    getStoreStates: (masterKey: string, userVaultID: number, storesToRetrieve: CondensedVaultData) => Promise<TypedMethodResponse<DeepPartial<CondensedVaultData> | undefined>>;
    deleteVault: (masterKey: string, userVaultID: number) => Promise<TypedMethodResponse<boolean | undefined>>;
    syncVaults: (masterKey: string) => Promise<TypedMethodResponse<boolean | undefined>>;
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