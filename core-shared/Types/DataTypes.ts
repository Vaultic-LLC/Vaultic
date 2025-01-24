import { ServerPermissions } from "./ClientServerTypes";
import { Field, FieldedObject, IFieldedObject } from "./Fields";

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

export class PasswordsByDomainType extends FieldedObject
{
    passwordsByDomain: Field<Map<string, Field<string>>>;

    constructor()
    {
        super();
        this.passwordsByDomain = new Field(new Map<string, Field<string>>());
    }
}

export interface BreachRequestVault
{
    UserOrganizationID: number;
    VaultID: number;
    LimitedPasswords?: { id: string, domain: string }[];
}