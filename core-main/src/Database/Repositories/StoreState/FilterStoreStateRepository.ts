import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { FilterStoreState } from "../../Entities/States/FilterStoreState";
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
}

const filterStoreStateRepository = new FilterStoreStateRepository();
export default filterStoreStateRepository;
export type FilterStoreStateRepositoryType = typeof filterStoreStateRepository;