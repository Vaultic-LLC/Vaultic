export interface SimplifiedPasswordStore
{
    passwordsByDomain?: Map<string, Map<string, string>>;
};

export type VaultStoreStates = "vaultStoreState" | "passwordStoreState" | "valueStoreState" | "filterStoreState" | "groupStoreState";
