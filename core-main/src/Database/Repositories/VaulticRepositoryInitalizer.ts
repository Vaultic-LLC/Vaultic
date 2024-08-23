import { EntityManager, Repository } from "typeorm";
import { VaulticEntity } from "../Entities/VaulticEntity";

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

    public async signAndInsert(manager: EntityManager, key: string, entity: T, userID: number): Promise<boolean>
    {
        if (!(await entity.sign(key, userID)))
        {
            return false;
        }

        const repo = manager.withRepository(this.repository);
        await repo.insert(entity);
        return true;
    }

    public async signAndUpdate(manager: EntityManager, key: string, entity: T, userID: number): Promise<boolean>
    {
        if (!(await entity.sign(key, userID)))
        {
            return false;
        }

        const repo = manager.withRepository(this.repository);
        await repo.update(entity.identifier(), entity);
        return true;
    }

    public async remove(manager: EntityManager, entity: T): Promise<boolean>
    {
        const repo = manager.withRepository(this.repository);
        const removedEntity = repo.remove(entity);

        return !!removedEntity;
    }

    public async retrieveAndVerify(key: string, userID: number, predicate: () => T): Promise<boolean>
    {
        const entity = predicate();
        if (!entity)
        {
            return true;
        }

        return await entity.verify(key, userID);
    }

    public async retrieveAndVerifyAll(key: string, userID: number, predicate: () => T[]): Promise<boolean>
    {
        const entities = predicate();
        if (entities.length == 0)
        {
            return true;
        }

        for (let i = 0; i < entities.length; i++)
        {
            if (!(await entities[i].verify(key, userID)))
            {
                return false;
            }
        }

        return true;
    }
}