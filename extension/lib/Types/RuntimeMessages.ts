export enum RuntimeMessages
{
    Lock = "LOCK",
    Sync = "SYNC",
    IsSignedIn = "IS_SIGNED_IN",
    SignIn = "SIGN_IN",
    GetVaultAndUserData = "GET_VAULT_AND_USER_DATA",
    GetDataBreaches = "GET_DATA_BREACHES",
    GetVaults = "GET_VAULTS",
    GetCurrentVault = "GET_CURRENT_VAULT",
    GetVaultByVaultID = "GET_VAULT_BY_VAULT_ID",
    GetVaultByUserVaultID = "GET_VAULT_BY_USER_VAULT_ID",
    LoadVault = "LOAD_VAULT",
    GetPasswordsByDomain = "GET_PASSWORDS_BY_DOMAIN",
    GetPasswordData = "GET_PASSWORD_DATA",

    AddPassword = "ADD_PASSWORD",
    UpdatePassword = "UPDATE_PASSWORD",
    DeletePassword = "DELETE_PASSWORD",

    AddValue = "ADD_VALUE",
    UpdateValue = "UPDATE_VALUE",
    DeleteValue = "DELETE_VALUE",

    AddFilter = "ADD_FILTER",
    UpdateFilter = "UPDATE_FILTER",
    DeleteFilter = "DELETE_FILTER",

    AddGroup = "ADD_GROUP",
    UpdateGroup = "UPDATE_GROUP",
    DeleteGroup = "DELETE_GROUP",

    ToggleFilter = "TOGGLE_FILTER",

    DismissVaultDataBreach = "DISMISS_VAULT_DATA_BREACH",
    
    GeneratePassword = "GENERATE_PASSWORD",
    SetTemporaryPassword = "SET_TEMPORARY_PASSWORD",
    GetTemporaryPassword = "GET_TEMPORARY_PASSWORD",
    SaveTemporaryPassword = "SAVE_TEMPORARY_PASSWORD",
    ClearTemporaryPassword = "CLEAR_TEMPORARY_PASSWORD",

    GetValidMasterKey = "GET_VALID_MASTER_KEY",
    SymmetricDecrypt = "SYMMETRIC_DECRYPT",
};

export type PasswordByDomainResponse = { username?: string, passwordFor?: string, id?: string }[];