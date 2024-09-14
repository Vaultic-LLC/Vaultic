import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { ValueStoreState } from "../../Entities/States/ValueStoreState";

class ValueStoreStateRepository extends VaulticRepository<ValueStoreState>
{
    protected getRepository(): Repository<ValueStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(ValueStoreState);
    }
}

const valueStoreStateRepository = new ValueStoreStateRepository();
export default valueStoreStateRepository;
export type ValueStoreStateRepositoryType = typeof valueStoreStateRepository;