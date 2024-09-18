import { Entity, EntityManager, Repository } from "typeorm";
import { VaulticEntity } from "../Entities/VaulticEntity";
import { EntityState } from "../../Types/Properties";

export class VaulticRepository<T extends VaulticEntity>
{
    protected repository: Repository<T>;

    protected getRepository(): Repository<T> | undefined
    {
        return undefined;
    }

    protected getRepositoryExtension(): any 
    {
        return {}
    }

    init()
    {
        const repository = this.getRepository();
        if (!repository)
        {
            throw "couldn't get repository";
        }

        this.repository = repository;
    }

    public async retrieveReactive(predicate: (repository: Repository<T>) => Promise<T | null>): Promise<T | null>
    {
        const entity = await predicate(this.repository);
        if (entity)
        {
            return entity.makeReactive() as T;
        }

        return null;
    }

    public async retrieveManyReactive(predicate: (repository: Repository<T>) => Promise<T[]>): Promise<T[]>
    {
        const entities = await predicate(this.repository);
        return entities.map(e => e.makeReactive() as T)
    }

    private async checkAndSign(key: string, entity: T): Promise<boolean>
    {
        const signableProperties = entity.getSignableProperties();
        for (let i = 0; i < signableProperties.length; i++)
        {
            if (entity.updatedProperties.includes(signableProperties[i]))
            {
                return await entity.sign(key);
            }
        }

        return true;
    }

    private getSavableEntity(entity: T): any
    {
        const { updatedProperties, propertiesToSync, ...saveableEntity } = entity;
        return saveableEntity;
    }

    public async signAndInsert(manager: EntityManager, key: string, entity: T): Promise<boolean>
    {
        if (!(await entity.lock(key)))
        {
            return false;
        }

        if (!(await entity.sign(key)))
        {
            return false;
        }

        const repo = manager.withRepository(this.repository);
        entity.entityState = EntityState.Inserted;

        try 
        {
            await repo.insert(this.getSavableEntity(entity) as any);
        }
        catch (e)
        {
            console.log(`Filed to insert entity: ${JSON.stringify(entity)}`)
            console.log(e);
            return false;
        }

        return true;
    }

    public async signAndUpdate(manager: EntityManager, key: string, entity: T): Promise<boolean>
    {
        if (entity.updatedProperties.length == 0)
        {
            return true;
        }

        if (!(await this.checkAndSign(key, entity)))
        {
            return false;
        }

        const repo = manager.withRepository(this.repository);

        // the entity hasn't been synced to the server yet so keeping it 
        // as inserted makes it easier to merge in case there are conflicts
        if (entity.entityState != EntityState.Inserted)
        {
            entity.entityState = EntityState.Updated;
        }

        const mockEntity = {}
        for (let i = 0; i < entity.updatedProperties.length; i++)
        {
            mockEntity[entity.updatedProperties[i]] = entity[entity.updatedProperties[i]];
        }

        try 
        {
            const result = await repo.update(entity.identifier(), mockEntity);
            return result.affected == 1;
        }
        catch (e)
        {
            console.log(`Filed to update entity: ${JSON.stringify(entity)}`)
            console.log(e);
        }

        return false;
    }

    public async remove(manager: EntityManager, entity: T): Promise<boolean>
    {
        const repo = manager.withRepository(this.repository);

        try 
        {
            const removedEntity = await repo.remove(this.getSavableEntity(entity));
            return removedEntity.length == 1;
        }
        catch (e)
        {
            console.log(`Filed to delete entity: ${JSON.stringify(entity)}`)
            console.log(e);
        }

        return false;
    }

    public async retrieveAndVerify(key: string, predicate: (repository: Repository<T>) => Promise<T | null>): Promise<[boolean, T | null]>
    {
        const entity = await predicate(this.repository);
        if (!entity)
        {
            return [true, null];
        }

        if (!(await entity.verify(key)))
        {
            return [false, null];
        }

        return [true, entity];
    }

    public async retrieveAndVerifyAll(key: string, predicate: (repository: Repository<T>) => Promise<T[]>): Promise<T[] | boolean>
    {
        const entities = await predicate(this.repository);
        for (let i = 0; i < entities.length; i++)
        {
            if (!(await entities[i].verify(key)))
            {
                return false;
            }
        }

        return entities;
    }

    public async getEntityThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<T> | null]>
    {
        return [false, null];
    }

    public async getEntitiesThatNeedToBeBackedUp(masterKey: string): Promise<[boolean, Partial<T>[] | null]>
    {
        return [false, null];
    }

    public async resetBackupTrackingForEntity(entity: Partial<T>): Promise<boolean>
    {
        return true;
    }

    public async resetBackupTrackingForEntities(entities: Partial<T>[]): Promise<boolean>
    {
        return true;
    }
}