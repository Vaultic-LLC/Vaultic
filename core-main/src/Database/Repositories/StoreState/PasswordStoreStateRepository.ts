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

    public async resetBackupTrackingForEntities(entities: Partial<PasswordStoreState>[]): Promise<boolean>
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
                .where("passwordStoreStateID IN (:...passwordStoreStateIDs)",
                    {
                        passwordStoreStateIDs: entities.map(e => e.passwordStoreStateID)
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

const passwordStoreStateRepository = new PasswordStoreStateRepository();
export default passwordStoreStateRepository;
export type PasswordStoreStateRepositoryType = typeof passwordStoreStateRepository;