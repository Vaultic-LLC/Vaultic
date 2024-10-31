import { Reactive, Ref, reactive, ref } from "vue";
import cryptHelper from "../../Helpers/cryptHelper";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, DataType, Filter, Group, ISecondaryDataObject } from "../../Types/DataTypes";
import { SecretProperty } from "../../Types/Fields";
import { Field, FieldedObject, FieldMap, IFieldObject, IIdentifiable, KnownMappedFields, NonArrayType, PrimaryDataObjectCollection, Primitive, SecondaryDataObjectCollection, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";

// Enforced to ensure the logic to track changes always works
type StoreStateProperty = Field<NonArrayType<Primitive>> | FieldMap | Field<NonArrayType<FieldedObject>>;

export interface StoreState
{
    [key: string]: StoreStateProperty;
}

export type StoreEvents = "onChanged";

export class Store<T extends KnownMappedFields<StoreState>, U extends string = StoreEvents>
{
    events: Dictionary<{ (...params: any[]): void }[]>;

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
        const state: { [key: string]: any } = {};
        state[this.internalStateName] = JSON.vaulticStringify(this.getState());

        return state;
    }

    public cloneState(): T
    {
        const state: T = JSON.vaulticParse(JSON.vaulticStringify(this.getState()));
        this.preAssignState(state);

        return state;
    }

    // TODO: default state will prevent objects on the highest level of the state to break things
    // since they won't get an ID, since they'll always be there. Just need to initalize them as 
    // a Field
    protected defaultState(): T
    {
        return {} as T;
    }

    public updateState(state: T): void
    {
        if (Object.keys(state).length == 0)
        {
            state = this.defaultState();
        }

        Object.assign(this.state, state);
        this.events['onChanged']?.forEach(f => f());
    }

    public initalizeNewState(state: T): void
    {
        if (Object.keys(state).length == 0)
        {
            state = this.defaultState();
        }

        this.preAssignState(state);
        this.updateState(state);
    }

    public async initalizeNewStateFromJSON(jsonString: string): Promise<void>
    {
        try
        {
            const state = JSON.vaulticParse(jsonString);
            this.initalizeNewState(state);

            return;
        }
        catch (e)
        {
            await api.repositories.logs.log(undefined, `Exception when parsing JSON state for ${this.stateName}`);
        }

        // fallback to default state
        this.initalizeNewState(this.defaultState());
    }

    protected preAssignState(_: T): void { }

    public resetToDefault()
    {
        Object.assign(this.state, this.defaultState());
    }

    public addEvent(event: U, callback: (...params: any[]) => void)
    {
        if (this.events[event])
        {
            this.events[event].push(callback);
            return;
        }

        this.events[event] = [callback];
    }

    public removeEvent(event: U, callback: (...params: any[]) => void)
    {
        if (!this.events[event])
        {
            return;
        }

        this.events[event] = this.events[event].filter(c => c != callback);
    }

    protected emit(event: U, ...params: any[])
    {
        this.events[event]?.forEach(f => f(...params));
    }
}

export class VaultContrainedStore<T extends KnownMappedFields<StoreState>, U extends string = StoreEvents> extends Store<T, U>
{
    protected vault: VaultStoreParameter;

    constructor(vault: VaultStoreParameter, stateName: string)
    {
        super(stateName);
        this.vault = vault;
    }
}

export class DataTypeStore<T extends KnownMappedFields<StoreState>> extends VaultContrainedStore<T>
{
    constructor(vault: VaultStoreParameter, stateName: string)
    {
        super(vault, stateName);
    }

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

export class PrimaryDataTypeStore<T extends KnownMappedFields<StoreState>> extends DataTypeStore<T>
{
    public removeSecondaryObjectFromValues(secondaryObjectID: string, secondaryObjectCollection: SecondaryDataObjectCollection): T
    {
        const pendingState = this.cloneState();
        this.getPrimaryDataTypesByID(pendingState).value.forEach((v, k, map) =>
        {
            v.value[secondaryObjectCollection].value.delete(secondaryObjectID);
        });

        return pendingState;
    }

    protected getPrimaryDataTypesByID(state: T): Field<Map<string, Field<SecondaryDataObjectCollectionType & FieldedObject>>>
    {
        return {} as any;
    }

