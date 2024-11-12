import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreState } from "../../Entities/States/StoreState";
import Transaction from "../../Transaction";
import { VaulticRepository } from "../VaulticRepository";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { environment } from "../../../Environment";
import { ChangeTracking } from "../../Entities/ChangeTracking";
import { MapPropertyManager, ObjectPropertyManager } from "../../../Types/Properties";
import { Field } from "@vaultic/shared/Types/Fields";

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
            return false;
        }

        entity.state = state;
        transaction.updateEntity(entity, key, this.getVaulticRepository);

        return true;
    }

    public async mergeStates(key: string, currentStateID: number, newState: DeepPartial<StoreState>, changeTrackings: Dictionary<ChangeTracking>,
        transaction: Transaction, decrypt: boolean = true)
    {
        //console.log(`\nmerging state for ${JSON.vaulticStringify(newState)}`);
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

        console.log(`\nupdating state: ${currentStateToUse}`);
        console.log(`\nnew state: ${newStateToUse}`)
        //console.log(`\nchange trackings: ${JSON.vaulticStringify(changeTrackings)}`);
        try 
        {
            const updatedState = this.mergeStoreStates(new Field(JSON.vaulticParse(currentStateToUse)), new Field(JSON.vaulticParse(newStateToUse)), changeTrackings);
            currentState.state = JSON.vaulticStringify(updatedState.value);
            //console.log(`\nnew state: ${currentState.state}`);
            currentState.previousSignature = newState.previousSignature;

            transaction.updateEntity(currentState, key, this.getVaulticRepository);
        }
        catch (e)
        {
            console.log(e);
            throw e;
        }

        console.log('updated succeessfully');
        return true;
    }

    // merges store states. 
    // Warning: In order for data to not become corrupted, proxy fields need to have their lastModifiedTime updated whenever updated.
    // Ex: Updating an EmptyFiler that stays Empty. The Field<string> in filterStore.emptyFilters needs to have its lastModifiedTime updated
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
                    const id = manager.get(keys[i], newObj.value).id;
                    const changeTracking = changeTrackings[id];

                    // wasn't altered locally, was added on another device
                    if (!changeTracking)
                    {
                        manager.set(keys[i], manager.get(keys[i], newObj.value), currentObj.value);
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
                        console.log(`Not in local. New: ${JSON.vaulticStringify(newObj)}, Current: ${JSON.vaulticStringify(currentObj)}, Change Tracking: ${JSON.vaulticStringify(changeTracking)}`);
                        if (changeTracking.lastModifiedTime < manager.get(keys[i], newObj.value).lastModifiedTime)
                        {
                            manager.set(keys[i], manager.get(keys[i], newObj.value), currentObj.value);
                        }
                        else 
                        {
                            console.log(`Didn't add. New: ${JSON.vaulticStringify(newObj)}, Current: ${JSON.vaulticStringify(currentObj)}, Change Tracking: ${JSON.vaulticStringify(changeTracking)}`);
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
                const id = manager.get(currentKeys[i], currentObj.value).id;
                const changeTracking = changeTrackings[id];
                // wasn't modified locally and not in newObj, it was deleted on another device.
                // If state is Inserted, we want to keep it. 
                // If state is Updated, we want to keep it since we can't check when it was deleted on another device
                // If state is Deleted, it wouldn't be in currentKeys
                if (!changeTracking)
                {
                    console.log(`\ndeleting: ${currentKeys[i]} from ${JSON.vaulticStringify(currentObj)}`)
                    manager.delete(currentKeys[i], currentObj.value);
                }
                else 
                {
                    console.log(`\nkeeping ${JSON.vaulticStringify(currentObj)}. Change Tracking: ${JSON.vaulticStringify(changeTracking)}`);
                }
            }
        }
        else 
        {
            if (currentObj.value != newObj.value && currentObj.lastModifiedTime < newObj.lastModifiedTime)
            {
                currentObj.value = newObj.value;
                currentObj.lastModifiedTime = newObj.lastModifiedTime;
            }
        }

        return currentObj;
    }
}