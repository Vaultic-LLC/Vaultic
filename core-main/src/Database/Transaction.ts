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
    entity: VaulticEntity | Partial<VaulticEntity>;
    existing: boolean;
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
            existing: false,
            signingKey,
            repository
        });
    }

    updateEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Update,
            entity,
            existing: false,
            signingKey,
            repository
        });
    }

    deleteEntity<T extends VaulticEntity>(entity: T, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Delete,
            entity,
            existing: false,
            repository
        });
    }

    insertExistingEntity<T extends VaulticEntity>(entity: Partial<T>, repository: () => VaulticRepository<any>)
    {
        this.pendingEntities.push({
            operation: Operation.Insert,
            entity,
            existing: true,
            signingKey: "",
            repository
        });
    }

    commit(): Promise<boolean>
    {
        return new Promise((resolve) =>
        {
            environment.databaseDataSouce.transaction(async (manager) =>
            {
                manager.queryRunner?.startTransaction();

                let succeeded = true;
                for (let i = 0; i < this.pendingEntities.length; i++)
                {
                    const pendingEntity = this.pendingEntities[i];
                    if (pendingEntity.operation == Operation.Insert)
                    {
                        if (pendingEntity.existing)
                        {
                            if (!(await pendingEntity.repository().insertExisting(manager, pendingEntity.entity)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else 
                        {
                            if (!(await pendingEntity.repository().signAndInsert(manager, pendingEntity.signingKey!, pendingEntity.entity as VaulticEntity)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                    }
                    else if (pendingEntity.operation == Operation.Update)
                    {
                        if (!(await pendingEntity.repository().signAndUpdate(manager, pendingEntity.signingKey!, pendingEntity.entity as VaulticEntity)))
                        {
                            succeeded = false;
                            break;
                        }
                    }
                    else if (pendingEntity.operation == Operation.Delete)
                    {
                        if (!(await pendingEntity.repository().remove(manager, pendingEntity.entity as VaulticEntity)))
                        {
                            succeeded = false;
                            break;
                        }
                    }
                }

                // the transaction will be rolled back if an error is thrown inside it
                if (!succeeded)
                {
                    throw new Error();
                }
                else 
                {
                    manager.queryRunner?.commitTransaction();
                }

                resolve(succeeded);
            });
        });
    }
}