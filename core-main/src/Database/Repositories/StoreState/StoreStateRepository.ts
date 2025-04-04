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
                    if (!loadedStoreStates[storeTypes[j]])
                    {
                        let state = states[storeTypes[j]].serverState;
                        const stateEntity = await states[storeTypes[j]].getState();
                        if (!stateEntity)
                        {
                            return;
                        }

                        if (!state)
                        {
                            state = stateEntity.state;
                        }

                        const usableState = await StoreState.getUsableState(key, state);
                        if (!usableState.success)
                        {
                            return;;
                        }

                        loadedStoreStates[storeTypes[j]] = { entity: stateEntity.makeReactive(), state: JSON.parse(usableState.value) };
                    }

                    parsedChanges[storeTypes[j]] = this.mergeChanges(storeTypes[j], loadedStoreStates[storeTypes[j]].state, parsedChanges[storeTypes[j]],
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

            this.addUpdatedStoreStatesToTransaction(key, loadedStoreStates, states, transaction);
        }
        // First time calculating changes
        else 
        {
            for (let i = 0; i < localChangesToMerge.length; i++)
            {
                needsToRePushStoreStates = true;

                const uncompressed = await environment.utilities.data.decryptAndUncompress(key, localChangesToMerge[i].changes);
                const parsedChanges: { [key in StoreType]: string } = JSON.parse(uncompressed);
                const storeTypes = Object.keys(parsedChanges) as StoreType[];

                for (let j = 0; j < storeTypes.length; j++)
                {
                    if (!loadedStoreStates[storeTypes[j]])
                    {
                        let state = states[storeTypes[j]].serverState;
                        const stateEntity = await states[storeTypes[j]].getState();
                        if (!stateEntity)
                        {
                            return;
                        }

                        if (!state)
                        {
                            state = stateEntity.state;
                        }

                        const usableState = await StoreState.getUsableState(key, state);
                        if (!usableState.success)
                        {
                            return;;
                        }

                        loadedStoreStates[storeTypes[j]] = { entity: stateEntity.makeReactive(), state: JSON.parse(usableState.value) };
                    }

                    parsedChanges[storeTypes[j]] = this.mergeChanges(storeTypes[j], loadedStoreStates[storeTypes[j]].state, parsedChanges[storeTypes[j]],
                        localChangesToMerge[i].changeTime, true, seenServerChanges);
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
            this.addUpdatedStoreStatesToTransaction(key, loadedStoreStates, states, transaction);
        }

        return needsToRePushStoreStates;
    }

    private static addUpdatedStoreStatesToTransaction(
        key: string,
        loadedStoreStates: Partial<Record<StoreType, { entity: StoreState, state: any }>>,
        states: StoreRetriever,
        transaction: Transaction)
    {
        const updatedStateKeys = Object.keys(loadedStoreStates) as StoreType[];
        for (let i = 0; i < updatedStateKeys.length; i++)
        {
            loadedStoreStates[updatedStateKeys[i]].entity.state = JSON.stringify(loadedStoreStates[updatedStateKeys[i]].state);
            transaction.updateEntity(loadedStoreStates[updatedStateKeys[i]].entity, key, () => states[updatedStateKeys[i]].repository);
        }
    }

    private static mergeChanges(
        type: StoreType,
        current: any,
        pathChanges: string,
        changeTime: number,
        forClient: boolean,
        seenServerChanges: Map<StoreType, Map<string, number>>): string
    {
        const parsedChanges: { [key: string]: PathChange[] } = JSON.parse(pathChanges);
        const paths = Object.keys(parsedChanges);

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
                        const serverChangeTime = seenServerChanges.get(type)?.get(path);
                        if (serverChangeTime && serverChangeTime > changeTime)
                        {
                            // TODO: test to make sure this works
                            // The value was updated on the server after we updted it locally, making the server value the newest.
                            // We don't want to apply this change, nor do we want any other devices to apply it
                            delete parsedChanges[paths[i]];
                            continue;
                        }
                    }

                    const obj = getObjectFromPath(paths[i], current);
                    if (!obj)
                    {
                        if (forClient)
                        {
                            // The object was delete on another device, don't include changes to it
                            delete parsedChanges[paths[i]];
                        }
                    }

                    const manager = PropertyManagerConstructor.getFor(obj);
                    switch (pathChange[j].t)
                    {
                        case StoreStateChangeType.Add:
                            manager.set(pathChange[j].p, pathChange[j].v, obj);
                            break;
                        case StoreStateChangeType.Update:
                            manager.set(pathChange[j].p, pathChange[j].v, obj);
                            updateSeen();
                            break;
                        case StoreStateChangeType.Delete:
                            manager.delete(pathChange[j].p, obj);
                            break;
                    }

                    function updateSeen()
                    {
                        if (!forClient)
                        {
                            if (!seenServerChanges.has(type))
                            {
                                const seenChange = new Map();
                                seenChange.set(path, changeTime);

                                seenServerChanges.set(type, seenChange);
                            }
                            else
                            {
                                seenServerChanges.get(type).set(path, changeTime)
                            }
                        }
                    }
                }
            }
        }

        return JSON.stringify(parsedChanges);
    }

    private static checkUpdatAlreadyAppliedChanges(
        type: StoreType,
        current: any,
        pathChanges: string,
        changeTime: number,
        seenServerChanges: Map<StoreType, Map<string, number>>): string
    {
        const parsedPathChanges: { [key: string]: PathChange[] } = JSON.parse(pathChanges);
        const paths = Object.keys(pathChanges);

        for (let i = 0; i < paths.length; i++)
        {
            const pathChange = pathChanges[paths[i]];
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
                            delete pathChanges[path[i]];
                            continue;
                        }
                        else
                        {
                            const obj = getObjectFromPath(paths[i], current);
                            if (!obj)
                            {
                                // The object was delete on another device, don't include changes to it
                                delete pathChanges[paths[i]];
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