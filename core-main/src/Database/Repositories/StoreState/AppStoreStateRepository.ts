import { Repository } from "typeorm";
import { environment } from "../../../Environment";
import { AppStoreState } from "../../Entities/States/AppStoreState";
import { VaulticRepository } from "../VaulticRepository";

class AppStoreStateRepository extends VaulticRepository<AppStoreState>
{
    protected getRepository(): Repository<AppStoreState> | undefined
    {
        return environment.databaseDataSouce.getRepository(AppStoreState);
    }
}

const appStoreStateRepository = new AppStoreStateRepository();
export default appStoreStateRepository;
export type AppStoreStateRepositoryType = typeof appStoreStateRepository;