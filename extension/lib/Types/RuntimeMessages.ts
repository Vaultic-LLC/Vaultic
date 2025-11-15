export enum RuntimeMessages
{
    Lock = "LOCK",
    Sync = "SYNC",
    IsSignedIn = "IS_SIGNED_IN",
    SignIn = "SIGN_IN",
    GetVaultData = "GET_VAULT_DATA",
    GetVaults = "GET_VAULTS",
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
};

export type PasswordByDomainResponse = { email?: string, id?: string }[];