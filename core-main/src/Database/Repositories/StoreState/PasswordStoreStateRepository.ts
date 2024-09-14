import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { PasswordStoreState } from "../../Entities/States/PasswordStoreState";

class PasswordStoreStateRepository extends VaulticRepository<PasswordStoreState>
{
    protected getRepository(): Repository<PasswordStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(PasswordStoreState);
    }
}

const passwordStoreStateRepository = new PasswordStoreStateRepository();
export default passwordStoreStateRepository;
export type PasswordStoreStateRepositoryType = typeof passwordStoreStateRepository;