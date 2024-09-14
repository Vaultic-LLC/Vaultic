import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { VaultPreferencesStoreState } from "../../Entities/States/VaultPreferencesStoreState";

class VaultPreferencesStoreStateRepository extends VaulticRepository<VaultPreferencesStoreState>
{
    protected getRepository(): Repository<VaultPreferencesStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(VaultPreferencesStoreState);
    }
}

const vaultPreferencesStoreStateRepository = new VaultPreferencesStoreStateRepository();
export default vaultPreferencesStoreStateRepository;
export type VaultPreferencesStoreStateRepositoryType = typeof vaultPreferencesStoreStateRepository;