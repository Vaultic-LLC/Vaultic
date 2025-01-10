import { Permissions } from "./ClientServerTypes";

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
    permission: Permissions;
    icon: string | undefined;
    publicKey: string | undefined;
}