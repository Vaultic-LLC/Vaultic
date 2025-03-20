import { Repository } from "typeorm";
import { ChangeTracking } from "../Entities/ChangeTracking";
import { VaulticRepository } from "./VaulticRepository";
import { environment } from "../../Environment";
import Transaction from "../Transaction";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { StoreState } from "../Entities/States/StoreState";
import { ObjectPropertyManager, PropertyManagerConstructor } from "@vaultic/shared/Utilities/PropertyManagers";
import { Field } from "@vaultic/shared/Types/Fields";

class ChangeTrackingRepository extends VaulticRepository<ChangeTracking>
{
    protected getRepository(): Repository<ChangeTracking> | undefined
    {
        return environment.databaseDataSouce.getRepository(ChangeTracking);
    }

    public trackStateDifferences(userID: number, masterKey: string, newState: StoreState, oldState: StoreState, transaction: Transaction): string
    {
        try
        {
            this.trackObjectDifferences(userID, masterKey, Field.create(newState), Field.create(oldState), transaction, true);
            return JSON.vaulticStringify(newState);
        }
        catch (e)
        {
            throw e;
        }
    }

    public trackObjectDifferences(userID: number, masterKey: string, newObj: any, oldObj: any, transaction: Transaction, first: boolean = false): boolean
    {
        // used to propagate changes up to the parent object
        let updatedValue = false;

        if (typeof newObj == 'object')
        {
            let manager: ObjectPropertyManager<any> = PropertyManagerConstructor.getFor(newObj);

            const keys = manager.keys(newObj);
            const oldKeys = manager.keys(oldObj);

            for (let i = 0; i < keys.length; i++)
            {
                const oldKeyMatchingIndex = oldKeys.indexOf(keys[i]);

                // not in old keys, it was inserted
                if (oldKeyMatchingIndex < 0)
                {
                    this.insertObject(userID, masterKey, manager.get(keys[i], newObj), transaction);
                }
                // field is in both, check value differences
                else
                {
                    if (this.trackObjectDifferences(userID, masterKey, manager.get(keys[i], newObj), manager.get(oldKeys[oldKeyMatchingIndex], oldObj), transaction))
                    {
                        updatedValue = true;
                    }

                    oldKeys.splice(oldKeyMatchingIndex, 1);
                }
            }

            // all the keys that are in the old obj but not in new obj, they were deleted
            for (let i = 0; i < oldKeys.length; i++)
            {
                updatedValue = true;
                const deletedTime = Date.now();
                transaction.insertEntity(ChangeTracking.deleted(userID, '1', deletedTime), masterKey, () => this);
            }

            // propagated the updated properties up to this object so that we can better merge deleted objects. i.e. if a property is deleted on one device after
            // the object was deleted on another, we still want to keep it
            if (updatedValue)
            {
                transaction.insertEntity(ChangeTracking.updated(userID, '1', 1), masterKey, () => this);
            }
        }
        else
        {
            // Only values have their last modified time set, objects do not. This isn't an issue
            if (newObj != oldObj)
            {
                updatedValue = true;
                transaction.insertEntity(ChangeTracking.updated(userID, '1', 1), masterKey, () => this);
            }
        }

        return updatedValue;
    }

    private insertObject(userID: number, masterKey: string, field: any, transaction: Transaction)
    {
        transaction.insertEntity(ChangeTracking.inserted(userID, '1', 1), masterKey, () => this);

        // all nested objects were also inserted
        if (typeof field == "object")
        {
            let innerManager: ObjectPropertyManager<any> = PropertyManagerConstructor.getFor(field);
            const keys = innerManager.keys(field);

            for (let i = 0; i < keys.length; i++)
            {
                const nestedField = innerManager.get(keys[i], field);
                this.insertObject(userID, masterKey, nestedField, transaction);
            }
        }
    }

    public async getChangeTrackingsByID(masterKey: string, email: string): Promise<Dictionary<ChangeTracking>>
    {
        const changeTrackingByID: Dictionary<ChangeTracking> = {};

        // do findByEmail instead of current since we can't set our currentUser until after merging is done in serverHelper.logIn.
        const user = await environment.repositories.users.findByEmail(masterKey, email);
        if (!user)
        {
            return changeTrackingByID;
        }

        // TODO: these should order by changeTrackingID ascending so that the most recent one will
        // be left in the dictionar if there are multiple
        let changeTrackings = await this.retrieveAndVerifyAll(masterKey, (repository) => repository.find(
            {
                where: {
                    userID: user.userID
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

    public async clearChangeTrackings(masterKey: string, transaction: Transaction)
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