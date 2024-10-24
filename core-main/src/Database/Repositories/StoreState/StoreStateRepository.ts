import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { StoreState } from "../../Entities/States/StoreState";
import Transaction from "../../Transaction";
import { VaulticRepository } from "../VaulticRepository";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { environment } from "../../../Environment";
import { ChangeTracking } from "../../Entities/ChangeTracking";

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
        // Object or Array
        if (typeof newObj.value == 'object')
        {
            const keys = Object.keys(newObj);
            const currentKeys = Object.keys(currentObj);

            for (let i = 0; i < keys.length; i++)
            {
                const currentKeyMatchingIndex = currentKeys.indexOf(keys[i]);

                // not in current keys. Check to see if it was deleted locally or if it was inserted / created on another device
                if (currentKeyMatchingIndex < 0)
                {
                    const changeTracking = changeTrackings[newObj[keys[i]].id];

                    // wasn't altered locally, was added on another device
                    if (!changeTracking)
                    {
                        currentObj[keys[i]] = newObj[keys[i]];
                    }
                    // was deleted locally, check to make sure that it was deleted before any updates to the 
                    // object on another device were
                    else
                    {
                        // object was edited on another device after it was deleted on this one, keep it
                        if (changeTracking.lastModifiedTime < newObj[keys[i]].lastModifiedTime)
                        {
                            currentObj[keys[i]] = newObj[keys[i]];
                        }
                    }
                }
                else
                {
                    // both objects exist, check them
                    this.mergeStoreStates(currentObj[currentKeys[currentKeyMatchingIndex]], newObj[keys[i]], changeTrackings);
                    currentKeys.splice(currentKeyMatchingIndex, 1);
                }
            }

            // all the keys that are in the current obj, but not the newObj.
            for (let i = 0; i < currentKeys.length; i++)
            {
                const changeTracking = changeTrackings[currentObj[currentKeys[i]].id];

                // wasn't modified locally and not in newObj, it was deleted on another device.
                // If state is Inserted, we want to keep it. 
                // If state is Updated, we want to keep it since we can't check when it was deleted on another device
                // If state is Deleted, it wouldn't be in currentKeys
                if (!changeTracking)
                {
                    delete currentObj[currentKeys[i]];
                }
            }
        }
        else 
        {
            if (currentObj.value != newObj.value && currentObj.lastModifiedTime < newObj.lastModifiedTime)
            {
                currentObj = newObj;
            }
        }
    }
}