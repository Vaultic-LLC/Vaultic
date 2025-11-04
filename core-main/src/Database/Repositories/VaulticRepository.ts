import { EntityManager, FindOptionsWhere, Repository } from "typeorm";
import { VaulticEntity } from "../Entities/VaulticEntity";
import { StoreState } from "../Entities/States/StoreState";
import { EntityState } from "@vaultic/shared/Types/Entities";
import { DeepPartial, nameof } from "@vaultic/shared/Helpers/TypeScriptHelper";
import logRepository from "./LogRepository";
import { environment } from "../../Environment";

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

    private async prepDataForSave(key: string, entity: T): Promise<boolean>
    {
        const properties = entity.getCompressableProperties();
        for (let i = 0; i < properties.length; i++)
        {
            if (entity.updatedProperties.findIndex(p => p === properties[i]) == -1)
            {
                continue;
            }

            entity[properties[i]] = await environment.utilities.data.compress(entity[properties[i]]);
        }

        return this.encryptUpdatedProperties(key, entity);
    }

    private encryptUpdatedProperties(key: string, entity: T): Promise<boolean>
    {
        const encryptableProperties = entity.getEncryptableProperties()
        const propertiesToEncrypt = entity.updatedProperties.filter(p => encryptableProperties.includes(p));

        return entity.encryptAndSetEach(key, propertiesToEncrypt);
    }

    public async signAndInsert(manager: EntityManager, key: string, entity: T): Promise<boolean>
    {
        if (!(await this.prepDataForSave(key, entity)))
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
            await logRepository.log(undefined, `Failed to insert entity\n ${e}`);
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
            await logRepository.log(undefined, `Failed to insert existing entity\n ${e}`);
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

        if (!(await this.prepDataForSave(key, entity)))
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
            await logRepository.log(undefined, `Failed to update entity\n ${e}`);
        }

        return false;
    }

    public async override(manager: EntityManager, findBy: number | FindOptionsWhere<T>, entity: DeepPartial<T>): Promise<boolean>
    {
        try 
        {
            const repo = manager.withRepository(this.repository);
            await repo.update(findBy, entity as any);
        }
        catch (e)
        {
            await logRepository.log(undefined, `Failed to override entity\n ${JSON.stringify(entity)}, \n${e}`);
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
            await logRepository.log(undefined, `Failed to reset tracking\n ${e}`);
        }

        return false;
    }

    public async delete(manager: EntityManager, findBy: number | FindOptionsWhere<T>): Promise<boolean>
    {
        const repo = manager.withRepository(this.repository);

        try
        {
            await repo.delete(findBy);
            return true;
        }
        catch (e)
        {
            await logRepository.log(undefined, `Failed to delete entity\n ${e}`);
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

    public async retrieveAndVerifyReactive(key: string, predicate: (repository: Repository<T>) => Promise<T | null>): Promise<T | null>
    {
        const response = await this.retrieveAndVerify(key, predicate);
        if (response[0])
        {
            return response[1].makeReactive();
        }

        return null;
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
}