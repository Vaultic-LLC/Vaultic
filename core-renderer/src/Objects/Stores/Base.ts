import { Reactive, Ref, reactive, ref } from "vue";
import cryptHelper from "../../Helpers/cryptHelper";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, DataType, Filter, Group, ISecondaryDataObject, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { SecretProperty, SecretPropertyType } from "../../Types/Fields";
import { Field, IFieldedObject, IFieldObject, IIdentifiable, KnownMappedFields, NonArrayType, PrimaryDataObjectCollection, Primitive, SecondaryDataObjectCollection, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { PendingStoreState, StoreState } from "@vaultic/shared/Types/Stores";

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

    public getPendingState(): PendingStoreState<T>
    {
        const state = this.cloneState();
        return new PendingStoreState(state);
    }

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

    protected async getIdentifyingHash(value: string): Promise<string | undefined>
    {
        // TODO: switch to argon
        const response = await api.utilities.hash.hash(Algorithm.SHA_256, value);
        if (!response.success || !response.value)
        {
            return;
        }

        return response.value!.substring(0, 5);
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

export class DataTypeStore<T extends KnownMappedFields<StoreState>, U extends string = StoreEvents> extends VaultContrainedStore<T, U>
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

    protected getRelatedDataTypeChanges(currentRelated: Map<string, Field<string>>, newRelated: Map<string, Field<string>>): RelatedDataTypeChanges
    {
        const added: Map<string, Field<string>> = new Map();
        const removed: Map<string, Field<string>> = new Map();
        const unchanged: Map<string, Field<string>> = new Map();

        const currentKeys = currentRelated.keyArray();
        const newKeys = newRelated.keyArray();

        for (let i = 0; i < currentKeys.length; i++)
        {
            // in both, it was unchagned
            if (newRelated.has(currentKeys[i]))
            {
                unchanged.set(currentKeys[i], currentRelated.get(currentKeys[i])!);
                newKeys.splice(newKeys.indexOf(currentKeys[i]), 1);
            }
            // not in new, it was removed
            else 
            {
                removed.set(currentKeys[i], currentRelated.get(currentKeys[i])!);
            }
        }

        // not in current, were added
        for (let i = 0; i < newKeys.length; i++)
        {
            added.set(newKeys[i], newRelated.get(currentKeys[i])!);
        }

        return new RelatedDataTypeChanges(added, removed, unchanged);
    }
}

export class PrimaryDataTypeStore<T extends KnownMappedFields<StoreState>, U extends string = StoreEvents> extends DataTypeStore<T, U>
{
    public removeSecondaryObjectFromValues(secondaryObjectID: string, secondaryObjectCollection: SecondaryDataObjectCollection): T
    {
        const pendingState = this.cloneState();
        this.getPrimaryDataTypesByID(pendingState).value.forEach((v, k, map) =>
        {
            v.value[secondaryObjectCollection].removeMapValue(secondaryObjectID);
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
        valuesByHash: Field<Map<string, Field<Map<string, Field<string>>>>>,
        allPrimaryObjects: Field<Map<string, Field<T>>>,
        secretProperty: U,
        allDuplicates: Field<Map<string, Field<Map<string, Field<string>>>>>): Promise<void>
    {
        // first make sure we have a list so no null reference exceptions
        if (!allDuplicates.value.get(primaryDataObject.id.value))
        {
            allDuplicates.addMapValue(primaryDataObject.id.value, Field.create(new Map()));
        }
        else
        {
            // for change tracking
            allDuplicates.value.get(primaryDataObject.id.value)!.updateAndBubble();
        }

        const hashID = await this.getIdentifyingHash(primaryDataObject[secretProperty].value);
        if (!hashID)
        {
            await api.repositories.logs.log(undefined, "Failed to hash", Error().stack);
            return;
        }

        const valuesForHash = valuesByHash.value.get(hashID);

        if (valuesForHash)
        {
            for (const [key, _] of valuesForHash.value.entries())
            {
                let tempPrimaryObject: Field<T> | undefined = allPrimaryObjects.value.get(key);
                if (!tempPrimaryObject)
                {
                    continue;
                }

                const currentId: string = key;

                // don't count our own as a duplicate
                if (currentId == primaryDataObject.id.value)
                {
                    continue;
                }

                // make sure we have a valid list before doing any checking
                if (!allDuplicates.value.get(currentId))
                {
                    allDuplicates.addMapValue(currentId, Field.create(new Map()));
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
                    if (!allDuplicates.value.get(primaryDataObject.id.value)?.value.has(currentId))
                    {
                        allDuplicates.value.get(primaryDataObject.id.value)?.addMapValue(currentId, Field.create(currentId));
                    }

                    // updating the duplciate primaryObjects list to include the current primaryObjects id
                    if (!allDuplicates.value.get(currentId)?.value.has(primaryDataObject.id.value))
                    {
                        allDuplicates.value.get(currentId)?.addMapValue(primaryDataObject.id.value, Field.create(currentId));
                    }
                }
                else
                {
                    if (allDuplicates.value.get(primaryDataObject.id.value)?.value.has(currentId))
                    {
                        // remove old duplicate id from current primary objects list since it is no longer a duplicate
                        allDuplicates.value.get(primaryDataObject.id.value)?.removeMapValue(currentId);
                    }

                    if (allDuplicates.value.get(currentId)?.value.has(primaryDataObject.id.value))
                    {
                        // remove current primary object from temp primary objects list since it is no loner a duplicate
                        allDuplicates.value.get(currentId)?.removeMapValue(primaryDataObject.id.value);
                    }

                    // remove  temp primary objects list since it no longer has any duplicates
                    if (allDuplicates.value.has(currentId) && allDuplicates.value.get(currentId)?.value.size == 0)
                    {
                        allDuplicates.removeMapValue(currentId)
                    }
                }
            }
        }

        // updates all the fields in the other duplicate data objects collections for change tracking
        allDuplicates.value.get(primaryDataObject.id.value)?.value.forEach((v, k, map) => 
        {
            if (allDuplicates.value.has(k) && allDuplicates.value.get(k)?.value.has(primaryDataObject.id.value))
            {
                allDuplicates.value.get(k)!.value.get(primaryDataObject.id.value)!.updateAndBubble();
            }
        });

        // remove current primary objects list since it no longer has any entries
        if (allDuplicates.value.has(primaryDataObject.id.value) && allDuplicates.value.get(primaryDataObject.id.value)?.value.size == 0)
        {
            allDuplicates.removeMapValue(primaryDataObject.id.value)
        }
    }

    // used when updating a password / value that didn't have its secret property updated (password / value). 
    // usually checkUpdateDuplicatePrimaryObjects handles this but we don't call that if the secret property wasn't updated since 
    // we know duplicate values can't change. We still want to update their modified times though for change tracking so that if the backing 
    // password / value was deleted on another device before it was updated, they are retrained and so are the duplicates
    protected checkUpdateDuplicatePrimaryObjectsModifiedTime(primaryDataObjectID: string, allDuplicates: Field<Map<string, Field<Map<string, Field<string>>>>>)
    {
        if (!allDuplicates.value.has(primaryDataObjectID))
        {
            return;
        }

        allDuplicates.value.get(primaryDataObjectID)!.updateAndBubble();

        // updates all the fields in the other duplicate data objects collections for change tracking
        allDuplicates.value.get(primaryDataObjectID)?.value.forEach((v, k, map) => 
        {
            if (allDuplicates.value.has(k) && allDuplicates.value.get(k)?.value.has(primaryDataObjectID))
            {
                allDuplicates.value.get(k)!.value.get(primaryDataObjectID)!.updateAndBubble();
            }
        });
    }

    protected checkRemoveFromDuplicate<T extends IIdentifiable>(
        primaryDataObject: T,
        allDuplicates: Field<Map<string, Field<Map<string, Field<string>>>>>)
    {
        if (!allDuplicates.value.has(primaryDataObject.id.value))
        {
            return;
        }

        allDuplicates.value.get(primaryDataObject.id.value)?.value.forEach((v, k, map) =>
        {
            if (!allDuplicates.value.has(k))
            {
                return;
            }

            allDuplicates.value.get(k)?.removeMapValue(primaryDataObject.id.value);
            if (allDuplicates.value.has(k) && allDuplicates.value.get(k)?.value.size == 0)
            {
                allDuplicates.removeMapValue(k);
            }
        });

        allDuplicates.removeMapValue(primaryDataObject.id.value);
    }

    protected async updateValuesByHash<T extends IIdentifiable & SecretPropertyType<U> & IFieldObject, U extends SecretProperty>
        (valuesByHash: Field<Map<string, Field<Map<string, Field<string>>>>>, secretProperty: U, newValue?: T, currentValue?: T)
    {
        if (newValue)
        {
            const hashID = await this.getIdentifyingHash(newValue[secretProperty].value);
            if (!hashID)
            {
                await api.repositories.logs.log(undefined, "Failed to hash", Error().stack);
                return;
            }

            if (!valuesByHash.value.has(hashID))
            {
                valuesByHash.addMapValue(hashID, Field.create(new Map()));
            }

            const valuesForHash = valuesByHash.value.get(hashID);
            if (!valuesForHash!.value.has(newValue.id.value))
            {
                valuesForHash!.addMapValue(newValue.id.value, Field.create(newValue.id.value));
            }
        }

        if (currentValue)
        {
            const hashID = await this.getIdentifyingHash(currentValue[secretProperty].value);
            if (!hashID)
            {
                await api.repositories.logs.log(undefined, "Failed to hash", Error().stack);
                return;
            }

            const valuesForHash = valuesByHash.value.get(hashID);

            if (valuesForHash && valuesForHash.value.has(currentValue.id.value))
            {
                valuesForHash.removeMapValue(currentValue.id.value);
                if (valuesForHash.value.size == 0)
                {
                    valuesByHash.removeMapValue(hashID);
                }
            }
        }
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
        currentDuplicateSecondaryObjects: Field<Map<string, Field<Map<string, Field<string>>>>>,
        allSecondaryDataObjects: Field<Map<string, Field<T>>>)
    {
        // setup so that we don't get any exceptions
        if (!currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value))
        {
            currentDuplicateSecondaryObjects.addMapValue(secondaryDataObject.id.value, Field.create(new Map()));
        }
        else 
        {
            // for change tracking
            currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)!.updateAndBubble();
        }

        const potentiallyNewDuplicateSecondaryObject: string[] =
            this.getSecondaryDataObjectDuplicates(secondaryDataObject, primaryDataObjectCollection, allSecondaryDataObjects);

        // there are no duplicate secondary objects anywhere, so nothing to do
        if (potentiallyNewDuplicateSecondaryObject.length == 0 &&
            currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.size == 0)
        {
            currentDuplicateSecondaryObjects.removeMapValue(secondaryDataObject.id.value);
            return;
        }

        const addedDuplicateSeconaryObjects: string[] = potentiallyNewDuplicateSecondaryObject.filter(
            o => !currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.has(o));

        const removedDuplicateSecondaryObjects: string[] | undefined = currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)
            ?.value.mapWhere((k, v) => !potentiallyNewDuplicateSecondaryObject.includes(k), (k, v) => k);

        // remove no longer duplicates first so that all we have after are un edited ones and we can update the change tracking for those
        removedDuplicateSecondaryObjects?.forEach(o =>
        {
            // remove removed secondary object from current secondary object's duplicate list
            currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.removeMapValue(o);

            if (!currentDuplicateSecondaryObjects.value.has(o))
            {
                return;
            }

            // remove current secondary object from removed secondary object's list
            if (currentDuplicateSecondaryObjects.value.get(o)?.value.has(secondaryDataObject.id.value))
            {
                currentDuplicateSecondaryObjects.value.get(o)?.removeMapValue(secondaryDataObject.id.value);
                if (currentDuplicateSecondaryObjects.value.get(o)?.value.size == 0)
                {
                    currentDuplicateSecondaryObjects.removeMapValue(o);
                }
            }
        });

        // updates all the fields in the other duplicate data objects collections for change tracking
        currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.forEach((v, k, map) => 
        {
            currentDuplicateSecondaryObjects.value.get(k)!.value.get(secondaryDataObject.id.value)!.updateAndBubble();
        });

        addedDuplicateSeconaryObjects.forEach(o =>
        {
            // add added secondary object to current secondary object's duplicate list
            if (!currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.has(o))
            {
                currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.addMapValue(o, Field.create(o));
            }

            // need to create a list for the added secondary object if it doesn't exist. Duplicate secondary objects go both ways
            if (!currentDuplicateSecondaryObjects.value.has(o))
            {
                currentDuplicateSecondaryObjects.addMapValue(o, Field.create(new Map()));
            }

            // add curent secondary object to added secondary objects duplicate list
            if (!currentDuplicateSecondaryObjects.value.get(o)?.value.has(secondaryDataObject.id.value))
            {
                currentDuplicateSecondaryObjects.value.get(o)?.addMapValue(secondaryDataObject.id.value, Field.create(secondaryDataObject.id.value));
            }
        });

        if (currentDuplicateSecondaryObjects.value.get(secondaryDataObject.id.value)?.value.size == 0)
        {
            currentDuplicateSecondaryObjects.removeMapValue(secondaryDataObject.id.value);
        }
    }

    protected removeSeconaryObjectFromEmptySecondaryObjects(
        secondaryObjectID: string,
        currentEmptySecondaryObjects: Field<Map<string, Field<string>>>)
    {
        currentEmptySecondaryObjects.removeMapValue(secondaryObjectID);
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
                currentEmptySecondaryObjects.addMapValue(secondaryObjectID, Field.create(secondaryObjectID));
            }
            else 
            {
                // for change tracking
                currentEmptySecondaryObjects.value.get(secondaryObjectID)!.updateAndBubble();
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
        currentDuplicateSecondaryDataObjects: Field<Map<string, Field<Map<string, Field<string>>>>>)
    {
        if (!currentDuplicateSecondaryDataObjects.value.has(secondaryDataObjectID))
        {
            return;
        }

        currentDuplicateSecondaryDataObjects.value.get(secondaryDataObjectID)?.value.forEach((v, k, map) =>
        {
            if (!currentDuplicateSecondaryDataObjects.value.has(k))
            {
                return;
            }

            currentDuplicateSecondaryDataObjects.value.get(k)?.removeMapValue(secondaryDataObjectID);
            if (currentDuplicateSecondaryDataObjects.value.get(k)?.value.size == 0)
            {
                currentDuplicateSecondaryDataObjects.removeMapValue(k);
            }
        });

        currentDuplicateSecondaryDataObjects.removeMapValue(secondaryDataObjectID);
    }
}
