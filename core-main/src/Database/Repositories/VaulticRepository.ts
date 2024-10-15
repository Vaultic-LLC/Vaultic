import { EntityManager, Repository } from "typeorm";
import { VaulticEntity } from "../Entities/VaulticEntity";
import { EntityState } from "../../Types/Properties";
import { DeepPartial, nameof } from "../../Helpers/TypeScriptHelper";
import { StoreState } from "../Entities/States/StoreState";

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

    private encryptUpdatedProperties(key: string, entity: T): Promise<boolean>
    {
        const encryptableProperties = entity.getEncryptableProperties()
        const propertiesToEncrypt = entity.updatedProperties.filter(p => encryptableProperties.includes(p));

        return entity.encryptAndSetEach(key, propertiesToEncrypt);
    }

    public async signAndInsert(manager: EntityManager, key: string, entity: T): Promise<boolean>
    {
        if (!(await this.encryptUpdatedProperties(key, entity)))
        {
            return false;
        }

        if (!(await entity.sign(key)))
        {
            return false;
        }

        entity.preInsert();
        entity.entityState = EntityState.Inserted;

        try 
        {
            const repo = manager.withRepository(this.repository);
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

    public async insertExisting(manager: EntityManager, entity: DeepPartial<T>): Promise<boolean>
    {
        entity.entityState = EntityState.Unchanged;
        entity.serializedPropertiesToSync = "[]";

        try 
        {
            const repo = manager.withRepository(this.repository);
            await repo.insert(entity as any);
        }
        catch (e)
        {
            console.log(`Filed to insert existing entity: ${JSON.stringify(entity)}`)
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

        if (!(await this.encryptUpdatedProperties(key, entity)))
        {
            return false;
        }

        if (!(await this.checkAndSign(key, entity)))
        {
            return false;
        }

        const repo = manager.withRepository(this.repository);

        // If EntityState = Insertered, the entity hasn't been synced to the server yet so keeping it 
        // as inserted makes it easier to merge in case there are conflicts.
        // If entityState = Deleted, we need to let the server know so don't change it
        if (entity.entityState == EntityState.Unchanged && entity.propertiesToSync.length > 0)
        {
            entity.entityState = EntityState.Updated;
        }

        const mockEntity = {};
        mockEntity[nameof<VaulticEntity>("serializedPropertiesToSync")] = entity.serializedPropertiesToSync;

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

    public async override(manager: EntityManager, id: number, entity: DeepPartial<T>): Promise<boolean>
    {
        try 
        {
            const repo = manager.withRepository(this.repository);
            await repo.update(id, entity as any);
        }
        catch (e)
        {
            console.log(`Filed to override entity: ${JSON.stringify(entity)}`)
            console.log(e);
            return false;
        }

        return true;
    }

    public async resetTracking(manager: EntityManager, key: string, entity: T): Promise<boolean>
    {
        const mockEntity = {};
        if ('previousSignature' in entity)
        {
            entity.previousSignature = entity.currentSignature;
            if (!(await entity.sign(key)))
            {
                return false;
            }

            mockEntity[nameof<StoreState>("previousSignature")] = entity.previousSignature;
            mockEntity[nameof<VaulticEntity>("currentSignature")] = entity.currentSignature;
        }

        mockEntity[nameof<VaulticEntity>("serializedPropertiesToSync")] = "[]";
        mockEntity[nameof<VaulticEntity>("entityState")] = EntityState.Unchanged;

        const repo = manager.withRepository(this.repository);
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

    public async delete(manager: EntityManager, entityID: number): Promise<boolean>
    {
        const repo = manager.withRepository(this.repository);

        try
        {
            const removedEntity = await repo.delete(entityID);
            return removedEntity.affected == 1;
        }
        catch (e)
        {
            console.log(`Filed to delete entity: ${JSON.stringify(entityID)}`)
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

        const response = await entity.verify(key);
        if (!response)
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
            const response = await entities[i].verify(key);
            if (!response)
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
}