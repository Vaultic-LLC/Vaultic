import { EntityManager, Repository } from "typeorm";
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

    init(): boolean
    {
        const repository = this.getRepository();
        if (!repository)
        {
            return false;
        }

        this.repository = repository;
        return true;
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
        if (!(await entity.sign(key)))
        {
            return false;
        }

        const repo = manager.withRepository(this.repository);
        await repo.insert(this.getSavableEntity(entity) as any);
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
        const result = await repo.update(entity.identifier(), this.getSavableEntity(entity));

        return result.affected == 1;
    }

    public async remove(manager: EntityManager, entity: T): Promise<boolean>
    {
        const repo = manager.withRepository(this.repository);
        const removedEntity = repo.remove(this.getSavableEntity(entity));

        return !!removedEntity;
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