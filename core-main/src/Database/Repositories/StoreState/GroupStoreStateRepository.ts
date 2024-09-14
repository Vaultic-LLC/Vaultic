import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { GroupStoreState } from "../../Entities/States/GroupStoreState";

class GroupStoreStateRepository extends VaulticRepository<GroupStoreState>
{
    protected getRepository(): Repository<GroupStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(GroupStoreState);
    }
}

const groupStoreStateRepository = new GroupStoreStateRepository();
export default groupStoreStateRepository;
export type GroupStoreStateRepositoryType = typeof groupStoreStateRepository;