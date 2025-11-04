import { PathChange, StoreStateChangeType, StoreType } from "@vaultic/shared/Types/Stores";
import { StoreState } from "../../Entities/States/StoreState";
import Transaction from "../../Transaction";
import { VaulticRepository } from "../VaulticRepository";
import { ClientChange, ClientChangeTrackingObject } from "@vaultic/shared/Types/ClientServerTypes";
import { getObjectFromPath, PropertyManagerConstructor } from "@vaultic/shared/Utilities/PropertyManagers";
import { ChangeTracking } from "../../Entities/ChangeTracking";
import { StoreRetriever } from "../../../Types/Parameters";
import { environment } from "../../../Environment";

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

    /**
     * Merges server and client store state changes together. 
     * @param key the key for the entity. Should be MasterKey for User and UserVault, or VaultKey for Vaults
     * @param alreadyMergedLocalChanges The previous call to this functions clientChangesToPushAfter. This is for if we merge data, attempt to backup, 
     * but find out there are new changes to merge again. If the server updated the same properties as some of these changes, we will remove them if the servers change 
     * time was newer. 
     * @param serverChanges The new changes from the server to merge
     * @param localChangesToMerge Our local changes to merge
     * @param states An object that defines how to retrieve store states and optionally has the new server state. The server state is used if we fail to backup since it'll
     * @param clientChangesToPushAfter The changes to pushed after mering has been completed
     * @param transaction the current transaction
     * @returns 
     * 
     * Scenarios:
     * Have server state and no local changes:
     *      No merging is done as their aren’t any server or local changes
     * 
     * Have server state and local changes:
     *      We would make our local changes against the server state, commit it, and then continue
     * 
     * Have server changes and no local changes:
     *      We would make the server changes to our local state, commit it, and then continue
     * 
     * Have server changes and local changes:
     *      We would make the server and local changes  to our local state, commit it, and then continue
     * 
     * Have Server state and already committed local changes:
     *      This shouldn’t be possible. BackupData() is only called AFTER merging data locally, so its already in a valid spot to push to the server. 
     *      The retry logic is just for if someone else slips an update in between our pushes but we should always be able to pull their changes. 
     *      The server will only return a full state if the version changes form ours to the current don’t exist
     * 
     * Have server change and already committed local changes:
     *  Merge server changes and check to see if we need to update or remove any of our local changes
     * 
     */
    public static async mergeData(
        key: string,
        alreadyMergedLocalChanges: ClientChangeTrackingObject,
        serverChanges: ClientChangeTrackingObject,
        localChangesToMerge: ChangeTracking[],
        states: StoreRetriever,
        clientChangesToPushAfter: ClientChangeTrackingObject,
        transaction: Transaction)
    {
        let needsToRePushStoreStates = false;
        // Keep track of the store states we've loaded so we don't load them more than once
        const loadedStoreStates: Partial<Record<StoreType, { entity: StoreState, state: any }>> = {};
        const seenServerChanges: Map<StoreType, Map<string, number>> = new Map();

        if (serverChanges)
        {
            for (let i = 0; i < serverChanges.allChanges.length; i++)
            {
                clientChangesToPushAfter.lastLoadedChangeVersion = serverChanges.allChanges[i].version;

                const uncompressed = await environment.utilities.data.decryptAndUncompress(key, serverChanges.allChanges[i].changes);
                const parsedChanges: { [key in StoreType]: string } = JSON.parse(uncompressed);
                const storeTypes = Object.keys(parsedChanges) as StoreType[];

                for (let j = 0; j < storeTypes.length; j++)
                {
                    await this.checkLoadStoreState(key, loadedStoreStates, storeTypes[j], states);
                    this.mergeChanges(storeTypes[j], loadedStoreStates[storeTypes[j]].state, parsedChanges[storeTypes[j]],
                        serverChanges.allChanges[i].changeTime, false, seenServerChanges);
                }
            }
        }

        // We already applied these changes once but failed to backup because someone else backed up before we could.
        // We just need to check to see if they updated the same property as us and handle those. We need to check and handle
        // both if our local change is newer or if theirs are because they could have made the change a while ago but just now 
        // backed it up
        if (alreadyMergedLocalChanges)
        {
            for (let i = 0; i < alreadyMergedLocalChanges.allChanges.length; i++)
            {
                const uncompressed = await environment.utilities.data.decryptAndUncompress(key, alreadyMergedLocalChanges.allChanges[i].changes);
                const parsedChanges: { [key in StoreType]: string } = JSON.parse(uncompressed);
                const storeTypes = Object.keys(parsedChanges) as StoreType[];

                for (let j = 0; j < storeTypes.length; j++)
                {
                    // we didn't load this store therefor we couldn't have overriden any of our changes for it
                    if (!loadedStoreStates[storeTypes[j]])
                    {
                        continue;
                    }

                    parsedChanges[storeTypes[j]] = this.checkUpdatAlreadyAppliedChanges(storeTypes[j], loadedStoreStates[storeTypes[j]].state, parsedChanges[storeTypes[j]],
                        alreadyMergedLocalChanges.allChanges[i].changeTime, seenServerChanges);
                }

                clientChangesToPushAfter.lastLoadedChangeVersion += 1;
                const clientChange: ClientChange =
                {
                    changes: await environment.utilities.data.compressAndEncrypt(key, JSON.stringify(parsedChanges)),
                    changeTime: alreadyMergedLocalChanges.allChanges[i].changeTime,
                    version: clientChangesToPushAfter.lastLoadedChangeVersion
                };

                clientChangesToPushAfter.allChanges.push(clientChange);
            }

            this.addUpdatedStoreStatesToTransaction(loadedStoreStates, states, transaction);
        }
        // First time calculating changes
        else 
        {
            for (let i = 0; i < localChangesToMerge.length; i++)
            {
                needsToRePushStoreStates = true;

                let didMatchHintID = false;

                const uncompressed = await environment.utilities.data.decryptAndUncompress(key, localChangesToMerge[i].changes);
                const parsedChanges: { [key in StoreType]: string } = JSON.parse(uncompressed);
                const storeTypes = Object.keys(parsedChanges) as StoreType[];

                const tempStates: { [key in StoreType]: { state: any, parsedChanges: string } } = {} as
                 { [key in StoreType]: { state: any, parsedChanges: string } };

                for (let j = 0; j < storeTypes.length; j++)
                {
                    await this.checkLoadStoreState(key, loadedStoreStates, storeTypes[j], states);
                    const tempState = JSON.parse(JSON.stringify(loadedStoreStates[storeTypes[j]].state));
                    const [matchedHintID, newParsedChanges] = this.mergeChanges(storeTypes[j], tempState, parsedChanges[storeTypes[j]],
                        localChangesToMerge[i].changeTime, true, seenServerChanges, localChangesToMerge[i].hintID);

                    if (matchedHintID)
                    {
                        didMatchHintID = true;
                        break;
                    }

                    // we don't want to commit these yet until we are sure we aren't going to skip the push due to a hintID
                    tempStates[storeTypes[j]] = 
                    {
                        state: tempState,
                        parsedChanges: newParsedChanges
                    };
                }

                if (didMatchHintID)
                {
                    continue;
                }

                // now we can commit the changes
                for (let j = 0; j < storeTypes.length; j++)
                {
                    loadedStoreStates[storeTypes[j]].state = tempStates[storeTypes[j]].state;
                    parsedChanges[storeTypes[j]] = tempStates[storeTypes[j]].parsedChanges;
                }

                clientChangesToPushAfter.lastLoadedChangeVersion += 1;
                const clientChange: ClientChange =
                {
                    changes: await environment.utilities.data.compressAndEncrypt(key, JSON.stringify(parsedChanges)),
                    changeTime: localChangesToMerge[i].changeTime,
                    version: clientChangesToPushAfter.lastLoadedChangeVersion
                };

                clientChangesToPushAfter.allChanges.push(clientChange);
            }

            // This is fine to update now even though the request to push our changes might fail because if they do fail
            // we'll use the new store state from the server and re calc some merges within the first check for if (alreadyMergedLocalChanges)
            this.addUpdatedStoreStatesToTransaction(loadedStoreStates, states, transaction);
        }

        return needsToRePushStoreStates;
    }

    /**
     * Loads the store state if it hasn't already been loaded
     * @param key The key used to decrypt the store state
     * @param loadedStoreStates Current object tracking whether a state has been loaded or not
     * @param storeType The type to load
     * @param states current StoreRetriever
     * @returns 
     */
    private static async checkLoadStoreState(
        key: string,
        loadedStoreStates: Partial<Record<StoreType, { entity: StoreState, state: any }>>,
        storeType: StoreType,
        states: StoreRetriever)
    {
        if (!loadedStoreStates[storeType])
        {
            let state = states[storeType].serverState;
            const stateEntity = await states[storeType].getState();
            if (!stateEntity)
            {
                return;
            }

            if (!state)
            {
                state = stateEntity.state;
            }

            let usableState: string | undefined;
            if (states[storeType].decryptable === false)
            {
                usableState = await environment.utilities.data.uncompress(state);
            }
            else
            {
                const response = await StoreState.getUsableState(key, state);
                if (!response.success)
                {
                    return;
                }

                usableState = response.value;
            }

            loadedStoreStates[storeType] = { entity: stateEntity.makeReactive(), state: JSON.parse(usableState) };
        }
    }

    private static addUpdatedStoreStatesToTransaction(
        loadedStoreStates: Partial<Record<StoreType, { entity: StoreState, state: any }>>,
        states: StoreRetriever,
        transaction: Transaction)
    {
        const updatedStateKeys = Object.keys(loadedStoreStates) as StoreType[];
        for (let i = 0; i < updatedStateKeys.length; i++)
        {
            loadedStoreStates[updatedStateKeys[i]].entity.state = JSON.stringify(loadedStoreStates[updatedStateKeys[i]].state);
            transaction.updateEntity(loadedStoreStates[updatedStateKeys[i]].entity, states[updatedStateKeys[i]].saveKey, () => states[updatedStateKeys[i]].repository);
        }
    }

    private static mergeChanges(
        type: StoreType,
        current: any,
        pathChanges: string,
        changeTime: number,
        forClient: boolean,
        seenServerChanges: Map<StoreType, Map<string, number>>,
        hintID?: string): [boolean, string]
    {
        const parsedChanges: { [key: string]: PathChange[] } = JSON.parse(pathChanges);
        const paths = Object.keys(parsedChanges);

        if (forClient && hintID)
        {
            const serverChangeTime = seenServerChanges.get(type)?.get(hintID);
            if (serverChangeTime && serverChangeTime > changeTime)
            {
                // The value was updated on the server after we updted it locally, making the server value the newest.
                // We don't want to apply this change because it contains changes to related objects when we already
                // ignored the change to its main object.
                return [true, ""];
            }
        }

        for (let i = 0; i < paths.length; i++)
        {
            const pathChange = parsedChanges[paths[i]];
            for (let j = 0; j < pathChange.length; j++)
            {
                // Most likely an array
                if (!pathChange[j].p)
                {
                    const obj = getObjectFromPath(paths[i], current);
                    if (!obj)
                    {
                        if (forClient)
                        {
                            // The object was delete on another device, don't include changes to it
                            delete parsedChanges[paths[i]];
                        }
                    }

                    if (!Array.isArray(obj))
                    {
                        // don't know how to handle objects that don't have a property and aren't an array
                        continue;
                    }

                    switch (pathChange[j].t)
                    {
                        case StoreStateChangeType.Add:
                            obj.push(pathChange[j].v);
                            break;
                        case StoreStateChangeType.Delete:
                            obj.splice(0, 1);
                            break;
                    }
                }
                else
                {
                    const path = `${paths[i]}.${pathChange[j].p}`;
                    if (forClient)
                    {
                        // This will grab the change of a parent object when this change was a delete. Otherwise it'll just grab the property
                        // update.
                        const serverChangeTime = seenServerChanges.get(type)?.get(path);
                        if (serverChangeTime && serverChangeTime > changeTime)
                        {
                            // The value was updated on the server after we updted it locally, making the server value the newest.
                            // We don't want to apply this change, nor do we want any other devices to apply it
                            delete parsedChanges[paths[i]];
                            continue;
                        }
                    }

                    const obj = getObjectFromPath(paths[i], current);
                    if (!obj)
                    {
                        // The object was delete on another device, don't include changes to it
                        delete parsedChanges[paths[i]];

                        continue;
                    }

                    const manager = PropertyManagerConstructor.getFor(obj);
                    switch (pathChange[j].t)
                    {
                        case StoreStateChangeType.Add:
                            manager.set(pathChange[j].p, pathChange[j].v, obj);
                            updateSeen(false);
                            break;
                        case StoreStateChangeType.Update:
                            manager.set(pathChange[j].p, pathChange[j].v, obj);
                            updateSeen(true);
                            break;
                        case StoreStateChangeType.Delete:
                            manager.delete(pathChange[j].p, obj);
                            break;
                    }

                    function updateSeen(isUpdate: boolean)
                    {
                        if (!forClient)
                        {
                            if (!seenServerChanges.has(type))
                            {
                                const seenChange = new Map();
                                // add the path and the path.property since deletes happen on the path and won't have the property
                                // but they still need to be checked for when checking to ignore local changes above.
                                seenChange.set(paths[i], changeTime);
                                seenChange.set(path, changeTime);

                                if  (isUpdate)
                                {
                                    // mostly likely an ID. Set it so that we can prevent related data objects from being deleted
                                    if (pathChange[j].p.length > 1)
                                    {
                                        seenChange.set(pathChange[j].p, changeTime);
                                    }

                                    // mostly likely an ID. Set it so that we can prevent related data objects from being deleted
                                    const potentialID = paths[i].split(".").pop();
                                    if (potentialID && potentialID.length > 1)
                                    {
                                        seenChange.set(potentialID, changeTime);
                                    }
                                }

                                seenServerChanges.set(type, seenChange);
                            }
                            else
                            {
                                const seenChange = seenServerChanges.get(type);
                                if (!seenChange.has(paths[i]))
                                {
                                    seenChange.set(paths[i], changeTime);
                                }
                                else if (seenChange.get(paths[i]) < changeTime)
                                {
                                    // We want the newest change to signify when the object was updated
                                    seenChange.set(paths[i], changeTime);
                                }

                                if (!seenChange.has(path))
                                {
                                    seenChange.set(path, changeTime);
                                }
                                else if (seenChange.get(path) < changeTime)
                                {
                                    // we want the newest change to signify when the property was updated
                                    seenChange.set(path, changeTime);
                                }

                                if (isUpdate)
                                {
                                    if (pathChange[j].p.length > 1)
                                    {
                                        if (!seenChange.has(pathChange[j].p))
                                        {
                                            seenChange.set(pathChange[j].p, changeTime);
                                        }
                                        else if (seenChange.get(pathChange[j].p) < changeTime)
                                        {
                                            // we want the newest change to signify when the property was updated
                                            seenChange.set(pathChange[j].p, changeTime);
                                        }                                  
                                    }

                                    const potentialID = paths[i].split(".").pop();
                                    if (potentialID && potentialID.length > 1)
                                    {
                                        if (!seenChange.has(potentialID))
                                        {
                                            seenChange.set(potentialID, changeTime);
                                        }
                                        else if (seenChange.get(potentialID) < changeTime)
                                        {
                                            // we want the newest change to signify when the property was updated
                                            seenChange.set(potentialID, changeTime);
                                        }                                       
                                    }
                                }                     
                            }
                        }
                    }
                }
            }
        }

        return [false, JSON.stringify(parsedChanges)];
    }

    private static checkUpdatAlreadyAppliedChanges(
        type: StoreType,
        current: any,
        pathChanges: string,
        changeTime: number,
        seenServerChanges: Map<StoreType, Map<string, number>>): string
    {
        const parsedPathChanges: { [key: string]: PathChange[] } = JSON.parse(pathChanges);
        const paths = Object.keys(parsedPathChanges);

        for (let i = 0; i < paths.length; i++)
        {
            const pathChange = parsedPathChanges[paths[i]];
            for (let j = 0; j < pathChange.length; j++)
            {
                // Most likely an array
                if (!pathChange[j].p)
                {
                    continue;
                }
                else
                {
                    const path = `${paths[i]}.${pathChange[j].p}`;

                    const serverChangeTime = seenServerChanges.get(type)?.get(path);
                    if (serverChangeTime)
                    {
                        if (serverChangeTime > changeTime)
                        {
                            // TODO: test to make sure this works
                            // The value was updated on the server after we updted it locally, making the server value the newest.
                            // We don't want to apply this change, nor do we want any other devices to apply it
                            delete parsedPathChanges[path[i]];
                            continue;
                        }
                        else
                        {
                            const obj = getObjectFromPath(paths[i], current);
                            if (!obj)
                            {
                                // The object was delete on another device, don't include changes to it
                                delete parsedPathChanges[paths[i]];
                            }

                            const manager = PropertyManagerConstructor.getFor(obj);
                            switch (pathChange[j].t)
                            {
                                // We only care about update since that's the only one that the new changes from the server 
                                // could have overriden. Adds are handled when mergeChanges() is called for the server changes
                                case StoreStateChangeType.Update:
                                    manager.set(pathChange[j].p, pathChange[j].v, obj);
                                    break;
                            }
                        }
                    }
                }
            }
        }

        return JSON.stringify(parsedPathChanges);
    }
}