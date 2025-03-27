import { DeepPartial } from "../Helpers/TypeScriptHelper";
import { IUser, IUserVault, IVault, SharedClientUserVault } from "./Entities";

export interface Session
{
    Token?: string;
    Hash?: string;
}

export interface VaultDataBreach
{
    VaultDataBreachID: number;
    VaultID: number;
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
    sharedUserVaults?: SharedClientUserVault[];
    removedUserVaults?: DeepPartial<IUserVault>[];
    removedVaults?: DeepPartial<IVault>[];
    userChanges?: ClientUserChangeTrackings;
    userVaultChanges?: ClientUserVaultChangeTrackings[];
    vaultChanges?: ClientVaultChangeTrackings[];
};

export enum ServerPermissions
{
    View,
    ViewAndEdit
}

export enum ViewableServerPermissions
{
    View = "View",
    ViewAndEdit = "View And Edit"
}

export function viewableServerPermissionsToServerPermissions(p: ViewableServerPermissions)
{
    switch (p)
    {
        case ViewableServerPermissions.View:
            return ServerPermissions.View;
        case ViewableServerPermissions.ViewAndEdit:
            return ServerPermissions.ViewAndEdit;
    }
}

export function serverPermissionToViewableServerPermission(p: ServerPermissions)
{
    switch (p)
    {
        case ServerPermissions.View:
            return ViewableServerPermissions.View;
        case ServerPermissions.ViewAndEdit:
            return ViewableServerPermissions.ViewAndEdit;
    }
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

export interface AddedVaultMembersInfo
{
    AllMembers: number[];
    ModifiedOrgMembers: ModifiedOrgMember[];
}

export interface AddedVaultInfo
{
    AllVaults: number[];
    ModifiedOrgMembers: ModifiedOrgMember[];
}

export interface ModifiedOrgMember
{
    UserID: number;
    Permissions: ServerPermissions;
    VaultKeysByVaultID?: { [key: number]: string };
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
    Permissions: ServerPermissions;
}

export interface UserDemographics extends UserInfo
{
    PublicEncryptingKey: string;
}

export interface OrganizationInfo
{
    OrganizationID: number;
    Name: string;
    UserDemographics: UserOrgInfo[];
    VaultIDs: number[];
}

export enum AllowSharingFrom
{
    Everyone = "Everyone",
    SpecificUsers = "Specific Users"
}

export enum ServerAllowSharingFrom
{
    Everyone,
    SpecificUsers
}

export enum ClientChangeTrackingType
{
    User,
    UserVault,
    Vault
}

export interface ClientChangeTrackingObject
{
    lastLoadedChangeVersion: number;
    allChanges: ClientChange[];
}

export interface ClientUserChangeTrackings extends ClientChangeTrackingObject
{
    userID: number
}

export interface ClientUserVaultChangeTrackings extends ClientChangeTrackingObject
{
    userOrganizationID: number;
    userVaultID: number;
}

export interface ClientVaultChangeTrackings extends ClientChangeTrackingObject
{
    userOrganizationID: number;
    userVaultID: number;
    vaultID: number;
}

export interface ClientChange
{
    version?: number;
    changeTime: number;
    changes: string;
}