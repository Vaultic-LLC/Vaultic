import { environment } from "../Environment";
import { VaulticEntity } from "./Entities/VaulticEntity";
import { VaulticRepository } from "../Types/Repositories";

enum Operation
{
    Insert,
    Update,
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

    insertEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Insert,
            entity,
            signingKey,
            repository
        });
    }

    updateEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Update,
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

    commit(): Promise<boolean>
    {
        return new Promise((resolve) =>
        {
            environment.databaseDataSouce.transaction(async (manager) =>
            {
                let succeeded = true;
                for (let i = 0; i < this.pendingEntities.length; i++)
                {
                    const pendingEntity = this.pendingEntities[i];
                    if (pendingEntity.operation == Operation.Insert)
                    {
                        if (!(await pendingEntity.repository().signAndInsert(manager, pendingEntity.signingKey!, pendingEntity.entity)))
                        {
                            succeeded = false;
                            break;
                        }
                    }
                    else if (pendingEntity.operation == Operation.Update)
                    {
                        if (!(await pendingEntity.repository().signAndUpdate(manager, pendingEntity.signingKey!, pendingEntity.entity)))
                        {
                            succeeded = false;
                            break;
                        }
                    }
                    else if (pendingEntity.operation == Operation.Delete)
                    {
                        if (!(await pendingEntity.repository().remove(manager, pendingEntity.entity)))
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