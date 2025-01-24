import { PasswordsByDomainType } from "./DataTypes";
import { Field, KnownMappedFields } from "./Fields";

export interface SimplifiedPasswordStore
{
    passwordsByDomain?: Field<Map<string, Field<KnownMappedFields<PasswordsByDomainType>>>>;
};