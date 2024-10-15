import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { ValueStoreState } from "../../Entities/States/ValueStoreState";
import { StoreStateRepository } from "./StoreStateRepository";

class ValueStoreStateRepository extends StoreStateRepository<ValueStoreState>
{
    protected getRepository(): Repository<ValueStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(ValueStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<ValueStoreState>
    {
        return environment.repositories.valueStoreStates;
    }

    public async getByID(id: number): Promise<ValueStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            valueStoreStateID: id
        }));
    }
}

const valueStoreStateRepository = new ValueStoreStateRepository();
export default valueStoreStateRepository;
export type ValueStoreStateRepositoryType = typeof valueStoreStateRepository;