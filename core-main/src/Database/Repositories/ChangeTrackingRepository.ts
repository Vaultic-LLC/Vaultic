import { Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepository";
import { environment } from "../../Environment";
import Transaction from "../Transaction";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { ChangeTrackingsByType } from "../../Types/Responses";
import { ClientChangeTrackingType } from "@vaultic/shared/Types/ClientServerTypes";

class ChangeTrackingRepository extends VaulticRepository<ChangeTracking>
{
    protected getRepository(): Repository<ChangeTracking> | undefined
    {
        return environment.databaseDataSouce.getRepository(ChangeTracking);
    }

    public async getChangeTrackingsByStoreType(masterKey: string, email: string): Promise<ChangeTrackingsByType>
    {
        const changeTrackingByStore: ChangeTrackingsByType = {};

        // do findByEmail instead of current since we can't set our currentUser until after merging is done in serverHelper.logIn.
        const user = await environment.repositories.users.findByEmail(masterKey, email);
        if (!user)
        {
            return changeTrackingByStore;
        }

        let recievedChangeTrackings = await this.retrieveAndVerifyAll(masterKey, (repository) => repository.find(
            {
                where: {
                    userID: user.userID
                },
                order: {
                    changeTrackingID: "ASC"
                }
            }));

        if (!recievedChangeTrackings)
        {
            return changeTrackingByStore;
        }

        const changeTrackings = recievedChangeTrackings as ChangeTracking[];
        for (let i = 0; i < changeTrackings.length; i++)
        {
            if (!changeTrackingByStore[changeTrackings[i].clientTrackingType])
            {
                switch (changeTrackings[i].clientTrackingType)
                {
                    case ClientChangeTrackingType.User:
                        changeTrackingByStore[ClientChangeTrackingType.User] = [];
                        break;
                    case ClientChangeTrackingType.UserVault:
                        changeTrackingByStore[ClientChangeTrackingType.UserVault] = {};
                        break;
                    case ClientChangeTrackingType.Vault:
                        changeTrackingByStore[ClientChangeTrackingType.Vault] = {};
                        break;
                }
            }

            switch (changeTrackings[i].clientTrackingType)
            {
                case ClientChangeTrackingType.User:
                    changeTrackingByStore[ClientChangeTrackingType.User].push(changeTrackings[i]);
                    break;
                case ClientChangeTrackingType.UserVault:
                    if (!changeTrackingByStore[ClientChangeTrackingType.UserVault][changeTrackings[i].userVaultID])
                    {
                        changeTrackingByStore[ClientChangeTrackingType.UserVault][changeTrackings[i].userVaultID] = [];
                    }

                    changeTrackingByStore[ClientChangeTrackingType.UserVault][changeTrackings[i].userVaultID].push(changeTrackings[i]);
                    break;
                case ClientChangeTrackingType.Vault:
                    if (!changeTrackingByStore[ClientChangeTrackingType.Vault][changeTrackings[i].vaultID])
                    {
                        changeTrackingByStore[ClientChangeTrackingType.Vault][changeTrackings[i].vaultID] = [];
                    }

                    changeTrackingByStore[ClientChangeTrackingType.Vault][changeTrackings[i].vaultID].push(changeTrackings[i]);
                    break;
            }
        }

        return changeTrackingByStore;
    }

    public clearChangeTrackings(transaction: Transaction)
    {
        // user will be undefined if we are adding it from the server. no change trackings to clear then obviously
        if (environment.cache.currentUser?.userID)
        {
            transaction.deleteEntity<ChangeTracking>({ userID: environment.cache.currentUser.userID }, () => environment.repositories.changeTrackings);
        }
    }
}

const changeTrackingRepository = new ChangeTrackingRepository();
export default changeTrackingRepository;
export type ChangeTrackingRepositoryType = typeof changeTrackingRepository;