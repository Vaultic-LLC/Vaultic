export enum EntityState
{
    Inserted,
    Updated,
    Deleted,
    Unchanged
};

export interface IVaulticEntity 
{
    signatureSecret: string;
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
    lastUsed: boolean;
    masterKeyHash: string;
    masterKeySalt: string;
    publicKey: string;
    privateKey: string;
    appStoreState: IAppStoreState;
    userPreferencesStoreState: IUserPreferencesStoreState;
    userVaults: IUserVault[]
};

export interface IUserVault extends IVaulticEntity 
{
    userVaultID: number
    userID: number
    userOrganizationID: number
    user: IUser
    vaultID: number
    vault: IVault;
    vaultKey: string
    vaultPreferencesStoreState: IVaultPreferencesStoreState;
};

export interface IVault extends IVaulticEntity
{
    vaultID: number;
    userVaults: IUserVault[];
    name: string;
    lastUsed: boolean;
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
    groupStoreStateID: number
    vaultID: number
    vault: IVault;
}

export interface DisplayVault 
{
    name: string;
    userVaultID: number;
    lastUsed?: boolean;
}

export enum VaultType
{
    Personal,
    Shared,
    Archived
};

export interface ServerDisplayVault extends DisplayVault
{
    vaultKey: string;
}

export interface UserData 
{
    success: boolean;
    appStoreState?: any;
    userPreferencesStoreState?: any;
    displayVaults?: DisplayVault[];
    currentVault?: CondensedVaultData;
}

export interface CondensedVaultData
{
    userVaultID: number;
    vaultPreferencesStoreState: string;
    name: string;
    lastUsed: boolean;
    vaultStoreState: string;
    passwordStoreState: string;
    valueStoreState: string;
    filterStoreState: string;
    groupStoreState: string;
}