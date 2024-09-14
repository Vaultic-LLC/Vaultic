import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { VaultStoreState } from "../../Entities/States/VaultStoreState";

class VaultStoreStateRepository extends VaulticRepository<VaultStoreState>
{
    protected getRepository(): Repository<VaultStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(VaultStoreState);
    }
}

const vaultStoreStateRepository = new VaultStoreStateRepository();
export default vaultStoreStateRepository;
export type VaultStoreStateRepositoryType = typeof vaultStoreStateRepository;