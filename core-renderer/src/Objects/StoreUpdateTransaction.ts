import { api } from "../API";
import { Store, StoreEvents } from "./Stores/Base";

export enum Entity
{
    User,
    UserVault,
    Vault
};

interface StoreUpdateState
{
    store: Store<any, StoreEvents>;
    currentState: any;
    pendingState: any;
    postSave?: () => void;
}

export default class StoreUpdateTransaction
{
    storeUpdateStates: StoreUpdateState[];
    ignoreFail: boolean;
    entity: Entity;
    vaultID: number | undefined;

    constructor(entity: Entity, vaultID?: number)
    {
        this.entity = entity;
        this.storeUpdateStates = [];
        this.vaultID = vaultID;
    }

    addStore(store: Store<any, StoreEvents>, pendingState: any, postSave: ((() => void) | undefined) = undefined)
    {
        pendingState.version += 1;
        this.storeUpdateStates.push({
            store,
            currentState: store.getState(),
            pendingState,
            postSave
        });
    }

    async commit(masterKey: string, skipBackup: boolean = false)
    {
        const state = {};
        for (let i = 0; i < this.storeUpdateStates.length; i++)
        {
            state[this.storeUpdateStates[i].store.stateName] = JSON.stringify(this.storeUpdateStates[i].pendingState);
        }

        let success = false;
        switch (this.entity)
        {
            // TODO: fill out the rest
            case Entity.User:
                success = await api.repositories.users.saveUser(masterKey, JSON.stringify(state));
                break;
            case Entity.UserVault:
                success = await api.repositories.userVaults.saveUserVault(masterKey, this.vaultID!, JSON.stringify(state));
                break;
            case Entity.Vault:
                success = await api.repositories.vaults.saveAndBackup(masterKey, this.vaultID!, JSON.stringify(state), skipBackup);
                break;
        }

        if (!success)
        {
            return false;
        }

        // commit the states in memory. This is just an object.assign so it shouldn't fail
        for (let i = 0; i < this.storeUpdateStates.length; i++)
        {
            this.storeUpdateStates[i].store.updateState(this.storeUpdateStates[i].pendingState);
            this.storeUpdateStates[i].postSave?.();
        }

        return true;
    }
}