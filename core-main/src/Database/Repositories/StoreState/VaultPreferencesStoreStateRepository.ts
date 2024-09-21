import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { VaultPreferencesStoreState } from "../../Entities/States/VaultPreferencesStoreState";
import { EntityState } from "../../../Types/Properties";
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

    public async postBackupEntitiesUpdates(entities: Partial<VaultPreferencesStoreState>[]): Promise<boolean>
    {
        try 
        {
            for (let i = 0; i < entities.length; i++)
            {
                if (!entities[i].vaultPreferencesStoreStateID)
                {
                    continue;
                }

                await this.repository.update(entities[i].vaultPreferencesStoreStateID!, {
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

const vaultPreferencesStoreStateRepository = new VaultPreferencesStoreStateRepository();
export default vaultPreferencesStoreStateRepository;
export type VaultPreferencesStoreStateRepositoryType = typeof vaultPreferencesStoreStateRepository;