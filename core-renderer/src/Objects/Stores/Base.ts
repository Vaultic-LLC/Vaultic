import { Reactive, Ref, reactive, ref } from "vue";
import cryptHelper from "../../Helpers/cryptHelper";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, DataType, DuplicateDataTypes, Filter, Group, ISecondaryDataObject } from "../../Types/DataTypes";
import { SecretProperty, SecretPropertyType } from "../../Types/Fields";
import { Field, IFieldedObject, FieldMap, IFieldObject, IIdentifiable, KnownMappedFields, NonArrayType, PrimaryDataObjectCollection, Primitive, SecondaryDataObjectCollection, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";

// Enforced to ensure the logic to track changes always works
type StoreStateProperty = Field<NonArrayType<Primitive>> | FieldMap | Field<NonArrayType<IFieldedObject>>;

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

    protected getPrimaryDataTypesByID(state: T): Field<Map<string, Field<SecondaryDataObjectCollectionType & IFieldedObject>>>
    {
        return {} as any;
    }

    protected async checkUpdateDuplicatePrimaryObjects<T extends IIdentifiable & SecretPropertyType<U> & IFieldObject, U extends SecretProperty>(
        masterKey: string,
        primaryDataObject: T,
        allPrimaryObjects: Field<Map<string, Field<T>>>,
        secretProperty: U,
        allDuplicates: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>): Promise<void>
    {
        // first make sure we have a list so no null reference exceptions
        if (!allDuplicates.value.get(primaryDataObject.id.value))
        {
            allDuplicates.value.set(primaryDataObject.id.value, new Field(new DuplicateDataTypes()));
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
            if (!allDuplicates.value.get(currentId))
            {
                allDuplicates.value.set(currentId, new Field(new DuplicateDataTypes()));
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
                if (!allDuplicates.value.get(primaryDataObject.id.value)?.value.duplicateDataTypesByID.value.has(currentId))
                {
                    allDuplicates.value.get(primaryDataObject.id.value)?.value.duplicateDataTypesByID.value.set(currentId, new Field(currentId));
                }

                // updating the duplciate primaryObjects list to include the current primaryObjects id
                if (!allDuplicates.value.get(currentId)?.value.duplicateDataTypesByID.value.has(primaryDataObject.id.value))
                {
                    allDuplicates.value.get(currentId)?.value.duplicateDataTypesByID.value.set(primaryDataObject.id.value, new Field(currentId));
                }
            }
            else
            {
                if (allDuplicates.value.get(primaryDataObject.id.value)?.value.duplicateDataTypesByID.value.has(currentId))
                {
                    // remove old duplicate id from current primary objects list since it is no longer a duplicate
                    allDuplicates.value.get(primaryDataObject.id.value)?.value.duplicateDataTypesByID.value.delete(currentId);
                }

                if (allDuplicates.value.get(currentId)?.value.duplicateDataTypesByID.value.has(primaryDataObject.id.value))
                {
                    // remove current primary object from temp primary objects list since it is no loner a duplicate
                    allDuplicates.value.get(currentId)?.value.duplicateDataTypesByID.value.delete(primaryDataObject.id.value);
                }

                // remove  temp primary objects list since it no longer has any duplicates
                if (allDuplicates.value.has(currentId) && allDuplicates.value.get(currentId)?.value.duplicateDataTypesByID.value.size == 0)
                {
                    allDuplicates.value.delete(currentId)
                }
            }
        }

        // remove current primary objects list since it no longer has any entries
        if (allDuplicates.value.has(primaryDataObject.id.value) && allDuplicates.value.get(primaryDataObject.id.value)?.value.duplicateDataTypesByID.value.size == 0)
        {
            allDuplicates.value.delete(primaryDataObject.id.value)
        }
    }

    protected checkRemoveFromDuplicate<T extends IIdentifiable>(
        primaryDataObject: T,
        allDuplicates: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
    {
        if (!allDuplicates.value.has(primaryDataObject.id.value))
        {
            return;
        }

        allDuplicates.value.get(primaryDataObject.id.value)?.value.duplicateDataTypesByID.value.forEach((v, k, map) =>
        {
            if (!allDuplicates.value.has(k))
            {
                return;
            }

            allDuplicates.value.get(k)?.value.duplicateDataTypesByID.value.delete(primaryDataObject.id.value);
            if (allDuplicates.value.has(k) && allDuplicates.value.get(k)?.value.duplicateDataTypesByID.value.size == 0)
            {
                allDuplicates.value.delete(k);
            }
        });

        allDuplicates.value.delete(primaryDataObject.id.value);
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
        currentDuplicateSecondaryObjects: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>,
        allSecondaryDataObjects: Field<Map<string, Field<T>>>)
    {
        // setup so that we don't get any exceptions
        if (!currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value))
        {
            currentDuplicateSecondaryObjects.value.set(secondaryDataObject.id.value, new Field(new DuplicateDataTypes()));
        }

        const potentiallyNewDuplicateSecondaryObject: string[] =
            this.getSecondaryDataObjectDuplicates(secondaryDataObject, primaryDataObjectCollection, allSecondaryDataObjects);

        // there are no duplicate secondary objects anywhere, so nothing to do
        if (potentiallyNewDuplicateSecondaryObject.length == 0 &&
            currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.duplicateDataTypesByID.value.size == 0)
        {
            currentDuplicateSecondaryObjects.value.delete(secondaryDataObject.id.value);
            return;
        }

        const addedDuplicateSeconaryObjects: string[] = potentiallyNewDuplicateSecondaryObject.filter(
            o => !currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.duplicateDataTypesByID.value.has(o));

        const removedDuplicateSecondaryObjects: string[] | undefined = currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.
            value.duplicateDataTypesByID.value.mapWhere((k, v) => !potentiallyNewDuplicateSecondaryObject.includes(k), (k, v) => k);

        addedDuplicateSeconaryObjects.forEach(o =>
        {
            // add added secondary object to current secondary object's duplicate list
            if (!currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.duplicateDataTypesByID.value.has(o))
            {
                currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.duplicateDataTypesByID.value.set(o, new Field(o));
            }

            // need to create a list for the added secondary object if it doesn't exist. Duplicate secondary objects go both ways
            if (!currentDuplicateSecondaryObjects.value.has(o))
            {
                currentDuplicateSecondaryObjects.value.set(o, new Field(new DuplicateDataTypes()));
            }

            // add curent secondary object to added secondary objects duplicate list
            if (!currentDuplicateSecondaryObjects.value.get(o)?.value.duplicateDataTypesByID.value.has(secondaryDataObject.id.value))
            {
                currentDuplicateSecondaryObjects.value.get(o)?.value.duplicateDataTypesByID.value.set(secondaryDataObject.id.value, new Field(secondaryDataObject.id.value));
            }
        });

        removedDuplicateSecondaryObjects?.forEach(o =>
        {
            // remove removed secondary object from current secondary object's duplicate list
            currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.duplicateDataTypesByID.value.delete(o);

            if (!currentDuplicateSecondaryObjects.value.has(o))
            {
                return;
            }

            // remove current secondary object from removed secondary object's list
            if (currentDuplicateSecondaryObjects.value.get(o)?.value.duplicateDataTypesByID.value.has(secondaryDataObject.id.value))
            {
                currentDuplicateSecondaryObjects.value.get(o)?.value.duplicateDataTypesByID.value.delete(secondaryDataObject.id.value);
                if (currentDuplicateSecondaryObjects.value.get(o)?.value.duplicateDataTypesByID.value.size == 0)
                {
                    currentDuplicateSecondaryObjects.value.delete(o);
                }
            }
        });

        if (currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.duplicateDataTypesByID.value.size == 0)
        {
            currentDuplicateSecondaryObjects.value.delete(secondaryDataObject.id.value);
        }
    }

    protected removeSeconaryObjectFromEmptySecondaryObjects(
        secondaryObjectID: string,
        currentEmptySecondaryObjects: Field<Map<string, Field<string>>>)
    {
        currentEmptySecondaryObjects.value.delete(secondaryObjectID);
    }

    // checks / handles emptiness for a single secondary object
    // secondaryObjectID: the id of the filter / group
    // primaryObjectIDsForSecondaryObject: the primary objects the filter / group has. either .passwords or .values
    // currentEmptySecondaryObjects: the list of current empty secondary objects
    protected checkUpdateEmptySecondaryObject(
        secondaryObjectID: string,
        primaryObjectIDsForSecondaryObject: Map<string, Field<string>>,
        currentEmptySecondaryObjects: Field<Map<string, Field<string>>>)
    {
        // check to see if this filter has any passwords or values
        if (primaryObjectIDsForSecondaryObject.size == 0)
        {
            // if it doesn't, then add it to the list of empty filters
            if (!currentEmptySecondaryObjects.value.has(secondaryObjectID))
            {
                currentEmptySecondaryObjects.value.set(secondaryObjectID, new Field(secondaryObjectID));
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
        currentDuplicateSecondaryDataObjects: Field<Map<string, Field<KnownMappedFields<DuplicateDataTypes>>>>)
    {
        if (!currentDuplicateSecondaryDataObjects.value.has(secondaryDataObjectID))
        {
            return;
        }

        currentDuplicateSecondaryDataObjects.value.get(secondaryDataObjectID)?.value.duplicateDataTypesByID.value.forEach((v, k, map) =>
        {
            if (!currentDuplicateSecondaryDataObjects.value.has(k))
            {
                return;
            }

            currentDuplicateSecondaryDataObjects.value.get(k)?.value.duplicateDataTypesByID.value.delete(secondaryDataObjectID);
            if (currentDuplicateSecondaryDataObjects.value.get(k)?.value.duplicateDataTypesByID.value.size == 0)
            {
                currentDuplicateSecondaryDataObjects.value.delete(k);
            }
        });

        currentDuplicateSecondaryDataObjects.value.delete(secondaryDataObjectID);
    }
}
