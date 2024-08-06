import { environment } from "../Environment";
import { VaulticEntity } from "./Entities/VaulticEntity";
import { VaulticRepository } from "../Types/Repositories";

enum Operation
{
    Save,
    Delete
}

interface PendingEntity
{
    operation: Operation;
    entity: VaulticEntity;
    signingKey?: string;
    repository: () => VaulticRepository<VaulticEntity>;
}

export default class Transaction 
{
    protected pendingEntities: PendingEntity[];

    constructor() 
    {
        this.pendingEntities = [];
    }

    saveEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Save,
            entity,
            signingKey,
            repository
        });
    }

    deleteEntity<T extends VaulticEntity>(entity: T, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Delete,
            entity,
            repository
        });
    }

    commit(userIdentifier: string): Promise<boolean>
    {
        return new Promise((resolve) =>
        {
            environment.databaseDataSouce.transaction(async (manager) =>
            {
                let succeeded = true;
                for (let i = 0; i < this.pendingEntities.length; i++)
                {
                    const pendingEntity = this.pendingEntities[i];
                    const repo = manager.withRepository(pendingEntity.repository());

                    if (pendingEntity.operation == Operation.Save)
                    {
                        if (!repo.signAndSave(pendingEntity.signingKey!, this.pendingEntities[i].entity, userIdentifier))
                        {
                            succeeded = false;
                            break;
                        }
                    }
                    else if (pendingEntity.operation == Operation.Delete)
                    {
                        const entity = repo.remove(pendingEntity.entity);
                        if (!entity)
                        {
                            succeeded = false;
                            break;
                        }
                    }
                }

                resolve(succeeded);
            });
        });
    }
}