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

        try 
        {
            const updatedState = this.mergeStoreStates(new Field(JSON.vaulticParse(currentStateToUse)), new Field(JSON.vaulticParse(newStateToUse)), changeTrackings);
            currentState.state = JSON.vaulticStringify(updatedState.value);
            currentState.previousSignature = newState.previousSignature;

            transaction.updateEntity(currentState, key, this.getVaulticRepository);
        }
        catch (e)
        {
            console.log(e);
            throw e;
        }

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
                const id = manager.get(currentKeys[i], currentObj.value).id;
                const changeTracking = changeTrackings[id];

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