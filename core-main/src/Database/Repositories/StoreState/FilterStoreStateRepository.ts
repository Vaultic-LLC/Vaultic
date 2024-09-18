import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { FilterStoreState } from "../../Entities/States/FilterStoreState";
import { EntityState } from "../../../Types/Properties";
import { StoreStateRepository } from "./StoreStateRepository";

class FilterStoreStateRepository extends StoreStateRepository<FilterStoreState>
{
    protected getRepository(): Repository<FilterStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(FilterStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<FilterStoreState>
    {
        return environment.repositories.filterStoreStates;
    }

    public async getByID(id: number): Promise<FilterStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            filterStoreStateID: id
        }));
    }

    public async resetBackupTrackingForEntities(entities: Partial<FilterStoreState>[]): Promise<boolean>
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
                .where("filterStoreStateID IN (:...filterStoreStateIDs)",
                    {
                        filterStoreStateIDs: entities.map(e => e.filterStoreStateID)
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

const filterStoreStateRepository = new FilterStoreStateRepository();
export default filterStoreStateRepository;
export type FilterStoreStateRepositoryType = typeof filterStoreStateRepository;