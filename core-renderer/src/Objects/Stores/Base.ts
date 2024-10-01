import { AtRiskType, IIdentifiable, SecondaryDataObjectCollection, SecretProperty } from "../../Types/EncryptedData";
import { Reactive, Ref, reactive, ref } from "vue";
import { DataType, Filter, Group, PrimaryDataObjectCollection } from "../../Types/Table";
import { Dictionary } from "../../Types/DataStructures";
import cryptHelper from "../../Helpers/cryptHelper";
import { VaultStoreParameter } from "./VaultStore";

export interface DataTypeStoreState<T>
{
    values: T[];
}

export type StoreEvents = "onChanged";

export class Store<T extends {}, U extends string = StoreEvents>
{
    events: Dictionary<{ (): void }[]>;

    protected state: Reactive<T>;
    private internalStateName: string;

    get stateName() { return this.internalStateName; }

    constructor(stateName: string)
    {
        this.state = reactive(this.defaultState());
        this.internalStateName = stateName;
        this.events = {};
    }

    public getState(): Reactive<T>
    {
        return this.state;
    }

    public getBackupableState(): any
    {
        const state = {};
        state[this.internalStateName] = JSON.stringify(this.getState());

        return state;
    }

    public cloneState(): T
    {
        return JSON.parse(JSON.stringify(this.getState()));
    }

    protected defaultState(): T
    {
        return {} as T;
    }

    public updateState(state: T): void
    {
        // TOOD: this should instead validate that the state has and only has the properties
        // that I expect. Entites should then initalize their states with all the expected properties
        // instead of just '{}'
        if (Object.keys(state).length == 0)
        {
            state = this.defaultState();
        }

        Object.assign(this.state, state);
        this.events['onChanged']?.forEach(f => f());
    }

    protected postAssignState(_: T): void { }

    public resetToDefault()
    {
        Object.assign(this.state, this.defaultState());
    }

    public addEvent(event: U, callback: () => void)
    {
        if (this.events[event])
        {
            this.events[event].push(callback);
            return;
        }

        this.events[event] = [callback];
    }

    public removeEvent(event: U, callback: () => void)
    {
        if (!this.events[event])
        {
            return;
        }

        this.events[event] = this.events[event].filter(c => c != callback);
    }
}

export class VaultContrainedStore<T extends {}, U extends string = StoreEvents> extends Store<T, U>
{
    protected vault: VaultStoreParameter;

    constructor(vault: VaultStoreParameter, stateName: string)
    {
        super(stateName);
        this.vault = vault;
    }
}

export class DataTypeStore<U, T extends DataTypeStoreState<U>> extends VaultContrainedStore<T>
{
    public resetToDefault()
    {
        super.resetToDefault();
        this.getPasswordAtRiskType().value = AtRiskType.None;
        this.getValueAtRiskType().value = AtRiskType.None;
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return ref({} as AtRiskType);
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return ref({} as AtRiskType);
    }

    protected doToggleAtRiskType(currentType: Ref<AtRiskType>, newAtRiskType: AtRiskType)
    {
        if (currentType.value != newAtRiskType)
        {
            currentType.value = newAtRiskType;
            return;
        }

        currentType.value = AtRiskType.None;
    }

    public toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
    {
        if (dataType == DataType.Passwords)
        {
            this.doToggleAtRiskType(this.getPasswordAtRiskType(), atRiskType);
        }
        else if (dataType == DataType.NameValuePairs)
        {
            this.doToggleAtRiskType(this.getValueAtRiskType(), atRiskType);
        }
    }
}

export class PrimaryDataObjectStore<U, T extends DataTypeStoreState<U>> extends DataTypeStore<U, T>
{
    public removeSecondaryObjectFromValues(secondaryObjectID: string, secondaryObjectCollection: SecondaryDataObjectCollection): T
    {
        const pendingState = this.cloneState();
        pendingState.values.forEach(v =>
        {
            const index = v[secondaryObjectCollection].indexOf(secondaryObjectID);
            if (index >= 0)
            {
                v[secondaryObjectCollection].splice(index, 1);
            }
        });

        return pendingState;
    }

