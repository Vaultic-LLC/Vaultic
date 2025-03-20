import { VaultContrainedStore } from "./Base";
import { VaultStoreParameter } from "./VaultStore";
import { StoreState } from "@vaultic/shared/Types/Stores";

export interface VaultPreferencesState extends StoreState
{
}

// this use to hold pinned values but those were moved. Leaving this here just in case I ever
// need to re use it for something
export class VaultPreferencesStore extends VaultContrainedStore<VaultPreferencesState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "vaultPreferencesStoreState");
    }
}