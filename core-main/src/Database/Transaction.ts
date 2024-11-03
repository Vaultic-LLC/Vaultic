import { environment } from "../Environment";
import { VaulticEntity } from "./Entities/VaulticEntity";
import { VaulticRepository } from "../Types/Repositories";
import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { FindOptionsWhere } from "typeorm";

enum Operation
{
    Insert,
    InsertExisting,
    Update,
    Override,
    Reset,
    Delete,
    Raw
}

interface PendingEntity<T extends VaulticEntity>
{
    operation: Operation;
    entity?: VaulticEntity | DeepPartial<T>;
    signingKey?: string;
    findBy?: number | FindOptionsWhere<T>;
    sql?: string;
    repository?: () => VaulticRepository<T>;
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
            signingKey,
            repository
        });
    }

    insertExistingEntity<T extends VaulticEntity>(entity: DeepPartial<T>, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.InsertExisting,
            entity,
            signingKey: "",
            repository
        });
    }

    updateEntity<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Update,
            entity,
            signingKey,
            repository
        });
    }

    overrideEntity<T extends VaulticEntity>(findBy: number, entity: DeepPartial<T>, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Override,
            findBy,
            entity,
            repository
        });
    }

    resetTracking<T extends VaulticEntity>(entity: T, signingKey: string, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Reset,
            entity,
            signingKey,
            repository
        });
    }

    deleteEntity<T extends VaulticEntity>(findBy: number | FindOptionsWhere<T>, repository: () => VaulticRepository<T>)
    {
        this.pendingEntities.push({
            operation: Operation.Delete,
            findBy,
            repository
        });
    }

    raw(sql: string)
    {
        this.pendingEntities.push({
            operation: Operation.Raw,
            sql
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
                            if (!(await pendingEntity.repository!().signAndInsert(manager, pendingEntity.signingKey!, pendingEntity.entity as VaulticEntity)))
                            {
                                succeeded = false;
                                break;
                            }

                        }
                        else if (pendingEntity.operation == Operation.InsertExisting)
                        {
                            if (!(await pendingEntity.repository!().insertExisting(manager, pendingEntity.entity!)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else if (pendingEntity.operation == Operation.Update)
                        {
                            if (!(await pendingEntity.repository!().signAndUpdate(manager, pendingEntity.signingKey!, pendingEntity.entity as VaulticEntity)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else if (pendingEntity.operation == Operation.Override)
                        {
                            if (!(await pendingEntity.repository!().override(manager, pendingEntity.findBy!, pendingEntity.entity as VaulticEntity)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else if (pendingEntity.operation == Operation.Reset)
                        {
                            if (!(await pendingEntity.repository!().resetTracking(manager, pendingEntity.signingKey!, pendingEntity.entity as VaulticEntity)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else if (pendingEntity.operation == Operation.Delete)
                        {
                            if (!(await pendingEntity.repository!().delete(manager, pendingEntity.findBy!)))
                            {
                                succeeded = false;
                                break;
                            }
                        }
                        else if (pendingEntity.operation == Operation.Raw)
                        {
                            await manager.query(pendingEntity.sql!);
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