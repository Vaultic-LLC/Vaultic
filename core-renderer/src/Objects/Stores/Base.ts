import { Reactive, Ref, reactive, ref } from "vue";
import cryptHelper from "../../Helpers/cryptHelper";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, CurrentAndSafeStructure, DataType, Filter, Group, ISecondaryDataObject, MAX_CURRENT_AND_SAFE_SIZE, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { SecretProperty, SecretPropertyType } from "../../Types/Fields";
import { IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection, SecondaryDataObjectCollection, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { DictionaryAsList, DoubleKeyedObject, PendingStoreState, StateKeys, StorePathRetriever, StoreState } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";
import { ReactiveValue } from "./ReactiveValue";
import { ReactivePassword } from "./ReactivePassword";

export type StoreEvents = "onChanged";

export class Store<T extends KnownMappedFields<StoreState>, K extends StateKeys, U extends string = StoreEvents>
{
    events: Dictionary<{ (...params: any[]): void }[]>;

    protected state: Reactive<T>;
    protected retriever: StorePathRetriever<K> | undefined;
    private internalStateName: string;

    get stateName() { return this.internalStateName; }

    constructor(stateName: string, retriever: StorePathRetriever<K> | undefined = undefined)
    {
        this.state = reactive(this.defaultState());
        this.retriever = retriever;
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

    public getPendingState(): PendingStoreState<T, K> | undefined
    {
        if (!this.retriever)
        {
            return;
        }

        const state = this.cloneState();
        return new PendingStoreState(state, this.retriever);
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

export class VaultContrainedStore<T extends KnownMappedFields<StoreState>, K extends StateKeys, U extends string = StoreEvents>
    extends Store<T, K, U>
{
    protected vault: VaultStoreParameter;

    constructor(vault: VaultStoreParameter, stateName: string, retriever: StorePathRetriever<K>)
    {
        super(stateName, retriever);
        this.vault = vault;
    }
}

export class DataTypeStore<T extends KnownMappedFields<StoreState>, K extends StateKeys, U extends string = StoreEvents>
    extends VaultContrainedStore<T, K, U>
{
    constructor(vault: VaultStoreParameter, stateName: string, retriever: StorePathRetriever<K>)
    {
        super(vault, stateName, retriever);
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

    protected getRelatedDataTypeChanges(currentRelated: DictionaryAsList, newRelated: DictionaryAsList): RelatedDataTypeChanges
    {
        const added: DictionaryAsList = {};
        const removed: DictionaryAsList = {};
        const unchanged: DictionaryAsList = {};

        const currentKeys = Object.keys(currentRelated);
        const newKeys = Object.keys(newRelated);

        for (let i = 0; i < currentKeys.length; i++)
        {
            // in both, it was unchagned
            if (newRelated.has(currentKeys[i]))
            {
                unchanged[currentKeys[i]] = currentRelated[currentKeys[i]];
                newKeys.splice(newKeys.indexOf(currentKeys[i]), 1);
            }
            // not in new, it was removed
            else 
            {
                removed[currentKeys[i]] = currentRelated[currentKeys[i]];
            }
        }

        // not in current, were added
        for (let i = 0; i < newKeys.length; i++)
        {
            added[newKeys[i]] = newRelated[currentKeys[i]];
        }

        return new RelatedDataTypeChanges(added, removed, unchanged);
    }
}

export interface PrimarydataTypeStoreStateKeys extends StateKeys
{
    'dataTypesByID': '',
    'dataTypesByID.dataType': '',
    'dataTypesByHash': '';
    'dataTypesByHash.dataTypes': '';
    'duplicateDataTypes': '';
    'duplicateDataTypes.dataTypes': '';
    'currentAndSafeDataTypes': '';
    'currentAndSafeDataTypes.current': '';
    'currentAndSafeDataTypes.safe': '';
};

export class PrimaryDataTypeStore<T extends KnownMappedFields<StoreState>, K extends PrimarydataTypeStoreStateKeys, U extends string = StoreEvents>
    extends DataTypeStore<T, K, U>
{
    public removeSecondaryObjectFromValues(secondaryObjectID: string, secondaryObjectCollection: SecondaryDataObjectCollection): T
    {
        const pendingState = this.cloneState();
        OH.forEachValue(this.getPrimaryDataTypesByID(pendingState), (v => 
        {
            v[secondaryObjectCollection].delete(secondaryObjectID);
        }));

        return pendingState;
    }

    protected getPrimaryDataTypesByID(state: T): { [key: string]: SecondaryDataObjectCollectionType }
    {
        return {} as any;
    }

    protected async checkUpdateDuplicatePrimaryObjects<D extends IIdentifiable & SecretPropertyType<U>, U extends SecretProperty>(
        masterKey: string,
        primaryDataObject: D,
        secretProperty: U,
        pendingStoreState: PendingStoreState<T, K>): Promise<void>
    {
        const allDuplicates: DoubleKeyedObject = pendingStoreState.getObject('duplicateDataTypes');

        const hashID = await this.getIdentifyingHash(primaryDataObject[secretProperty]);
        if (!hashID)
        {
            await api.repositories.logs.log(undefined, "Failed to hash", Error().stack);
            return;
        }

        const allPrimaryObjects: { [key: string]: D } = pendingStoreState.getObject('dataTypesByID');
        const valuesByHash: DoubleKeyedObject = pendingStoreState.getObject('dataTypesByHash');

        const valuesForHash = valuesByHash[hashID];
        const removedDuplicates: string[] = [];

        if (valuesForHash)
        {
            for (const [key, _] of Object.entries(valuesForHash))
            {
                let tempPrimaryObject: D | undefined = allPrimaryObjects[key];
                if (!tempPrimaryObject)
                {
                    continue;
                }

                const currentId: string = key;

                // don't count our own as a duplicate
                if (currentId == primaryDataObject.id)
                {
                    continue;
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
                    if (!allDuplicates.has(primaryDataObject.id))
                    {
                        const newDuplicate: DictionaryAsList = {};
                        newDuplicate[currentId] = true;

                        pendingStoreState.addValue('duplicateDataTypes', primaryDataObject.id, newDuplicate);
                    }
                    else if (!allDuplicates[primaryDataObject.id].has(currentId))
                    {
                        pendingStoreState.addValue('duplicateDataTypes.dataTypes', currentId, true, primaryDataObject.id);
                    }

                    // updating the duplciate primaryObjects list to include the current primaryObjects id
                    if (!allDuplicates.has(currentId))
                    {
                        const newDuplicate: DictionaryAsList = {};
                        newDuplicate[primaryDataObject.id] = true;

                        pendingStoreState.addValue('duplicateDataTypes', currentId, newDuplicate);
                    }
                    else if (!allDuplicates[currentId].has(primaryDataObject.id))
                    {
                        pendingStoreState.addValue('duplicateDataTypes.dataTypes', primaryDataObject.id, true, currentId);
                    }
                }
                else
                {
                    // We don't want to remove from our primaryDataObject collection yet since we could be removing all
                    // of them in which case we want to just delete the object
                    removedDuplicates.push(currentId);

                    if (allDuplicates.has(currentId) && allDuplicates[currentId].has(primaryDataObject.id))
                    {
                        // remove temp primary objects list since it no longer has any duplicates
                        if (OH.size(allDuplicates[currentId]) == 1)
                        {
                            pendingStoreState.deleteValue("duplicateDataTypes.dataTypes", primaryDataObject.id, currentId);
                        }
                        else
                        {
                            // remove current primary object from temp primary objects list since it is no loner a duplicate
                            pendingStoreState.deleteValue("duplicateDataTypes", currentId);
                        }
                    }
                }
            }
        }

        // we are deleting all of our duplicates
        if (OH.size(allDuplicates[primaryDataObject.id]) == removedDuplicates.length)
        {
            // remove current primary objects list since it no longer has any entries
            pendingStoreState.deleteValue("duplicateDataTypes", primaryDataObject.id);
        }
        else
        {
            for (let i = 0; i < removedDuplicates.length; i++)
            {
                pendingStoreState.deleteValue("duplicateDataTypes.dataTypes", removedDuplicates[i], primaryDataObject.id);
            }
        }
    }

    protected checkRemoveFromDuplicate<D extends IIdentifiable>(
        primaryDataObject: D,
        pendingStoreState: PendingStoreState<T, K>)
    {
        const allDuplicates: DoubleKeyedObject = pendingStoreState.getObject('duplicateDataTypes');
        if (!allDuplicates.has(primaryDataObject.id))
        {
            return;
        }

        OH.forEachKey(allDuplicates[primaryDataObject.id], (k) =>
        {
            if (!allDuplicates.has(k))
            {
                return;
            }

            if (OH.size(allDuplicates[k]) == 1)
            {
                // This password is the only duplicate for this other password, delete the entire object
                pendingStoreState.deleteValue('duplicateDataTypes', k);
            }
            else
            {
                pendingStoreState.deleteValue('duplicateDataTypes.dataTypes', primaryDataObject.id, k);
            }
        });

        pendingStoreState.deleteValue('duplicateDataTypes', primaryDataObject.id);
    }

    protected async updateValuesByHash<W extends IIdentifiable & SecretPropertyType<X>, X extends SecretProperty>(
        pendingStoreState: PendingStoreState<T, K>,
        secretProperty: X,
        newValue?: W,
        currentValue?: W)
    {
        const dataTypesByHash: DoubleKeyedObject = pendingStoreState.getObject("dataTypesByHash");

        if (newValue)
        {
            const hashID = await this.getIdentifyingHash(newValue[secretProperty]);
            if (!hashID)
            {
                await api.repositories.logs.log(undefined, "Failed to hash", Error().stack);
                return;
            }

            if (!dataTypesByHash.has(hashID))
            {
                const newHashEntry: DictionaryAsList = {};
                newHashEntry[newValue.id] = true;

                pendingStoreState.addValue("dataTypesByHash", hashID, newHashEntry);
            }
            else
            {
                const valuesForHash = dataTypesByHash[hashID];
                if (!valuesForHash!.has(newValue.id))
                {
                    pendingStoreState.addValue('dataTypesByHash.dataTypes', newValue.id, true, hashID);
                }
            }
        }

        if (currentValue)
        {
            const hashID = await this.getIdentifyingHash(currentValue[secretProperty]);
            if (!hashID)
            {
                await api.repositories.logs.log(undefined, "Failed to hash", Error().stack);
                return;
            }

            const valuesForHash = dataTypesByHash[hashID];
            if (valuesForHash && valuesForHash.has(currentValue.id))
            {
                // We are deleting the last value, delete everything
                if (OH.size(valuesForHash) == 1)
                {
                    pendingStoreState.deleteValue('dataTypesByHash', hashID);
                }
                else
                {
                    pendingStoreState.deleteValue('dataTypesByHash.dataTypes', currentValue.id, hashID);
                }
            }
        }
    }

    protected async incrementCurrentAndSafe<D>(
        pendingStoreState: PendingStoreState<T, K>,
        isSafe: (allDuplicates: DoubleKeyedObject, dataType: D) => boolean)
    {
        const currentAndSafe: CurrentAndSafeStructure = pendingStoreState.getObject('currentAndSafeDataTypes');
        const dataTypes: { [key: string]: D } = pendingStoreState.getObject('dataTypesByID');
        const duplicates: DoubleKeyedObject = pendingStoreState.getObject('duplicateDataTypes');

        if (currentAndSafe.c.length >= MAX_CURRENT_AND_SAFE_SIZE)
        {
            for (let i = 0; i < currentAndSafe.c.length - MAX_CURRENT_AND_SAFE_SIZE; i++)
            {
                pendingStoreState.deleteValue('currentAndSafeDataTypes.current', '');
                pendingStoreState.deleteValue('currentAndSafeDataTypes.safe', '');
            }
        }

        pendingStoreState.addValue('currentAndSafeDataTypes.current', '', OH.size(dataTypes));

        const safePasswords = OH.countWhere(dataTypes, (v) => isSafe(duplicates, v));
        pendingStoreState.addValue('currentAndSafeDataTypes.safe', '', safePasswords);
    }
}

export interface SecondarydataTypeStoreStateKeys extends StateKeys
{
    'passwordDataTypesByID': '';
    'passwordDataTypesByID.dataType': '';
    'passwordDataTypesByID.dataType.passwords': '';
    'valueDataTypesByID': '';
    'valueDataTypesByID.dataType': '';
    'valueDataTypesByID.dataType.values': '';
    'emptyPasswordDataTypes': '';
    'emptyValueDataTypes': '';
    'duplicatePasswordDataTypes': '';
    'duplicatePasswordDataTypes.dataTypes': '';
    'duplicateValueDataTypes': '';
    'duplicateValueDataTypes.dataTypes': '';
};

export class SecondaryDataTypeStore<T extends StoreState, K extends SecondarydataTypeStoreStateKeys, U extends string = StoreEvents>
    extends DataTypeStore<T, K, U>
{
    private getSecondaryDataObjectDuplicates<T extends ISecondaryDataObject>(
        secondaryDataObject: T,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        allSecondaryDataObjects: Map<string, T>): string[]
    {
        // make sure we aren't considering our current object as a duplicate to itself
        const secondaryDataObjectsToLookAt = allSecondaryDataObjects.filter((k, v) => k != secondaryDataObject.id);

        // we don't have any primary objects so grab others that are also empty
        if (secondaryDataObject[primaryDataObjectCollection].size == 0)
        {
            return secondaryDataObjectsToLookAt.mapWhere((k, v) => v[primaryDataObjectCollection].size == 0, (k, v) => v.id);
        }

        // only need to check others that have the same length
        let potentiallyDuplicateObjects: Map<string, T> = secondaryDataObjectsToLookAt.filter(
            (k, v) => v[primaryDataObjectCollection].size == secondaryDataObject[primaryDataObjectCollection].size);

        //@ts-ignore
        for (let item of secondaryDataObject[primaryDataObjectCollection].value)
        {
            // we've filtered out all secondary objects, aka there aren't any duplicates. We can stop checking
            if (potentiallyDuplicateObjects.size == 0)
            {
                return [];
            }

            // only grap the secondary objects with values that match our current one
            potentiallyDuplicateObjects = potentiallyDuplicateObjects.filter((k, v) => v[primaryDataObjectCollection].has(item[0]));
        }

        return potentiallyDuplicateObjects.map((k, v) => v.id);
    }

    // checks / handles duplicates for a single filter
    // secondaryDataObject: the filter / group to check / handle for
    // potentiallyNewDuplicateSecondaryObject: re calced duplicate filters / groups from getSecondaryDataObjectDuplicates()
    // currentDuplicateSecondaryObjects: last saved duplicate filters / groups
    protected checkUpdateDuplicateSecondaryObjects<T extends Filter | Group>(
        secondaryDataObject: T,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        currentDuplicateSecondaryObjects: Map<string, Map<string, string>>,
        allSecondaryDataObjects: Map<string, T>)
    {
        // setup so that we don't get any exceptions
        if (!currentDuplicateSecondaryObjects.get(secondaryDataObject.id))
        {
            currentDuplicateSecondaryObjects.set(secondaryDataObject.id, new Map());
        }
        else 
        {
            // for change tracking
            //currentDuplicateSecondaryObjects.get(secondaryDataObject.id)!.updateAndBubble();
        }

        const potentiallyNewDuplicateSecondaryObject: string[] =
            this.getSecondaryDataObjectDuplicates(secondaryDataObject, primaryDataObjectCollection, allSecondaryDataObjects);

        // there are no duplicate secondary objects anywhere, so nothing to do
        if (potentiallyNewDuplicateSecondaryObject.length == 0 &&
            currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.size == 0)
        {
            currentDuplicateSecondaryObjects.delete(secondaryDataObject.id);
            return;
        }

        const addedDuplicateSeconaryObjects: string[] = potentiallyNewDuplicateSecondaryObject.filter(
            o => !currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.has(o));

        const removedDuplicateSecondaryObjects: string[] | undefined = currentDuplicateSecondaryObjects.get(secondaryDataObject.id)
            ?.mapWhere((k, v) => !potentiallyNewDuplicateSecondaryObject.includes(k), (k, v) => k);

        // remove no longer duplicates first so that all we have after are un edited ones and we can update the change tracking for those
        removedDuplicateSecondaryObjects?.forEach(o =>
        {
            // remove removed secondary object from current secondary object's duplicate list
            currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.delete(o);

            if (!currentDuplicateSecondaryObjects.has(o))
            {
                return;
            }

            // remove current secondary object from removed secondary object's list
            if (currentDuplicateSecondaryObjects.get(o)?.has(secondaryDataObject.id))
            {
                currentDuplicateSecondaryObjects.get(o)?.delete(secondaryDataObject.id);
                if (currentDuplicateSecondaryObjects.get(o)?.size == 0)
                {
                    currentDuplicateSecondaryObjects.delete(o);
                }
            }
        });

        // updates all the fields in the other duplicate data objects collections for change tracking
        currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.forEach((v, k, map) => 
        {
            //currentDuplicateSecondaryObjects.get(k)!.get(secondaryDataObject.id)!.updateAndBubble();
        });

        addedDuplicateSeconaryObjects.forEach(o =>
        {
            // add added secondary object to current secondary object's duplicate list
            if (!currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.has(o))
            {
                currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.set(o, o);
            }

            // need to create a list for the added secondary object if it doesn't exist. Duplicate secondary objects go both ways
            if (!currentDuplicateSecondaryObjects.has(o))
            {
                currentDuplicateSecondaryObjects.set(o, new Map());
            }

            // add curent secondary object to added secondary objects duplicate list
            if (!currentDuplicateSecondaryObjects.get(o)?.has(secondaryDataObject.id))
            {
                currentDuplicateSecondaryObjects.get(o)?.set(secondaryDataObject.id, secondaryDataObject.id);
            }
        });

        if (currentDuplicateSecondaryObjects.get(secondaryDataObject.id)?.size == 0)
        {
            currentDuplicateSecondaryObjects.delete(secondaryDataObject.id);
        }
    }

    protected removeSeconaryObjectFromEmptySecondaryObjects(
        secondaryObjectID: string,
        emptyDataTypesPath: keyof K,
        pendingStoreState: PendingStoreState<T, K>)
    {
        const emptyDataTypes: DictionaryAsList = pendingStoreState.getObject(emptyDataTypesPath);
        if (!emptyDataTypes.has(secondaryObjectID))
        {
            return;
        }

        pendingStoreState.deleteValue(emptyDataTypesPath, secondaryObjectID);
    }

    // checks / handles emptiness for a single secondary object
    // secondaryObjectID: the id of the filter / group
    // primaryObjectIDsForSecondaryObject: the primary objects the filter / group has. either .passwords or .values
    // currentEmptySecondaryObjects: the list of current empty secondary objects
    protected checkUpdateEmptySecondaryObject(
        secondaryObjectID: string,
        primaryObjectIDsForSecondaryObject: DictionaryAsList,
        currentEmptySecondaryObjects: DictionaryAsList,
        pendingState: PendingStoreState<T, K>)
    {
        // check to see if this filter has any passwords or values
        if (primaryObjectIDsForSecondaryObject.size == 0)
        {
            // if it doesn't, then add it to the list of empty filters
            if (!currentEmptySecondaryObjects.has(secondaryObjectID))
            {
                currentEmptySecondaryObjects.set(secondaryObjectID, secondaryObjectID);
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
        duplicateDataTypesPath: keyof K,
        duplicateDataTypesDataTypePath: keyof K,
        pendingStoreState: PendingStoreState<T, K>)
    {
        const currentDuplicateSecondaryDataObjects: DoubleKeyedObject = pendingStoreState.getObject(duplicateDataTypesPath);
        if (!currentDuplicateSecondaryDataObjects.has(secondaryDataObjectID))
        {
            return;
        }

        OH.forEachKey(currentDuplicateSecondaryDataObjects[secondaryDataObjectID], (k) =>
        {
            if (!currentDuplicateSecondaryDataObjects.has(k))
            {
                return;
            }

            if (OH.size(currentDuplicateSecondaryDataObjects[k]) == 1)
            {
                pendingStoreState.deleteValue(duplicateDataTypesPath, k);
            }
            else
            {
                pendingStoreState.deleteValue(duplicateDataTypesDataTypePath, secondaryDataObjectID, k);
            }
        });

        pendingStoreState.deleteValue(duplicateDataTypesPath, secondaryDataObjectID);
    }
}
