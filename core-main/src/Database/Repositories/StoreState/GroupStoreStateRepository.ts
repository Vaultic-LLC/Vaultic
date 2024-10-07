import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { GroupStoreState } from "../../Entities/States/GroupStoreState";
import { StoreStateRepository } from "./StoreStateRepository";

class GroupStoreStateRepository extends StoreStateRepository<GroupStoreState>
{
    protected getRepository(): Repository<GroupStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(GroupStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<GroupStoreState>
    {
        return environment.repositories.groupStoreStates;
    }

    public async getByID(id: number): Promise<GroupStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            groupStoreStateID: id
        }));
    }
}

const groupStoreStateRepository = new GroupStoreStateRepository();
export default groupStoreStateRepository;
export type GroupStoreStateRepositoryType = typeof groupStoreStateRepository;