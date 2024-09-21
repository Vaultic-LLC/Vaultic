import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { VaultStoreState } from "../../Entities/States/VaultStoreState";
import { EntityState } from "../../../Types/Properties";
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

    public async postBackupEntitiesUpdates(entities: Partial<VaultStoreState>[]): Promise<boolean>
    {
        try 
        {
            for (let i = 0; i < entities.length; i++)
            {
                if (!entities[i].vaultStoreStateID)
                {
                    continue;
                }

                await this.repository.update(entities[i].vaultStoreStateID!, {
                    entityState: EntityState.Unchanged,
                    serializedPropertiesToSync: "[]",
                    previousSignature: entities[i].currentSignature
                });
            }
        }
        catch 
        {
            // TODO: log
            return false;
        }

        return true;
    }
}

const vaultStoreStateRepository = new VaultStoreStateRepository();
export default vaultStoreStateRepository;
export type VaultStoreStateRepositoryType = typeof vaultStoreStateRepository;