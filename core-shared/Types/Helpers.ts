import { CondensedVaultData } from "./Entities";
import { TypedMethodResponse } from "./MethodResponse";
import { FinishRegistrationResponse, GetUserDeactivationKeyResponse, LogUserInResponse } from "./Responses";

export interface ValidationHelper
{
    isWeak: (value: string, type: string) => [boolean, string];
    containsNumber: (value: string) => boolean;
    containsSpecialCharacter: (value: string) => boolean;
    containsUppercaseAndLowercaseNumber: (value: string) => boolean;
}

export interface VaulticHelper
{
    downloadDeactivationKey: () => Promise<GetUserDeactivationKeyResponse>;
    readCSV: () => Promise<[boolean, string]>;
    writeCSV: (fileName: string, data: string) => Promise<boolean>;
}

export interface ServerHelper
{
    registerUser: (masterKey: string, email: string, firstName: string, lastName: string) => Promise<FinishRegistrationResponse>;
    logUserIn: (masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean) => Promise<TypedMethodResponse<LogUserInResponse | undefined>>;
};

export interface ClientVaultHelper
{
    loadArchivedVault: (masterKey: string, userVaultID: number) => Promise<TypedMethodResponse<boolean | CondensedVaultData | null | undefined>>;
    unarchiveVault: (masterKey: string, userVaultID: number, select: boolean) => Promise<TypedMethodResponse<boolean | CondensedVaultData | undefined>>;
};

export interface RepositoryHelper 
{
    backupData: (masterKey: string) => Promise<TypedMethodResponse<boolean | undefined>>;
}