import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { FilterStoreState } from "../../Entities/States/FilterStoreState";

class FilterStoreStateRepository extends VaulticRepository<FilterStoreState>
{
    protected getRepository(): Repository<FilterStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(FilterStoreState);
    }
}

const filterStoreStateRepository = new FilterStoreStateRepository();
export default filterStoreStateRepository;
export type FilterStoreStateRepositoryType = typeof filterStoreStateRepository;