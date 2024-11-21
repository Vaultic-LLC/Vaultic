import { DeepPartial } from "../Helpers/TypeScriptHelper";
import { IUser, IUserVault, IVault, ServerDisplayVault } from "./Entities";

export interface Session
{
    Token?: string;
    Hash?: string;
}

export interface UserDataBreach
{
    UserDataBreachID: number;
    PasswordID: string;
    BreachedDate: number;
    PasswordsWereBreached: boolean;
    BreachedDataTypes: string;
};

export interface ChartData
{
    Y: number[];
    DataX: number[];
    TargetX: number[];
    Max: number;
}

export enum LicenseStatus
{
    NotActivated,
    Active,
    Inactive,
    Cancelled,
    Unknown
};

export interface EncryptedRequest
{
    Key: string;
    Data: string;
};

export interface UserDataPayload 
{
    user?: DeepPartial<IUser>;
    userVaults?: DeepPartial<IUserVault>[];
    vaults?: DeepPartial<IVault>[];
    archivedVaults?: ServerDisplayVault[];
    sharedVaults?: ServerDisplayVault[];
};

export enum Permissions
{
    Read,
    Write
}

export interface UserIDAndPermission
{
    UserID: number;
    Permission: Permissions;
}

export interface UserOrgInfo
{
    UserID: number;
    FirstName: string;
    LastName: string;
    Email: string;
    Permissions: Permissions;
}

export interface OrganizationAndUsers
{
    OrganizationID: number;
    Name: string;
    UserDemographics: UserOrgInfo[];
}

export enum AllowSharingFrom
{
    Everyone,
    SpecificUsers
}