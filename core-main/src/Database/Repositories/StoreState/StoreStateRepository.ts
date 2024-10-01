import { environment } from "../../../Environment";
import { StoreState } from "../../Entities/States/StoreState";
import Transaction from "../../Transaction";
import { VaulticRepository } from "../VaulticRepository";

export class StoreStateRepository<T extends StoreState> extends VaulticRepository<T>
{
    protected getVaulticRepository(): VaulticRepository<T>
    {
        return {} as VaulticRepository<T>;
    }

    public async getByID(id: number): Promise<T | null>
    {
        return {} as T
    }

    public async updateState(id: number, key: string, state: string, transaction: Transaction, encrypt: boolean = true): Promise<boolean>
    {
        const entity = await this.getByID(id);
        if (!entity)
        {
            console.log('no entity');
            return false;
        }

        entity.state = state;
        transaction.updateEntity(entity, key, this.getVaulticRepository);

        return true;
    }
}