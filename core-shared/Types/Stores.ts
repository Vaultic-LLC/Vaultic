import { Field } from "./Fields";

export interface SimplifiedPasswordStore
{
    passwordsByDomain?: Field<Map<string, Field<Map<string, Field<string>>>>>;
};