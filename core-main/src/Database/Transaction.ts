import { environment } from "../Environment";
import { VaulticEntity } from "./Entities/VaulticEntity";
import { VaulticRepository } from "../Types/Repositories";
import { DeepPartial } from "../Helpers/TypeScriptHelper";

enum Operation
{
    Insert,
    Update,
    Reset,
    Delete
}

interface PendingEntity<T extends VaulticEntity>
{
    operation: Operation;
    existing: boolean;
    entity?: VaulticEntity | DeepPartial<T>;
    signingKey?: string;
    id?: number;
    repository: () => VaulticRepository<T>;
}

export default class Transaction 
{
    protected pendingEntities: PendingEntity<any>[];

    constructor() 
    {
        this.pendingEntities = [];
    }

    insertEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Insert,
            entity,
            existing: false,
            signingKey,
            repository
        });
    }

    insertExistingEntity<T extends VaulticEntity>(entity: DeepPartial<T>, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Insert,
            entity,
            existing: true,
            signingKey: "",
            repository
        });
    }

    updateEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Update,
            entity,
            existing: false,
            signingKey,
            repository
        });
    }

    resetTracking<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Reset,
            entity,
            signingKey,
            existing: false,
            repository
        });
    }

    deleteEntity<T extends VaulticEntity>(entityID: number, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Delete,
            id: entityID,
            existing: false,
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
                try 
                {
                    for (let i = 0; i < this.pendingEntities.length; i++)
                    {
                        if (!succeeded)
                        {
                            break;
                        }

                        const pendingEntity = this.pendingEntities[i];
                        if (pendingEntity.operation == Operation.Insert)
                        {
                            if (pendingEntity.existing)
                            {
                                if (!(await pendingEntity.repository().insertExisting(manager, pendingEntity.entity!)))
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
                        else if (pendingEntity.operation == Operation.Reset)
                        {
                            if (!(await pendingEntity.repository().resetTracking(manager, pendingEntity.signingKey!, pendingEntity.entity as VaulticEntity)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else if (pendingEntity.operation == Operation.Delete)
                        {
                            if (!(await pendingEntity.repository().delete(manager, pendingEntity.id!)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                    }
                }
                catch (e)
                {
                    console.log('Error in transaction');
                    console.log(e);
                    succeeded = false;
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