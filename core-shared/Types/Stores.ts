export interface SimplifiedPasswordStore
{
    passwordsByDomain?: Map<string, Map<string, string>>;
};