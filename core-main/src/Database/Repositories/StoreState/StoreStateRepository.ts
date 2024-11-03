import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreState } from "../../Entities/States/StoreState";
import Transaction from "../../Transaction";
import { VaulticRepository } from "../VaulticRepository";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { environment } from "../../../Environment";
import { ChangeTracking } from "../../Entities/ChangeTracking";
import { MapPropertyManager, ObjectPropertyManager } from "../../../Types/Properties";

export class StoreStateRepository<T extends StoreState> extends VaulticRepository<T>
{
    protected getVaulticRepository(): VaulticRepository<T>
    {
        return {} as VaulticRepository<T>;
    }

    public async getByID(id: number): Promise<T | null>
    {
        return {} as T
    }

    public async updateState(id: number, key: string, state: string, transaction: Transaction): Promise<boolean>
    {
        const entity = await this.getByID(id);
        if (!entity)
        {
            console.log('no entity');
            return false;
        }

        entity.state = state;
        transaction.updateEntity(entity, key, this.getVaulticRepository);

        return true;
    }

    public async mergeStates(key: string, currentStateID: number, newState: DeepPartial<StoreState>, changeTrackings: Dictionary<ChangeTracking>,
        transaction: Transaction, decrypt: boolean = true)
    {
        let currentState = await this.getByID(currentStateID);
        if (!currentState || (key && !(await currentState.verify(key))))
        {
            return false;
        }

        let newStateToUse = newState.state;
        let currentStateToUse = currentState.state;

        if (decrypt)
        {
            const decryptedCurrentState = await environment.utilities.crypt.decrypt(key, currentStateToUse);
            if (!decryptedCurrentState.success)
            {
                return false;
            }

            const decyptedNewState = await environment.utilities.crypt.decrypt(key, newStateToUse);
            if (!decyptedNewState.success)
            {
                return false;
            }

            currentStateToUse = decryptedCurrentState.value;
            newStateToUse = decyptedNewState.value;
        }

        this.mergeStoreStates(currentStateToUse, newStateToUse, changeTrackings);
        currentState.state = currentStateToUse;
        currentState.previousSignature = newState.previousSignature;

        transaction.updateEntity(currentState, key, this.getVaulticRepository);
        return true;
    }

    private mergeStoreStates(currentObj: any, newObj: any, changeTrackings: Dictionary<ChangeTracking>)
    {
        if (typeof newObj.value == 'object')
        {
            const manager: ObjectPropertyManager<any> = newObj.value instanceof Map ? new MapPropertyManager() : new ObjectPropertyManager();

            const keys = manager.keys(newObj.value);
            const currentKeys = manager.keys(currentObj.value);

            for (let i = 0; i < keys.length; i++)
            {
                const currentKeyMatchingIndex = currentKeys.indexOf(keys[i]);

                // not in current keys. Check to see if it was deleted locally or if it was inserted / created on another device
                if (currentKeyMatchingIndex < 0)
                {
                    const changeTracking = changeTrackings[manager.get(keys[i], newObj.value).id];

                    // wasn't altered locally, was added on another device
                    if (!changeTracking)
                    {
                        manager.set(keys[i], manager.get(keys[i], newObj.value), currentObj);
                    }
                    // was deleted locally, check to make sure that it was deleted before any updates to the 
                    // object on another device were
                    else
                    {
                        // object was edited on another device after it was deleted on this one, keep it
                        // TODO: this can cause data integrity issues. If I delete a filter on another device and 
                        // it was an empty filter, it is no longer in empty filters. This will add the filter back but 
                        // not add it back to empty filters. Or would it? That filter in emptyFilters would have a changeTracking
                        // record for deleted. It still wouldn't because the Field in emptyFilters doesn't get updated if 
                        // it doesn't change, i.e. editing the filter wouldn't update the Field<string> of the id in emptyFilters lastModifiedTime
                        // so this check would fail. If I also updated the lastModifiedTime of the record in emptyFilters, then this would work and
                        // add it back here. Do I have to worry abou that below as well where I am potentially keeping records that were 
                        // deleted? Yes, but there I can't confirm times?
                        // TODO: test this. Duplicate and empty values should now be updated whenever their backing data type is updated, making them
                        // also stay if this condition is met
                        if (changeTracking.lastModifiedTime < manager.get(keys[i], newObj.value).lastModifiedTime)
                        {
                            manager.set(keys[i], manager.get(keys[i], newObj.value), currentObj.value);
                        }
                    }
                }
                else
                {
                    // both objects exist, check them
                    this.mergeStoreStates(manager.get(currentKeys[currentKeyMatchingIndex], currentObj.value), manager.get(keys[i], newObj.value), changeTrackings);
                    currentKeys.splice(currentKeyMatchingIndex, 1);
                }
            }

            // all the keys that are in the current obj, but not the newObj.
            for (let i = 0; i < currentKeys.length; i++)
            {
                const changeTracking = changeTrackings[manager.get(currentKeys[i], currentObj.value).id];

                // wasn't modified locally and not in newObj, it was deleted on another device.
                // If state is Inserted, we want to keep it. 
                // If state is Updated, we want to keep it since we can't check when it was deleted on another device
                // If state is Deleted, it wouldn't be in currentKeys
                if (!changeTracking)
                {
                    manager.delete(currentKeys[i], currentObj.value);
                }
            }
        }
        // Only values have their last modified time set, objects do not. This isn't an issue
        else 
        {
            if (currentObj.value != newObj.value && currentObj.lastModifiedTime < newObj.lastModifiedTime)
            {
                currentObj = newObj;
            }
        }
    }
}