    protected async checkUpdateDuplicatePrimaryObjects<T extends IIdentifiable & IFieldObject>(
        masterKey: string,
        primaryDataObject: T,
        allPrimaryObjects: Field<Map<string, Field<T>>>,
        secretProperty: SecretProperty,
        allDuplicates: Dictionary<string[]>): Promise<void>
    {
        // first make sure we have a list so no null reference exceptions
        if (!allDuplicates[primaryDataObject.id.value])
        {
            allDuplicates[primaryDataObject.id.value] = [];
        }

        for (const [key, value] of allPrimaryObjects.value.entries())
        {
            let tempPrimaryObject: Field<T> = value;
            const currentId: string = key;

            // don't count our own as a duplicate
            if (currentId == primaryDataObject.id.value)
            {
                continue;
            }

            // make sure we have a valid list before doing any checking
            if (!allDuplicates[currentId])
            {
                allDuplicates[currentId] = [];
            }

            const response = await cryptHelper.decrypt(masterKey, tempPrimaryObject.value[secretProperty].value);
            if (!response.success)
            {
                continue;
            }

            // have duplicate values
            if (response.value == primaryDataObject[secretProperty].value)
            {
                // updating the list for the current primaryObject to include the duplicate primaryObjects id
                if (!allDuplicates[primaryDataObject.id.value]?.includes(currentId))
                {
                    allDuplicates[primaryDataObject.id.value]?.push(currentId);
                }

                // updating the duplciate primaryObjects list to include the current primaryObjects id
                if (!allDuplicates[currentId]?.includes(primaryDataObject.id.value))
                {
                    allDuplicates[currentId]?.push(primaryDataObject.id.value);
                }
            }
            else
            {
                const tempPrimaryObjectIndex = allDuplicates[primaryDataObject.id.value]?.indexOf(currentId) ?? -1;
                if (tempPrimaryObjectIndex >= 0)
                {
                    // remove old duplicate id from current primary objects list since it is no longer a duplicate
                    allDuplicates[primaryDataObject.id.value]?.splice(tempPrimaryObjectIndex, 1);
                }

                const currentPrimaryObjectIndex = allDuplicates[currentId]?.indexOf(primaryDataObject.id.value) ?? -1;
                if (currentPrimaryObjectIndex >= 0)
                {
                    // remove current primary object from temp primary objects list since it is no loner a duplicate
                    allDuplicates[currentId]?.splice(currentPrimaryObjectIndex, 1);
                }

                // remove  temp primary objects list since it no longer has any duplicates
                if (allDuplicates[currentId] && allDuplicates[currentId].length == 0)
                {
                    delete allDuplicates[currentId];
                }
            }
        }

        // remove current primary objects list since it no longer has any entries
        if (allDuplicates[primaryDataObject.id.value] && allDuplicates[primaryDataObject.id.value].length == 0)
        {
            delete allDuplicates[primaryDataObject.id.value];
        }
    }

    protected checkRemoveFromDuplicate<T extends IIdentifiable>(
        primaryDataObject: T,
        allDuplicates: Dictionary<string[]>)
    {
        if (!allDuplicates[primaryDataObject.id.value])
        {
            return;
        }

        allDuplicates[primaryDataObject.id.value].forEach(p =>
        {
            if (!allDuplicates[p])
            {
                return;
            }

            const currentPrimaryObjectIndex = allDuplicates[p].indexOf(primaryDataObject.id.value);
            if (currentPrimaryObjectIndex >= 0)
            {
                allDuplicates[p].splice(currentPrimaryObjectIndex, 1);
            }

            if (allDuplicates[p] && allDuplicates[p].length == 0)
            {
                delete allDuplicates[p];
            }
        });

        delete allDuplicates[primaryDataObject.id.value];
    }
}

export class SecondaryDataTypeStore<T extends KnownMappedFields<StoreState>> extends DataTypeStore<T>
{
    private getSecondaryDataObjectDuplicates<T extends ISecondaryDataObject>(
        secondaryDataObject: T,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        allSecondaryDataObjects: Field<Map<string, Field<T>>>): string[]
    {
        // make sure we aren't considering our current object as a duplicate to itself
        const secondaryDataObjectsToLookAt = allSecondaryDataObjects.value.filter((k, v) => k != secondaryDataObject.id.value);

        // we don't have any primary objects so grab others that are also empty
        if (secondaryDataObject[primaryDataObjectCollection].value.size == 0)
        {
            return secondaryDataObjectsToLookAt.mapWhere((k, v) => v.value[primaryDataObjectCollection].value.size == 0, (k, v) => v.value.id.value);
        }

        // only need to check others that have the same length
        let potentiallyDuplicateObjects: Map<string, Field<T>> = secondaryDataObjectsToLookAt.filter(
            (k, v) => v.value[primaryDataObjectCollection].value.size == secondaryDataObject[primaryDataObjectCollection].value.size);

        //@ts-ignore
        for (let item of secondaryDataObject[primaryDataObjectCollection].value)
        {
            // we've filtered out all secondary objects, aka there aren't any duplicates. We can stop checking
            if (potentiallyDuplicateObjects.size == 0)
            {
                return [];
            }

            // only grap the secondary objects with values that match our current one
            potentiallyDuplicateObjects = potentiallyDuplicateObjects.filter((k, v) => v.value[primaryDataObjectCollection].value.has(item[0]));
        }

        return potentiallyDuplicateObjects.map((k, v) => v.value.id.value);
    }

