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

    protected async signAndSave(masterKey: string, entity: T, userIdentifier: string): Promise<boolean>
    {
        if (!(await entity.sign(masterKey, userIdentifier)))
        {
            return false;
        }

        await this.repository.save(entity);
        return true;
    }

    protected async retrieveAndVerify(masterKey: string, userIdentifier: string, predicate: () => T): Promise<boolean>
    {
        const entity = predicate();
        if (!entity)
        {
            return true;
        }

        return await entity.verify(masterKey, userIdentifier);
    }
}