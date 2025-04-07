import { ServerPermissions } from "./ClientServerTypes";

export interface Organization
{
    organizationID: number;
    name: string;
    membersByUserID: Map<number, Member>;
    vaultIDsByVaultID: Map<number, number>;
}

export interface Member
{
    userID: number;
    firstName: string;
    lastName: string;
    username: string;
    permission: ServerPermissions;
    icon: string | undefined;
    publicEncryptingKey: string | undefined;
}

export interface BreachRequestVault
{
    UserOrganizationID: number;
    VaultID: number;
    LimitedPasswords?: { id: string, domain: string }[];
}