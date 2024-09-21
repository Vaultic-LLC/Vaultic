import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { ValueStoreState } from "../../Entities/States/ValueStoreState";
import { EntityState } from "../../../Types/Properties";
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

    public async postBackupEntitiesUpdates(entities: Partial<ValueStoreState>[]): Promise<boolean>
    {
        try 
        {
            for (let i = 0; i < entities.length; i++)
            {
                if (!entities[i].valueStoreStateID)
                {
                    continue;
                }

                await this.repository.update(entities[i].valueStoreStateID!, {
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

const valueStoreStateRepository = new ValueStoreStateRepository();
export default valueStoreStateRepository;
export type ValueStoreStateRepositoryType = typeof valueStoreStateRepository;