    protected async checkUpdateDuplicatePrimaryObjects<T extends IIdentifiable>(
        masterKey: string,
        primaryDataObject: T,
        allPrimaryObjects: T[],
        secretProperty: SecretProperty,
        allDuplicates: Dictionary<string[]>): Promise<void>
    {
        // first make sure we have a list so no null reference exceptions
        if (!allDuplicates[primaryDataObject.id])
        {
            allDuplicates[primaryDataObject.id] = [];
        }

        for (let i = 0; i < allPrimaryObjects.length; i++)
        {
            let tempPrimaryObject: T = allPrimaryObjects[i];

            // make sure we have a valid list before doing any checking
            if (!allDuplicates[tempPrimaryObject.id])
            {
                allDuplicates[tempPrimaryObject.id] = [];
            }

            const response = await cryptHelper.decrypt(masterKey, tempPrimaryObject[secretProperty]);
            if (!response.success)
            {
                continue;
            }

            // have duplicate values
            if (response.value == primaryDataObject[secretProperty])
            {
                // updating the list for the current primaryObject to include the duplicate primaryObjects id
                if (!allDuplicates[primaryDataObject.id]?.includes(tempPrimaryObject.id))
                {
                    allDuplicates[primaryDataObject.id]?.push(tempPrimaryObject.id);
                }

                // updating the duplciate primaryObjects list to include the current primaryObjects id
                if (!allDuplicates[tempPrimaryObject.id]?.includes(primaryDataObject.id))
                {
                    allDuplicates[tempPrimaryObject.id]?.push(primaryDataObject.id);
                }
            }
            else
            {
                const tempPrimaryObjectIndex = allDuplicates[primaryDataObject.id]?.indexOf(tempPrimaryObject.id) ?? -1;
                if (tempPrimaryObjectIndex >= 0)
                {
                    // remove old duplicate id from current primary objects list since it is no longer a duplicate
                    allDuplicates[primaryDataObject.id]?.splice(tempPrimaryObjectIndex, 1);
                }

                const currentPrimaryObjectIndex = allDuplicates[tempPrimaryObject.id]?.indexOf(primaryDataObject.id) ?? -1;
                if (currentPrimaryObjectIndex >= 0)
                {
                    // remove current primary object from temp primary objects list since it is no loner a duplicate
                    allDuplicates[tempPrimaryObject.id]?.splice(currentPrimaryObjectIndex, 1);
                }

                // remove  temp primary objects list since it no longer has any duplicates
                if (allDuplicates[tempPrimaryObject.id] && allDuplicates[tempPrimaryObject.id].length == 0)
                {
                    delete allDuplicates[tempPrimaryObject.id];
                }
            }
        }

        // remove current primary objects list since it no longer has any entries
        if (allDuplicates[primaryDataObject.id] && allDuplicates[primaryDataObject.id].length == 0)
        {
            delete allDuplicates[primaryDataObject.id];
        }
    }

    protected checkRemoveFromDuplicate<T extends IIdentifiable>(
        primaryDataObject: T,
        allDuplicates: Dictionary<string[]>)
    {
        if (!allDuplicates[primaryDataObject.id])
        {
            return;
        }

        allDuplicates[primaryDataObject.id].forEach(p =>
        {
            if (!allDuplicates[p])
            {
                return;
            }

            const currentPrimaryObjectIndex = allDuplicates[p].indexOf(primaryDataObject.id);
            if (currentPrimaryObjectIndex >= 0)
            {
                allDuplicates[p].splice(currentPrimaryObjectIndex, 1);
            }

            if (allDuplicates[p] && allDuplicates[p].length == 0)
            {
                delete allDuplicates[p];
            }
        });

        delete allDuplicates[primaryDataObject.id];
    }
}

export class SecondaryObjectStore<U, T extends DataTypeStoreState<U>> extends DataTypeStore<U, T>
{
    private getSecondaryDataObjectDuplicates<T extends IIdentifiable>(
        secondaryDataObject: T,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        allSecondaryDataObjects: T[]): string[]
    {
        // make sure we aren't considering our current object as a duplicate to itself
        const secondaryDataObjectsToLookAt = allSecondaryDataObjects.filter(o => o.id != secondaryDataObject.id);

        // we don't have any primary objects so grab others that are also empty
        if (secondaryDataObject[primaryDataObjectCollection].length == 0)
        {
            return secondaryDataObjectsToLookAt.filter(o => o[primaryDataObjectCollection].length == 0).map(o => o.id);
        }

        // only need to check others that have the same length
        let potentiallyDuplicateObjects: T[] = secondaryDataObjectsToLookAt.filter(
            o => o[primaryDataObjectCollection].length == secondaryDataObject[primaryDataObjectCollection].length);

        for (let i = 0; i < secondaryDataObject[primaryDataObjectCollection].length; i++)
        {
            // we've filtered out all secondary objects, aka there aren't any duplicates. We can stop checking
            if (potentiallyDuplicateObjects.length == 0)
            {
                return [];
            }

            // only grap the secondary objects with values that match our current one
            potentiallyDuplicateObjects = potentiallyDuplicateObjects.filter(
                o => o[primaryDataObjectCollection].includes(secondaryDataObject[primaryDataObjectCollection][i]));
        }

        return potentiallyDuplicateObjects.map(o => o.id);
    }

