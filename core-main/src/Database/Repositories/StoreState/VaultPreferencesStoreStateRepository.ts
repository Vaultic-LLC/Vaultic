import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { VaultPreferencesStoreState } from "../../Entities/States/VaultPreferencesStoreState";
import { StoreStateRepository } from "./StoreStateRepository";

class VaultPreferencesStoreStateRepository extends StoreStateRepository<VaultPreferencesStoreState>
{
    protected getRepository(): Repository<VaultPreferencesStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(VaultPreferencesStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<VaultPreferencesStoreState>
    {
        return environment.repositories.vaultPreferencesStoreStates;
    }

    public async getByID(id: number): Promise<VaultPreferencesStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            vaultPreferencesStoreStateID: id
        }));
    }
}

const vaultPreferencesStoreStateRepository = new VaultPreferencesStoreStateRepository();
export default vaultPreferencesStoreStateRepository;
export type VaultPreferencesStoreStateRepositoryType = typeof vaultPreferencesStoreStateRepository;