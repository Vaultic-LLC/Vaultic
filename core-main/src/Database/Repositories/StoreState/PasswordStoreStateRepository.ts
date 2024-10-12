import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { PasswordStoreState } from "../../Entities/States/PasswordStoreState";
import { StoreStateRepository } from "./StoreStateRepository";

class PasswordStoreStateRepository extends StoreStateRepository<PasswordStoreState>
{
    protected getRepository(): Repository<PasswordStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(PasswordStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<PasswordStoreState>
    {
        return environment.repositories.passwordStoreStates;
    }

    public async getByID(id: number): Promise<PasswordStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            passwordStoreStateID: id
        }));
    }
}

const passwordStoreStateRepository = new PasswordStoreStateRepository();
export default passwordStoreStateRepository;
export type PasswordStoreStateRepositoryType = typeof passwordStoreStateRepository;