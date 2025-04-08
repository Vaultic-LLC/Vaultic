import { ServerPermissions } from "./ClientServerTypes"
import { Algorithm, SignedVaultKey } from "./Keys";
import { DoubleKeyedObject } from "./Stores";

export enum EntityState
{
    Inserted,
    Updated,
    Deleted,
    Unchanged
};

export interface IVaulticEntity 
{
    currentSignature: string;
    entityState: EntityState;
    serializedPropertiesToSync: string;
    propertiesToSync: string[];
    updatedProperties: string[];
};

export interface IUser extends IVaulticEntity
{
    userID: number;
    email: string;
    firstName: string;
    lastName: string;
    lastUsed: boolean;
    masterKeyEncryptionAlgorithm: Algorithm;
    masterKeyHash: string;
    masterKeySalt: string;
    publicSigningKey: string;
    privateSigningKey: string;
    publicEncryptingKey: string;
    privateEncryptingKey: string;
    lastLoadedChangeVersion: number;
    ksfParams: string;
    appStoreState: IAppStoreState;
    userPreferencesStoreState: IUserPreferencesStoreState;
    userVaults: IUserVault[]
};

export interface IUserVault extends IVaulticEntity 
{
    userVaultID: number;
    userID: number;
    userOrganizationID: number;
    user: IUser;
    vaultID: number;
    vault: IVault;
    vaultKey: string;
    isOwner: boolean;
    permissions?: ServerPermissions;
    lastLoadedChangeVersion: number;
    vaultPreferencesStoreState: IVaultPreferencesStoreState;
};

export interface IVault extends IVaulticEntity
{
    vaultID: number;
    userVaults: IUserVault[];
    name: string;
    lastUsed: boolean;
    lastLoadedChangeVersion: number;
    vaultStoreState: IVaultStoreState;
    passwordStoreState: IPasswordStoreState;
    valueStoreState: IValueStoreState;
    filterStoreState: IFilterStoreState;
    groupStoreState: IGroupStoreState;
};

export interface IStoreState extends IVaulticEntity
{
    state: string;
    previousSignature: string;
}

export interface IAppStoreState extends IStoreState
{
    appStoreStateID: number;
    userID: number;
    user: IUser;
}

export interface IUserPreferencesStoreState extends IStoreState
{
    userPreferencesStoreStateID: number;
    userID: number;
    user: IUser;
}

export interface IVaultPreferencesStoreState extends IStoreState 
{
    vaultPreferencesStoreStateID: number;
    userVaultID: number;
    userVault: IUserVault;
}

export interface IVaultStoreState extends IStoreState
{
    vaultStoreStateID: number;
    vaultID: number;
    vault: IVault;
}

export interface IPasswordStoreState extends IStoreState
{
    passwordStoreStateID: number;
    vaultID: number;
    vault: IVault;
}

export interface IValueStoreState extends IStoreState 
{
    valueStoreStateID: number
    vaultID: number
    vault: IVault;
}

export interface IFilterStoreState extends IStoreState 
{
    filterStoreStateID: number
    vaultID: number
    vault: IVault;
}

export interface IGroupStoreState extends IStoreState
{
    groupStoreStateID: number;
    vaultID: number;
    vault: IVault;
}

export interface DisplayVault 
{
    name: string;
    userVaultID: number;
    vaultID: number;
    userOrganizationID: number;
    shared: boolean;
    isArchived: boolean;
    isOwner: boolean;
    isReadOnly: boolean;
    lastUsed?: boolean;
    type?: VaultType;
    passwordsByDomain?: DoubleKeyedObject;
}

export function getVaultType(vault: DisplayVault)
{
    if (vault.shared)
    {
        if (vault.isOwner)
        {
            return VaultType.SharedWithOthers;
        }

        return VaultType.SharedWithUser;
    }
    else if (vault.isArchived)
    {
        return VaultType.Archived;
    }

    return VaultType.Private;
}

export enum VaultType
{
    Private,
    SharedWithOthers,
    SharedWithUser,
    Archived
};

export interface SharedClientUserVault extends IUserVault
{
    isSetup: boolean;
}

export interface UnsetupSharedClientUserVault
{
    userVault: IUserVault;
    vaultKey: SignedVaultKey;
}

export interface UserData 
{
    success: boolean;
    userInfo?: Partial<IUser>;
    appStoreState?: any;
    userPreferencesStoreState?: any;
    displayVaults?: DisplayVault[];
    currentVault?: CondensedVaultData;
}

export interface CondensedVaultData
{
    userOrganizationID: number;
    userVaultID: number;
    vaultID: number;
    vaultPreferencesStoreState: string;
    name: string;
    shared: boolean;
    isArchived: boolean;
    isOwner: boolean;
    isReadOnly: boolean;
    lastUsed: boolean;
    permissions?: ServerPermissions;
    vaultStoreState: string;
    passwordStoreState: string;
    valueStoreState: string;
    filterStoreState: string;
    groupStoreState: string;
}

export interface UserVaultIDAndVaultID
{
    userVaultID: number;
    vaultID: number;
}