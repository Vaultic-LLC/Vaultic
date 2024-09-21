import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { PasswordStoreState } from "../../Entities/States/PasswordStoreState";
import { EntityState } from "../../../Types/Properties";
import { StoreStateRepository } from "./StoreStateRepository";

class PasswordStoreStateRepository extends StoreStateRepository<PasswordStoreState>
{
    protected getRepository(): Repository<PasswordStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(PasswordStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<PasswordStoreState>
    {
        return environment.repositories.passwordStoreStates;
    }

    public async getByID(id: number): Promise<PasswordStoreState | null>
    {
        console.log('getting entity');
        return this.retrieveReactive((repository) => repository.findOneBy({
            passwordStoreStateID: id
        }));
    }

    public async postBackupEntitiesUpdates(entities: Partial<PasswordStoreState>[]): Promise<boolean>
    {
        try 
        {
            for (let i = 0; i < entities.length; i++)
            {
                if (!entities[i].passwordStoreStateID)
                {
                    continue;
                }

                await this.repository.update(entities[i].passwordStoreStateID!, {
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

const passwordStoreStateRepository = new PasswordStoreStateRepository();
export default passwordStoreStateRepository;
export type PasswordStoreStateRepositoryType = typeof passwordStoreStateRepository;