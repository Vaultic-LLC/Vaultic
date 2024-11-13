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

    public trackStateDifferences(userID: number, masterKey: string, newState: StoreState, oldState: StoreState, transaction: Transaction): string
    {
        try 
        {
            console.log(`\nNew state: ${JSON.vaulticStringify(newState)}`);
            console.log(`\nOld State: ${JSON.vaulticStringify(oldState)}`);

            this.trackObjectDifferences(userID, masterKey, new Field(newState), new Field(oldState), transaction);
            return JSON.vaulticStringify(newState);
        }
        catch (e)
        {
            console.log(e);
            throw e;
        }
    }

    public trackObjectDifferences(userID: number, masterKey: string, newObj: any, oldObj: any, transaction: Transaction): boolean
    {
        // used to propagate changes up to the parent object
        let updatedValue = false;

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
                    this.insertObject(userID, masterKey, manager.get(keys[i], newObj.value), transaction);
                }
                // field is in both, check value differences
                else
                {
                    if (this.trackObjectDifferences(userID, masterKey, manager.get(keys[i], newObj.value), manager.get(oldKeys[oldKeyMatchingIndex], oldObj.value), transaction))
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
                console.log(`\nDeleted: ${oldKeys[i]} in ${JSON.vaulticStringify(oldObj)} at ${deletedTime}`);
                transaction.insertEntity(ChangeTracking.deleted(userID, manager.get(oldKeys[i], oldObj.value).id, deletedTime), masterKey, () => this);
            }

            // propagated the updated properties up to this object so that we can better merge deleted objects. i.e. if a property is deleted on one device after
            // the object was deleted on another, we still want to keep it
            if (updatedValue)
            {
                console.log(`\nUpdatedValue: ${JSON.vaulticStringify(newObj)}`);
                newObj.lastModifiedTime = Date.now();
                transaction.insertEntity(ChangeTracking.updated(userID, newObj.id, newObj.lastModifiedTime), masterKey, () => this);
            }
        }
        else 
        {
            // Only values have their last modified time set, objects do not. This isn't an issue
            if (newObj.forceUpdate === true || newObj.value != oldObj.value)
            {
                console.log(`\nUpdated obj. New: ${JSON.vaulticStringify(newObj)}, Old: ${JSON.vaulticStringify(oldObj)}`);
                updatedValue = true;
                newObj.lastModifiedTime = Date.now();
                newObj.forceUpdate = false;

                transaction.insertEntity(ChangeTracking.updated(userID, newObj.id, newObj.lastModifiedTime), masterKey, () => this);
            }
        }

        return updatedValue;
    }

    private insertObject(userID: number, masterKey: string, field: any, transaction: Transaction)
    {
        field.id = environment.utilities.generator.uniqueId();
        field.lastModifiedTime = Date.now();

        transaction.insertEntity(ChangeTracking.inserted(userID, field.id, field.lastModifiedTime), masterKey, () => this);

        // all nested objects were also inserted, update their IDs and LastModifiedTime as well
        if (typeof field.value == "object")
        {
            let innerManager: ObjectPropertyManager<any> = field.value instanceof Map ? new MapPropertyManager() : new ObjectPropertyManager();
            const keys = innerManager.keys(field.value);

            for (let i = 0; i < keys.length; i++)
            {
                const nestedField = innerManager.get(keys[i], field.value);
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
        const currentUser = await environment.repositories.users.getVerifiedCurrentUser(masterKey);

        // user will be undefined if we are adding it from the server. no change trackings to clear then obviously
        if (currentUser)
        {
            transaction.deleteEntity<ChangeTracking>({ userID: currentUser.userID }, () => environment.repositories.changeTrackings);
        }
    }
}

const changeTrackingRepository = new ChangeTrackingRepository();
export default changeTrackingRepository;
export type ChangeTrackingRepositoryType = typeof changeTrackingRepository;