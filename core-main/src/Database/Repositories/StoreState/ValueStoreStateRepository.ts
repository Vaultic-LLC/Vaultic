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

    public async resetBackupTrackingForEntities(entities: Partial<ValueStoreState>[]): Promise<boolean>
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
                .where("valueStoreStateID IN (:...valueStoreStateIDs)",
                    {
                        valueStoreStateIDs: entities.map(e => e.valueStoreStateID)
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

const valueStoreStateRepository = new ValueStoreStateRepository();
export default valueStoreStateRepository;
export type ValueStoreStateRepositoryType = typeof valueStoreStateRepository;