    // checks / handles duplicates for a single filter
    // secondaryDataObject: the filter / group to check / handle for
    // potentiallyNewDuplicateSecondaryObject: re calced duplicate filters / groups from getSecondaryDataObjectDuplicates()
    // currentDuplicateSecondaryObjects: last saved duplicate filters / groups
    protected checkUpdateDuplicateSecondaryObjects<T extends Filter | Group>(
        secondaryDataObject: T,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        currentDuplicateSecondaryObjects: Dictionary<string[]>,
        allSecondaryDataObjects: T[])
    {
        // setup so that we don't get any exceptions
        if (!currentDuplicateSecondaryObjects[secondaryDataObject.id])
        {
            currentDuplicateSecondaryObjects[secondaryDataObject.id] = [];
        }

        const potentiallyNewDuplicateSecondaryObject: string[] =
            this.getSecondaryDataObjectDuplicates(secondaryDataObject, primaryDataObjectCollection, allSecondaryDataObjects);

        // there are no duplicate secondary objects anywhere, so nothing to do
        if (potentiallyNewDuplicateSecondaryObject.length == 0 &&
            currentDuplicateSecondaryObjects[secondaryDataObject.id].length == 0)
        {
            delete currentDuplicateSecondaryObjects[secondaryDataObject.id];
            return;
        }

        const addedDuplicateSeconaryObjects: string[] = potentiallyNewDuplicateSecondaryObject.filter(
            o => !currentDuplicateSecondaryObjects[secondaryDataObject.id].includes(o));

        const removedDuplicateSecondaryObjects: string[] = currentDuplicateSecondaryObjects[secondaryDataObject.id].filter(
            o => !potentiallyNewDuplicateSecondaryObject.includes(o));

        addedDuplicateSeconaryObjects.forEach(o =>
        {
            // add added secondary object to current secondary object's duplicate list
            if (!currentDuplicateSecondaryObjects[secondaryDataObject.id].includes(o))
            {
                currentDuplicateSecondaryObjects[secondaryDataObject.id].push(o);
            }

            // need to create a list for the added secondary object if it doesn't exist. Duplicate secondary objects go both ways
            if (!currentDuplicateSecondaryObjects[o])
            {
                currentDuplicateSecondaryObjects[o] = [];
            }

            // add curent secondary object to added secondary objects duplicate list
            if (!currentDuplicateSecondaryObjects[o].includes(secondaryDataObject.id))
            {
                currentDuplicateSecondaryObjects[o].push(secondaryDataObject.id);
            }
        });

        removedDuplicateSecondaryObjects.forEach(o =>
        {
            // remove removed secondary object from current secondary object's duplicate list
            const index1 = currentDuplicateSecondaryObjects[secondaryDataObject.id].indexOf(o);
            if (index1 >= 0)
            {
                currentDuplicateSecondaryObjects[secondaryDataObject.id].splice(index1, 1);
            }

            if (!currentDuplicateSecondaryObjects[o])
            {
                return;
            }

            // remove current secondary object from removed secondary object's list
            const index2 = currentDuplicateSecondaryObjects[o].indexOf(secondaryDataObject.id);
            if (index2 >= 0)
            {
                currentDuplicateSecondaryObjects[o].splice(index2, 1);
                if (currentDuplicateSecondaryObjects[o].length == 0)
                {
                    delete currentDuplicateSecondaryObjects[o];
                }
            }
        });

        if (currentDuplicateSecondaryObjects[secondaryDataObject.id].length == 0)
        {
            delete currentDuplicateSecondaryObjects[secondaryDataObject.id];
        }
    }

    protected removeSeconaryObjectFromEmptySecondaryObjects(
        secondaryObjectID: string,
        currentEmptySecondaryObjects: string[])
    {
        const objectIndex = currentEmptySecondaryObjects.indexOf(secondaryObjectID);
        if (objectIndex >= 0)
        {
            currentEmptySecondaryObjects.splice(objectIndex, 1);
        }
    }

    // checks / handles emptiness for a single secondary object
    // secondaryObjectID: the id of the filter / group
    // primaryObjectIDsForSecondaryObject: the primary objects the filter / group has. either .passwords or .values
    // currentEmptySecondaryObjects: the list of current empty secondary objects
    protected checkUpdateEmptySecondaryObject(
        secondaryObjectID: string,
        primaryObjectIDsForSecondaryObject: string[],
        currentEmptySecondaryObjects: string[])
    {
        // check to see if this filter has any passwords or values
        if (primaryObjectIDsForSecondaryObject.length == 0)
        {
            // if it doesn't, then add it to the list of empty filters
            if (!currentEmptySecondaryObjects.includes(secondaryObjectID))
            {
                currentEmptySecondaryObjects.push(secondaryObjectID);
            }
        }
        else
        {
            // since we do have passwords or values, remove the secondary object from the empty list if its in there
            this.removeSeconaryObjectFromEmptySecondaryObjects(secondaryObjectID, currentEmptySecondaryObjects);
        }
    }

    protected removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(
        secondaryDataObjectID: string,
        currentDuplicateSecondaryDataObjects: Dictionary<string[]>)
    {
        if (!currentDuplicateSecondaryDataObjects[secondaryDataObjectID])
        {
            return;
        }

        currentDuplicateSecondaryDataObjects[secondaryDataObjectID].forEach(o =>
        {
            if (!currentDuplicateSecondaryDataObjects[o])
            {
                return;
            }

            const secondaryObjectIndex = currentDuplicateSecondaryDataObjects[o].indexOf(secondaryDataObjectID);
            if (secondaryObjectIndex >= 0)
            {
                currentDuplicateSecondaryDataObjects[o].splice(secondaryObjectIndex, 1);
            }

            if (currentDuplicateSecondaryDataObjects[o].length == 0)
            {
                delete currentDuplicateSecondaryDataObjects[o];
            }
        });

        delete currentDuplicateSecondaryDataObjects[secondaryDataObjectID];
    }
}
