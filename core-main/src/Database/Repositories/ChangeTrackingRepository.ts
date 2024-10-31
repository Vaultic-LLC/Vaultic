import { Repository } from "typeorm";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { VaulticRepository } from "./VaulticRepository";
import { environment } from "../../Environment";
import Transaction from "../Transaction";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";

class ChangeTrackingRepository extends VaulticRepository<ChangeTracking>
{
    protected getRepository(): Repository<ChangeTracking> | undefined
    {
        return environment.databaseDataSouce.getRepository(ChangeTracking);
    }

    public trackObjectDifferences(masterKey: string, newObj: any, oldObj: any, transaction: Transaction)
    {
        // TODO: does this work with Sets? No. 
        // This also doesn't work for arrays either. Could just turn all arrays and Sets in Maps keyed by field.id or 
        // whatever the application for it is
        // TODO: might have to do something specific for getting, setting, updating, and deleting if the obj is a map
        if (typeof newObj.value == 'object')
        {
            const keys = Object.keys(newObj.value);
            const oldKeys = Object.keys(oldObj.value);

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
                    this.trackObjectDifferences(masterKey, newObj.value[keys[i]], oldObj.value[oldKeys[oldKeyMatchingIndex]], transaction);
                    oldKeys.splice(oldKeyMatchingIndex, 1);
                }
            }

            // all the keys that are in the old obj but not in new obj, they were deleted
            for (let i = 0; i < oldKeys.length; i++)
            {
                transaction.insertEntity(ChangeTracking.deleted(oldObj.value[oldKeys[i]].id, Date.now()), masterKey, () => this);
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
    }

    public async getChangeTrackingsByID(masterKey: string): Promise<Dictionary<ChangeTracking>>
    {
        const changeTrackingByID: Dictionary<ChangeTracking> = {};
        let changeTrackings = await this.retrieveAndVerifyAll(masterKey, (repository) => repository.find());
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
}

const changeTrackingRepository = new ChangeTrackingRepository();
export default changeTrackingRepository;
export type ChangeTrackingRepositoryType = typeof changeTrackingRepository;