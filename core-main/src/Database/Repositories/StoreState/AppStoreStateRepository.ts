import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { AppStoreState } from "../../Entities/States/AppStoreState";
import { StoreStateRepository } from "./StoreStateRepository";
import { VaulticRepository } from "../VaulticRepository";

class AppStoreStateRepository extends StoreStateRepository<AppStoreState>
{
    protected getRepository(): Repository<AppStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(AppStoreState);
    }

    protected getVaulticRepository(): VaulticRepository<AppStoreState>
    {
        return environment.repositories.appStoreStates;
    }

    public async getByID(id: number): Promise<AppStoreState | null>
    {
        return this.retrieveReactive((repository) => repository.findOneBy({
            appStoreStateID: id
        }));
    }
}

const appStoreStateRepository = new AppStoreStateRepository();
export default appStoreStateRepository;
export type AppStoreStateRepositoryType = typeof appStoreStateRepository;