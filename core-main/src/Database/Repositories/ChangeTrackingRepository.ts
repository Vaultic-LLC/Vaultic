import { Repository } from "typeorm";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { VaulticRepository } from "./VaulticRepository";
import { environment } from "../../Environment";
import Transaction from "../Transaction";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { StoreState } from "../Entities/States/StoreState";
import { Field } from "@vaultic/shared/Types/Fields";
import { MapPropertyManager, ObjectPropertyManager } from "../../Types/Properties";

class ChangeTrackingRepository extends VaulticRepository<ChangeTracking>
{
    protected getRepository(): Repository<ChangeTracking> | undefined
    {
        return environment.databaseDataSouce.getRepository(ChangeTracking);
    }

    public trackStateDifferences(masterKey: string, newState: StoreState, oldState: StoreState, transaction: Transaction): string
    {
        const updatedState = this.trackObjectDifferences(masterKey, new Field(newState), new Field(oldState), transaction);
        return JSON.vaulticStringify(updatedState);
    }

    public trackObjectDifferences(masterKey: string, newObj: any, oldObj: any, transaction: Transaction)
    {
        if (typeof newObj.value == 'object')
        {
            let manager: ObjectPropertyManager<any> = newObj.value instanceof Map ? new MapPropertyManager() : new ObjectPropertyManager();

            const keys = manager.keys(newObj.value);
            const oldKeys = manager.keys(oldObj.value);

            for (let i = 0; i < keys.length; i++)
            {
                const oldKeyMatchingIndex = oldKeys.indexOf(keys[i]);

                // not in old keys, it was inserted
                if (oldKeyMatchingIndex < 0)
                {
                    newObj.id = environment.utilities.generator.uniqueId();
                    newObj.lastModifiedTime = Date.now();
                    transaction.insertEntity(ChangeTracking.inserted(newObj.id, newObj.lastModifiedTime), masterKey, () => this);
                }
                else
                {
                    this.trackObjectDifferences(masterKey, manager.get(keys[i], newObj.value), manager.get(oldKeys[oldKeyMatchingIndex], oldObj.value), transaction);
                    oldKeys.splice(oldKeyMatchingIndex, 1);
                }
            }

            // all the keys that are in the old obj but not in new obj, they were deleted
            for (let i = 0; i < oldKeys.length; i++)
            {
                transaction.insertEntity(ChangeTracking.deleted(manager.get(oldKeys[i], oldObj.value).id, Date.now()), masterKey, () => this);
            }
        }
        else 
        {
            // Only values have their last modified time set, objects do not. This isn't an issue
            if (newObj.value != oldObj.value)
            {
                // TODO: make sure this actually works. Otherwise I will need to return newObj. Same with id above
                newObj.lastModifiedTime = Date.now();
                transaction.insertEntity(ChangeTracking.updated(newObj.id, newObj.lastModifiedTime), masterKey, () => this);
            }
        }

        return newObj;
    }

    public async getChangeTrackingsByID(masterKey: string): Promise<Dictionary<ChangeTracking>>
    {
        const changeTrackingByID: Dictionary<ChangeTracking> = {};

        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);
        if (!currentUser)
        {
            return changeTrackingByID;
        }

        let changeTrackings = await this.retrieveAndVerifyAll(masterKey, (repository) => repository.find(
            {
                where: {
                    userID: currentUser.userID
                }
            }));

        if (!changeTrackings)
        {
            return changeTrackingByID;
        }

        changeTrackings = changeTrackings as ChangeTracking[];
        for (let i = 0; i < changeTrackings.length; i++)
        {
            changeTrackingByID[changeTrackings[i].objectID] = changeTrackings[i];
        }

        return changeTrackingByID;
    }

    public async clearChangeTrackings()
    {

    }
}

const changeTrackingRepository = new ChangeTrackingRepository();
export default changeTrackingRepository;
export type ChangeTrackingRepositoryType = typeof changeTrackingRepository;