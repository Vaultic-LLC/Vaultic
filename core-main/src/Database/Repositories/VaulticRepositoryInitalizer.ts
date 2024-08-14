import { Repository } from "typeorm";
import { VaulticEntity } from "../Entities/VaulticEntity";

export class VaulticRepositoryInitalizer<T extends VaulticEntity, U extends Repository<T>>
{
    protected repository: U;

    protected getRepository(): Repository<T> | undefined
    {
        return undefined;
    }

    protected getRepositoryExtension(): any 
    {
        return {}
    }

    init(): [boolean, U]
    {
        const repository = this.getRepository();
        if (!repository)
        {
            return [false, {} as U];
        }

        repository.extend({
            ...this.getRepositoryExtension(),
            signAndSave: this.signAndSave,
            retrieveAndVerify: this.retrieveAndVerify
        });

        this.repository = repository as U;
        return [true, this.repository];
    }

    protected async signAndSave(key: string, entity: T, userID: number): Promise<boolean>
    {
        if (!(await entity.sign(key, userID)))
        {
            return false;
        }

        await this.repository.save(entity);
        return true;
    }

    protected async retrieveAndVerify(key: string, userID: number, predicate: () => T): Promise<boolean>
    {
        const entity = predicate();
        if (!entity)
        {
            return true;
        }

        return await entity.verify(key, userID);
    }

    protected async retrieveAndVerifyAll(key: string, userID: number, predicate: () => T[]): Promise<boolean>
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