    // checks / handles duplicates for a single filter
    // secondaryDataObject: the filter / group to check / handle for
    // potentiallyNewDuplicateSecondaryObject: re calced duplicate filters / groups from getSecondaryDataObjectDuplicates()
    // currentDuplicateSecondaryObjects: last saved duplicate filters / groups
    protected checkUpdateDuplicateSecondaryObjects<T extends Filter | Group>(
        secondaryDataObject: T,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        currentDuplicateSecondaryObjects: Dictionary<string[]>,
        allSecondaryDataObjects: Field<Map<string, Field<T>>>)
    {
        // setup so that we don't get any exceptions
        if (!currentDuplicateSecondaryObjects[secondaryDataObject.id.value])
        {
            currentDuplicateSecondaryObjects[secondaryDataObject.id.value] = [];
        }

        const potentiallyNewDuplicateSecondaryObject: string[] =
            this.getSecondaryDataObjectDuplicates(secondaryDataObject, primaryDataObjectCollection, allSecondaryDataObjects);

        // there are no duplicate secondary objects anywhere, so nothing to do
        if (potentiallyNewDuplicateSecondaryObject.length == 0 &&
            currentDuplicateSecondaryObjects[secondaryDataObject.id.value].length == 0)
        {
            delete currentDuplicateSecondaryObjects[secondaryDataObject.id.value];
            return;
        }

        const addedDuplicateSeconaryObjects: string[] = potentiallyNewDuplicateSecondaryObject.filter(
            o => !currentDuplicateSecondaryObjects[secondaryDataObject.id.value].includes(o));

        const removedDuplicateSecondaryObjects: string[] = currentDuplicateSecondaryObjects[secondaryDataObject.id.value].filter(
            o => !potentiallyNewDuplicateSecondaryObject.includes(o));

        addedDuplicateSeconaryObjects.forEach(o =>
        {
            // add added secondary object to current secondary object's duplicate list
            if (!currentDuplicateSecondaryObjects[secondaryDataObject.id.value].includes(o))
            {
                currentDuplicateSecondaryObjects[secondaryDataObject.id.value].push(o);
            }

            // need to create a list for the added secondary object if it doesn't exist. Duplicate secondary objects go both ways
            if (!currentDuplicateSecondaryObjects[o])
            {
                currentDuplicateSecondaryObjects[o] = [];
            }

            // add curent secondary object to added secondary objects duplicate list
            if (!currentDuplicateSecondaryObjects[o].includes(secondaryDataObject.id.value))
            {
                currentDuplicateSecondaryObjects[o].push(secondaryDataObject.id.value);
            }
        });

        removedDuplicateSecondaryObjects.forEach(o =>
        {
            // remove removed secondary object from current secondary object's duplicate list
            const index1 = currentDuplicateSecondaryObjects[secondaryDataObject.id.value].indexOf(o);
            if (index1 >= 0)
            {
                currentDuplicateSecondaryObjects[secondaryDataObject.id.value].splice(index1, 1);
            }

            if (!currentDuplicateSecondaryObjects[o])
            {
                return;
            }

            // remove current secondary object from removed secondary object's list
            const index2 = currentDuplicateSecondaryObjects[o].indexOf(secondaryDataObject.id.value);
            if (index2 >= 0)
            {
                currentDuplicateSecondaryObjects[o].splice(index2, 1);
                if (currentDuplicateSecondaryObjects[o].length == 0)
                {
                    delete currentDuplicateSecondaryObjects[o];
                }
            }
        });

        if (currentDuplicateSecondaryObjects[secondaryDataObject.id.value].length == 0)
        {
            delete currentDuplicateSecondaryObjects[secondaryDataObject.id.value];
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
        primaryObjectIDsForSecondaryObject: Map<string, Field<string>>,
        currentEmptySecondaryObjects: string[])
    {
        // check to see if this filter has any passwords or values
        if (primaryObjectIDsForSecondaryObject.size == 0)
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
