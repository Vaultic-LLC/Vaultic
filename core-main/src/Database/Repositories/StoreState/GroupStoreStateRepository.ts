import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { GroupStoreState } from "../../Entities/States/GroupStoreState";
import { EntityState } from "../../../Types/Properties";
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

    public async postBackupEntitiesUpdates(entities: Partial<GroupStoreState>[]): Promise<boolean>
    {
        try 
        {
            for (let i = 0; i < entities.length; i++)
            {
                if (!entities[i].groupStoreStateID)
                {
                    continue;
                }

                await this.repository.update(entities[i].groupStoreStateID!, {
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

const groupStoreStateRepository = new GroupStoreStateRepository();
export default groupStoreStateRepository;
export type GroupStoreStateRepositoryType = typeof groupStoreStateRepository;