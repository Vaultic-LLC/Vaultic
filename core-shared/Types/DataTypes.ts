import { ServerPermissions } from "./ClientServerTypes";
import { Field, FieldedObject } from "./Fields";

export interface Organization
{
    organizationID: number;
    name: string;
    membersByUserID: Map<number, Member>;
    vaultIDsByVaultID: Map<number, number>;
}

export interface FieldedOrganization extends FieldedObject
{
    organizationID: Field<number>;
    name: Field<string>;
    membersByUserID: Field<Map<number, Field<Member>>>;
    vaultIDsByVaultID: Field<Map<number, Field<number>>>;
}

export interface Member
{
    userID: number;
    firstName: string;
    lastName: string;
    username: string;
    permission: ServerPermissions;
    icon: string | undefined;
    publicKey: string | undefined;
}