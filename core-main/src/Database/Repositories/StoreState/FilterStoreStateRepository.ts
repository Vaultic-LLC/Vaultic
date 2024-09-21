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

    public async postBackupEntitiesUpdates(entities: Partial<FilterStoreState>[]): Promise<boolean>
    {
        try 
        {
            for (let i = 0; i < entities.length; i++)
            {
                if (!entities[i].filterStoreStateID)
                {
                    continue;
                }

                await this.repository.update(entities[i].filterStoreStateID!, {
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

const filterStoreStateRepository = new FilterStoreStateRepository();
export default filterStoreStateRepository;
export type FilterStoreStateRepositoryType = typeof filterStoreStateRepository;