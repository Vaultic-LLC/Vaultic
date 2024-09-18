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

    public async resetBackupTrackingForEntities(entities: Partial<VaultPreferencesStoreState>[]): Promise<boolean>
    {
        try 
        {
            this.repository
                .createQueryBuilder()
                .update()
                .set(
                    {
                        entityState: EntityState.Unchanged,
                        serializedPropertiesToSync: "[]",
                    }
                )
                .where("vaultPreferencesStoreStateID IN (:...vaultPreferencesStoreStateIDs)",
                    {
                        vaultPreferencesStoreStateIDs: entities.map(e => e.vaultPreferencesStoreStateID)
                    })
                .execute();
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