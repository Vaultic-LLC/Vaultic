import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreState } from "../../Entities/States/StoreState";
import Transaction from "../../Transaction";
import { VaulticRepository } from "../VaulticRepository";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { ChangeTracking } from "../../Entities/ChangeTracking";
import { ObjectPropertyManager, PropertyManagerConstructor } from "@vaultic/shared/Utilities/PropertyManagers";
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

        let newStateToUse = await StoreState.getUsableState(key, newState.state, decrypt);
        if (!newStateToUse.success)
        {
            return false;
        }

        let currentStateToUse = await StoreState.getUsableState(key, currentState.state, decrypt);
        if (!currentStateToUse.success)
        {
            return false;
        }

        try
        {
            const updatedState = this.mergeStoreStates(Field.create(JSON.vaulticParse(currentStateToUse.value)),
                Field.create(JSON.vaulticParse(newStateToUse.value)), changeTrackings, true);

            currentState.state = JSON.vaulticStringify(updatedState.value);
            currentState.previousSignature = newState.previousSignature;

            transaction.updateEntity(currentState, key, this.getVaulticRepository);
        }
        catch (e)
        {
            throw e;
        }

        return true;
    }

    // merges store states. 
    // Warning: In order for data to not become corrupted, proxy fields need to have their lastModifiedTime updated whenever updated.
    // Ex: Updating an EmptyFiler that stays Empty. The Field<string> in filterStore.emptyFilters needs to have its lastModifiedTime updated
    private mergeStoreStates(currentObj: any, newObj: any, changeTrackings: Dictionary<ChangeTracking>, first: boolean = false)
    {
        // nothing was changed, can just return
        if (!first && currentObj.mt === newObj.mt)
        {
            return;
        }

        if (typeof newObj.value == 'object')
        {
            // one of these was changed. Take the newer one here or else it'll still reflect the old value even though its nested value was updated 
            // correctly
            currentObj.mt = Math.max(currentObj.mt, newObj.mt);

            const manager: ObjectPropertyManager<any> = PropertyManagerConstructor.getFor(newObj.value);

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
                        if (changeTracking.lastModifiedTime < manager.get(keys[i], newObj.value).mt)
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
            if (currentObj.value != newObj.value && currentObj.mt < newObj.mt)
            {
                currentObj.value = newObj.value;
                currentObj.mt = newObj.mt;
            }
        }

        return currentObj;
    }
}