import { In, Repository } from "typeorm";
import { VaulticRepository } from "./VaulticRepository";
import { environment } from "../../Environment";
import Transaction from "../Transaction";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { ClientChangeTrackingType } from "@vaultic/shared/Types/ClientServerTypes";

class ChangeTrackingRepository extends VaulticRepository<ChangeTracking>
{
    protected getRepository(): Repository<ChangeTracking> | undefined
    {
        return environment.databaseDataSouce.getRepository(ChangeTracking);
    }

    public async getChangeTrackingsForUser(masterKey: string, userID: number): Promise<ChangeTracking[]>
    {
        let recievedChangeTrackings = await this.retrieveAndVerifyAll(masterKey, (repository) => repository.find(
            {
                where: {
                    userID: userID,
                    clientTrackingType: ClientChangeTrackingType.User
                },
                order: {
                    changeTrackingID: "ASC"
                }
            }));

        if (!recievedChangeTrackings)
        {
            return [];
        }

        return recievedChangeTrackings as ChangeTracking[];
    }

    public async getChangeTrackingsForUserVault(masterKey: string, userID: number, userVaultIDs: number[]): Promise<{ [key: number]: ChangeTracking[] }>
    {
        let recievedChangeTrackings = await this.retrieveAndVerifyAll(masterKey, (repository) => repository.find(
            {
                where: {
                    userID: userID,
                    userVaultID: In(userVaultIDs),
                    clientTrackingType: ClientChangeTrackingType.UserVault
                },
                order: {
                    changeTrackingID: "ASC"
                }
            }));

        if (!recievedChangeTrackings)
        {
            return [];
        }

        return this.groupChangeTrackingsByID("userVaultID", recievedChangeTrackings as ChangeTracking[]);
    }

    public async getChangeTrackingsForVault(key: string, userID: number, userVaultID: number, vaultID: number): Promise<ChangeTracking[]>
    {
        let recievedChangeTrackings = await this.retrieveAndVerifyAll(key, (repository) => repository.find(
            {
                where: {
                    userID: userID,
                    userVaultID: userVaultID,
                    vaultID: vaultID,
                    clientTrackingType: ClientChangeTrackingType.Vault
                },
                order: {
                    changeTrackingID: "ASC"
                }
            }));

        if (!recievedChangeTrackings)
        {
            return [];
        }

        return recievedChangeTrackings as ChangeTracking[];
    }

    public async clearChangeTrackings(transaction: Transaction)
    {
        // user will be undefined if we are adding it from the server. no change trackings to clear then obviously
        if (!environment.cache.currentUser?.userID)
        {
            return;
        }

        transaction.deleteEntity<ChangeTracking>({ userID: environment.cache.currentUser.userID }, () => environment.repositories.changeTrackings);
    }

    private groupChangeTrackingsByID(idField: "userVaultID" | "vaultID", changeTrackings: ChangeTracking[]): { [key: number]: ChangeTracking[] }
    {
        const groupedChangeTrackings: { [key: number]: ChangeTracking[] } = {};
        for (let i = 0; i < changeTrackings.length; i++)
        {
            if (!groupedChangeTrackings[changeTrackings[i][idField]])
            {
                groupedChangeTrackings[changeTrackings[i][idField]] = [];
            }

            groupedChangeTrackings[changeTrackings[i][idField]].push(changeTrackings[i]);
        }

        return groupedChangeTrackings;
    }
}

const changeTrackingRepository = new ChangeTrackingRepository();
export default changeTrackingRepository;
export type ChangeTrackingRepositoryType = typeof changeTrackingRepository;