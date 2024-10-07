import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { VaulticRepository } from "../VaulticRepository";
import { UserPreferencesStoreState } from "../../Entities/States/UserPreferencesStoreState";
import { StoreStateRepository } from "./StoreStateRepository";

class UserPreferencesStoreStateRepository extends StoreStateRepository<UserPreferencesStoreState>
{
    protected getRepository(): Repository<UserPreferencesStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(UserPreferencesStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<UserPreferencesStoreState>
    {
        return environment.repositories.userPreferencesStoreStates;
    }

    public async getByID(id: number): Promise<UserPreferencesStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            userPreferencesStoreStateID: id
        }));
    }
}

const userPreferencesStoreStateRepository = new UserPreferencesStoreStateRepository();
export default userPreferencesStoreStateRepository;
export type UserPreferencesStoreStateRepositoryType = typeof userPreferencesStoreStateRepository;