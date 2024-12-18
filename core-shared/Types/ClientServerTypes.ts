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
    Read = "Read Only",
    Write = "Read & Write"
}

export interface VaultIDAndKey
{
    VaultID: number;
    VaultKey: string;
}

export interface UserIDAndKey
{
    UserID: number;
    VaultKey: string;
}

export interface OrgAndUserKeys
{
    OrganizationID: number;
    UserIDsAndKeys: UserIDAndKey[];
}

export interface AddedOrgInfo
{
    AllMembers: number[];
    OrgsAndUsersKeys: { [key: number]: OrgAndUserKeys };
}

export interface ModifiedOrgMember
{
    UserID: number;
    Permission: Permissions;
    VaultIDAndKeys?: VaultIDAndKey[];
}

export interface UserInfo 
{
    UserID: number;
    FirstName: string;
    LastName: string;
    Username: string;
}

export interface UserOrgInfo extends UserInfo
{
    Permissions: Permissions;
}

export interface UserDemographics extends UserInfo
{
    PublicKey: string;
}

export interface OrganizationInfo
{
    OrganizationID: number;
    Name: string;
    UserDemographics: UserOrgInfo[];
    UserVaults: number[];
}

export enum AllowSharingFrom
{
    Everyone,
    SpecificUsers
}
