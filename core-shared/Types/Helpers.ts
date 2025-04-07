import { TypedMethodResponse } from "./MethodResponse";
import { FinishRegistrationResponse, GetUserDeactivationKeyResponse, LogUserInResponse, StartRegistrationResponse } from "./Responses";

export interface ValidationHelper
{
    isWeak: (value: string) => [boolean, number];
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
    registerUser: (masterKey: string, pendingUserToken: string, firstName: string, lastName: string) => Promise<StartRegistrationResponse | FinishRegistrationResponse>;
    logUserIn: (masterKey: string, email: string, firstLogin: boolean, reloadAllData: boolean, mfaCode?: string) => Promise<TypedMethodResponse<LogUserInResponse | undefined>>;
};

export interface RepositoryHelper 
{
    backupData: (masterKey: string) => Promise<TypedMethodResponse<boolean | undefined>>;
    handleUserLogOut: () => Promise<void>;
}