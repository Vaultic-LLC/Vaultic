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
};

export type PasswordByDomainResponse = { email?: string, id?: string }[];