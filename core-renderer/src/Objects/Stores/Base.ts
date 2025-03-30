import { Reactive, Ref, reactive, ref } from "vue";
import cryptHelper from "../../Helpers/cryptHelper";
import { VaultStoreParameter } from "./VaultStore";
import { api } from "../../API";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, DataType, Filter, Group, IPrimaryDataObject, ISecondaryDataObject, MAX_CURRENT_AND_SAFE_SIZE, RelatedDataTypeChanges } from "../../Types/DataTypes";
import { SecretProperty, SecretPropertyType } from "../../Types/Fields";
import { IIdentifiable, KnownMappedFields, PrimaryDataObjectCollection, SecondaryDataObjectCollection } from "@vaultic/shared/Types/Fields";
import { Algorithm } from "@vaultic/shared/Types/Keys";
import { CurrentAndSafeStructure, DictionaryAsList, DoubleKeyedObject, PendingStoreState, StateKeys, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

export type StoreEvents = "onChanged";

export class Store<T extends KnownMappedFields<StoreState>, K extends StateKeys, U extends string = StoreEvents>
{
    events: Dictionary<{ (...params: any[]): void }[]>;

    protected state: Reactive<T>;
    protected retriever: StorePathRetriever<K> | undefined;
    private internalStoreType: StoreType;

    get type() { return this.internalStoreType; }

    constructor(storeType: StoreType, retriever: StorePathRetriever<K> | undefined = undefined)
    {
        this.state = reactive(this.defaultState());
        this.retriever = retriever;
        this.internalStoreType = storeType;
        this.events = {};
    }

    public getState(): Reactive<T>
    {
        return this.state;
    }

    public getBackupableState(): any
    {
        const state: { [key: string]: any } = {};
        state[this.internalStoreType] = JSON.vaulticStringify(this.getState());

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
            await api.repositories.logs.log(undefined, `Exception when parsing JSON state for ${this.type}`);
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

    constructor(vault: VaultStoreParameter, storeType: StoreType, retriever: StorePathRetriever<K>)
    {
        super(storeType, retriever);
        this.vault = vault;
    }
}

export class DataTypeStore<T extends KnownMappedFields<StoreState>, K extends StateKeys, U extends string = StoreEvents>
    extends VaultContrainedStore<T, K, U>
{
    constructor(vault: VaultStoreParameter, storeType: StoreType, retriever: StorePathRetriever<K>)
    {
        super(vault, storeType, retriever);
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
            if (OH.has(newRelated, currentKeys[i]))
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
    'dataTypesByID.dataType.filters': '',
    'dataTypesByID.dataType.groups': '',
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
    public removeSecondaryObjectFromValues(
        secondaryObjectID: string,
        secondaryDataObjectCollection: SecondaryDataObjectCollection,
        pathToSecondaryObjectsOnPrimaryObject: keyof K): PendingStoreState<T, K>
    {
        const pendingState = this.getPendingState()!;
        OH.forEachValue(this.getPrimaryDataTypesByID(pendingState.state), (v => 
        {
            if (!OH.has(v[secondaryDataObjectCollection], secondaryObjectID))
            {
                return;
            }

            pendingState.deleteValue(pathToSecondaryObjectsOnPrimaryObject, secondaryObjectID, v.id);
        }));

        return pendingState;
    }

    protected getPrimaryDataTypesByID(state: T): { [key: string]: IPrimaryDataObject }
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
                    if (!OH.has(allDuplicates, primaryDataObject.id))
                    {
                        const newDuplicate: DictionaryAsList = {};
                        newDuplicate[currentId] = true;

                        pendingStoreState.addValue('duplicateDataTypes', primaryDataObject.id, newDuplicate);
                    }
                    else if (!OH.has(allDuplicates[primaryDataObject.id], currentId))
                    {
                        pendingStoreState.addValue('duplicateDataTypes.dataTypes', currentId, true, primaryDataObject.id);
                    }

                    // updating the duplciate primaryObjects list to include the current primaryObjects id
                    if (!OH.has(allDuplicates, currentId))
                    {
                        const newDuplicate: DictionaryAsList = {};
                        newDuplicate[primaryDataObject.id] = true;

                        pendingStoreState.addValue('duplicateDataTypes', currentId, newDuplicate);
                    }
                    else if (!OH.has(allDuplicates[currentId], primaryDataObject.id))
                    {
                        pendingStoreState.addValue('duplicateDataTypes.dataTypes', primaryDataObject.id, true, currentId);
                    }
                }
                else
                {
                    // We don't want to remove from our primaryDataObject collection yet since we could be removing all
                    // of them in which case we want to just delete the object
                    removedDuplicates.push(currentId);

                    if (OH.has(allDuplicates, currentId) && OH.has(allDuplicates[currentId], primaryDataObject.id))
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
        if (!OH.has(allDuplicates, primaryDataObject.id))
        {
            return;
        }

        OH.forEachKey(allDuplicates[primaryDataObject.id], (k) =>
        {
            if (!OH.has(allDuplicates, k))
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

            if (!OH.has(dataTypesByHash, hashID))
            {
                const newHashEntry: DictionaryAsList = {};
                newHashEntry[newValue.id] = true;

                pendingStoreState.addValue("dataTypesByHash", hashID, newHashEntry);
            }
            else
            {
                const valuesForHash = dataTypesByHash[hashID];
                if (!OH.has(valuesForHash, newValue.id))
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
            if (valuesForHash && OH.has(valuesForHash, currentValue.id))
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
        allSecondaryDataObjects: { [key: string]: T }): string[]
    {
        // we don't have any primary objects so grab others that are also empty
        if (OH.size(secondaryDataObject[primaryDataObjectCollection]) == 0)
        {
            return OH.mapWhere(allSecondaryDataObjects,
                (k, v) => k != secondaryDataObject.id && OH.size(v[primaryDataObjectCollection]) == 0, (k) => k);
        }

        // only need to check others that have the same length
        let potentiallyDuplicateObjects: T[] = OH.mapWhere(allSecondaryDataObjects,
            (_, v) => v[primaryDataObjectCollection].size == secondaryDataObject[primaryDataObjectCollection].size, (_, v) => v);

        for (const [key, _] of Object.entries(secondaryDataObject[primaryDataObjectCollection]))
        {
            // we've filtered out all secondary objects, aka there aren't any duplicates. We can stop checking
            if (potentiallyDuplicateObjects.length == 0)
            {
                return [];
            }

            // only grap the secondary objects with values that match our current one
            potentiallyDuplicateObjects = potentiallyDuplicateObjects.filter(v => OH.has(v[primaryDataObjectCollection], key));
        }

        return potentiallyDuplicateObjects.map(v => v.id);
    }

    /**
     * checks / handles duplicates for a single filter or group
     * @param secondaryDataObject The current secondary object we are checking duplicates for
     * @param primaryDataObjectCollection The collection of primary objects we are checking duplicate for, either "p" or "v"
     * @param currentDuplicateSecondaryObjects All the current duplicate secondary objects, either duplicatePasswordDataTypes or duplicateValueDataTypes
     * @param allSecondaryDataObjects All current secondary objects, either passwordDataTypes or valueDataTypes
     * @param duplicateDataTypesPath The path to the current duplicate data types, either "duplicatePasswordDataTypes" or "duplicateValueDataTypes"
     * @param duplicateDataTypesDataTypesPath the path to the current duplicates data types data tyeps, either "duplicatePasswordDataTypes.dataTypes" or "duplicateValueDataTypes.dataTypes"
     * @param pendingStoreState The current pending store state
     * @returns 
     */
    protected checkUpdateDuplicateSecondaryObjects<D extends Filter | Group>(
        secondaryDataObject: D,
        primaryDataObjectCollection: PrimaryDataObjectCollection,
        currentDuplicateSecondaryObjects: DoubleKeyedObject,
        allSecondaryDataObjects: { [key: string]: D },
        duplicateDataTypesPath: keyof K,
        duplicateDataTypesDataTypesPath: keyof K,
        pendingStoreState: PendingStoreState<T, K>)
    {
        const potentiallyNewDuplicateSecondaryObject: string[] =
            this.getSecondaryDataObjectDuplicates(secondaryDataObject, primaryDataObjectCollection, allSecondaryDataObjects);

        const hasDuplicatesForCurrentScondaryObject = OH.has(currentDuplicateSecondaryObjects, secondaryDataObject.id);

        // there are no duplicate secondary objects anywhere, so nothing to do
        if (potentiallyNewDuplicateSecondaryObject.length == 0 &&
            (!hasDuplicatesForCurrentScondaryObject || OH.size(currentDuplicateSecondaryObjects[secondaryDataObject.id]) == 0))
        {
            return;
        }

        const addedDuplicateSeconaryObjects: string[] = potentiallyNewDuplicateSecondaryObject.filter(
            o => !hasDuplicatesForCurrentScondaryObject || !OH.has(currentDuplicateSecondaryObjects[secondaryDataObject.id], o));

        const removedDuplicateSecondaryObjects: string[] | undefined = !hasDuplicatesForCurrentScondaryObject ? [] :
            OH.mapWhere(currentDuplicateSecondaryObjects[secondaryDataObject.id], (k, _) => !potentiallyNewDuplicateSecondaryObject.includes(k), (k, _) => k);


        let deleteAllForThisDuplicates = false;
        // we don't have any duplicates left, delete the entire object for this secondary data object
        if ((addedDuplicateSeconaryObjects.length + OH.size(currentDuplicateSecondaryObjects[secondaryDataObject.id]) - removedDuplicateSecondaryObjects.length) == 0)
        {
            deleteAllForThisDuplicates = true;
            pendingStoreState.deleteValue(duplicateDataTypesPath, secondaryDataObject.id);
        }

        removedDuplicateSecondaryObjects?.forEach(o =>
        {
            if (!deleteAllForThisDuplicates)
            {
                // remove removed secondary object from current secondary object's duplicate list
                pendingStoreState.deleteValue(duplicateDataTypesDataTypesPath, o, secondaryDataObject.id);
            }

            if (!OH.has(currentDuplicateSecondaryObjects, o))
            {
                return;
            }

            // remove current secondary object from removed secondary object's list
            if (OH.size(currentDuplicateSecondaryObjects[o]) == 0)
            {
                pendingStoreState.deleteValue(duplicateDataTypesPath, o);
            }
            else
            {
                pendingStoreState.deleteValue(duplicateDataTypesDataTypesPath, secondaryDataObject.id, o);
            }
        });


        let alreadyAddedAllDupsForThisSecondaryObject = false;
        if (!OH.has(currentDuplicateSecondaryObjects, secondaryDataObject.id))
        {
            alreadyAddedAllDupsForThisSecondaryObject = true;
            const dups: DictionaryAsList = {};

            for (let i = 0; i < addedDuplicateSeconaryObjects.length; i++)
            {
                dups[addedDuplicateSeconaryObjects[i]] = true;
            }

            pendingStoreState.addValue(duplicateDataTypesPath, secondaryDataObject.id, dups);
        }

        addedDuplicateSeconaryObjects.forEach(o =>
        {
            if (!alreadyAddedAllDupsForThisSecondaryObject)
            {
                pendingStoreState.addValue(duplicateDataTypesDataTypesPath, o, true, secondaryDataObject.id);
            }

            // need to create a list for the added secondary object if it doesn't exist. Duplicate secondary objects go both ways
            if (!OH.has(currentDuplicateSecondaryObjects, o))
            {
                const dups: DictionaryAsList = {};
                dups[secondaryDataObject.id] = true;

                pendingStoreState.addValue(duplicateDataTypesPath, o, dups);
            }
            else
            {
                // add curent secondary object to added secondary objects duplicate list
                pendingStoreState.addValue(duplicateDataTypesDataTypesPath, secondaryDataObject.id, true, o);
            }
        });
    }

    protected removeSeconaryObjectFromEmptySecondaryObjects(
        secondaryObjectID: string,
        emptyDataTypesPath: keyof K,
        pendingStoreState: PendingStoreState<T, K>)
    {
        const emptyDataTypes: DictionaryAsList = pendingStoreState.getObject(emptyDataTypesPath);
        if (!OH.has(emptyDataTypes, secondaryObjectID))
        {
            return;
        }

        pendingStoreState.deleteValue(emptyDataTypesPath, secondaryObjectID);
    }

    /**
     * checks / handles emptiness for a single secondary object
     * @param secondaryObjectID The Id of the secondary data object, either Filter or Group
     * @param primaryObjectIDsForSecondaryObject The Passwords or Values for this Filter or Group
     * @param emptyDataTypePath The path to the empty data types for, either for emptyPasswordDatatypes or emptyValueDataTypes
     * @param currentEmptySecondaryObjects The current list of empty secondary objects
     * @param pendingState The current pending state
     */
    protected checkUpdateEmptySecondaryObject(
        secondaryObjectID: string,
        primaryObjectIDsForSecondaryObject: DictionaryAsList,
        emptyDataTypePath: keyof K,
        currentEmptySecondaryObjects: DictionaryAsList,
        pendingState: PendingStoreState<T, K>)
    {
        // check to see if this filter has any passwords or values
        if (OH.size(primaryObjectIDsForSecondaryObject) == 0)
        {
            // if it doesn't, then add it to the list of empty filters
            if (!OH.has(currentEmptySecondaryObjects, secondaryObjectID))
            {
                pendingState.addValue(emptyDataTypePath, secondaryObjectID, true);
            }
        }
        else
        {
            // since we do have passwords or values, remove the secondary object from the empty list if its in there
            this.removeSeconaryObjectFromEmptySecondaryObjects(secondaryObjectID, emptyDataTypePath, pendingState);
        }
    }

    protected removeSecondaryDataObjetFromDuplicateSecondaryDataObjects(
        secondaryDataObjectID: string,
        duplicateDataTypesPath: keyof K,
        duplicateDataTypesDataTypePath: keyof K,
        pendingStoreState: PendingStoreState<T, K>)
    {
        const currentDuplicateSecondaryDataObjects: DoubleKeyedObject = pendingStoreState.getObject(duplicateDataTypesPath);
        if (!OH.has(currentDuplicateSecondaryDataObjects, secondaryDataObjectID))
        {
            return;
        }

        OH.forEachKey(currentDuplicateSecondaryDataObjects[secondaryDataObjectID], (k) =>
        {
            if (!OH.has(currentDuplicateSecondaryDataObjects, k))
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
