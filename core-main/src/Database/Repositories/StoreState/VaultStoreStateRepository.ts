import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { VaultStoreState } from "../../Entities/States/VaultStoreState";
import { StoreStateRepository } from "./StoreStateRepository";

class VaultStoreStateRepository extends StoreStateRepository<VaultStoreState>
{
    protected getRepository(): Repository<VaultStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(VaultStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<VaultStoreState>
    {
        return environment.repositories.vaultStoreStates;
    }

    public async getByID(id: number): Promise<VaultStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            vaultStoreStateID: id
        }));
    }
}

const vaultStoreStateRepository = new VaultStoreStateRepository();
export default vaultStoreStateRepository;
export type VaultStoreStateRepositoryType = typeof vaultStoreStateRepository;