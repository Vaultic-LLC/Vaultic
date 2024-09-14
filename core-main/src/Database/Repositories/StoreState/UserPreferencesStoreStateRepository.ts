import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { UserPreferencesStoreState } from "../../Entities/States/UserPreferencesStoreState";

class UserPreferencesStoreStateRepository extends VaulticRepository<UserPreferencesStoreState>
{
    protected getRepository(): Repository<UserPreferencesStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserPreferencesStoreState);
    }
}

const userPreferencesStoreStateRepository = new UserPreferencesStoreStateRepository();
export default userPreferencesStoreStateRepository;
export type UserPreferencesStoreStateRepositoryType = typeof userPreferencesStoreStateRepository;