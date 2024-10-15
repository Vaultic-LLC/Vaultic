import { api } from "../API";
import { defaultHandleFailedResponse } from "../Helpers/ResponseHelper";
import { Dictionary } from "../Types/DataStructures";
import { TypedMethodResponse } from "../Types/MethodResponse";
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
    private userStoreUpdateStates: Dictionary<StoreUpdateState>;
    private userVaultStoreUpdateStates: Dictionary<StoreUpdateState>;
    private vaultStoreUpdateStates: Dictionary<StoreUpdateState>;

    private userVaultID: number | undefined;

    constructor(userVaultID?: number)
    {
        this.userVaultID = userVaultID;

        this.userStoreUpdateStates = {};
        this.userVaultStoreUpdateStates = {};
        this.vaultStoreUpdateStates = {};
    }

    private addStore(updateStoreStates: Dictionary<StoreUpdateState>, store: Store<any, StoreEvents>, pendingState: any, postSave: ((() => void) | undefined) = undefined)
    {
        if (updateStoreStates[store.stateName])
        {
            return;
        }

        updateStoreStates[store.stateName] =
        {
            store,
            currentState: store.getState(),
            pendingState,
            postSave
        };
    }

    updateUserStore(store: Store<any, StoreEvents>, pendingState: any, postSave: ((() => void) | undefined) = undefined)
    {
        this.addStore(this.userStoreUpdateStates, store, pendingState, postSave);
    }

    updateUserVaultStore(store: Store<any, StoreEvents>, pendingState: any, postSave: ((() => void) | undefined) = undefined)
    {
        this.addStore(this.userVaultStoreUpdateStates, store, pendingState, postSave);
    }

    updateVaultStore(store: Store<any, StoreEvents>, pendingState: any, postSave: ((() => void) | undefined) = undefined)
    {
        this.addStore(this.vaultStoreUpdateStates, store, pendingState, postSave);
    }

    private async saveStoreStates(masterKey: string, entity: Entity, updateStoreStates: Dictionary<StoreUpdateState>, backup: boolean)
    {
        const states = {};
        const stores = Object.values(updateStoreStates);
        if (stores.length == 0)
        {
            return true;
        }

        for (let i = 0; i < stores.length; i++)
        {
            states[stores[i].store.stateName] = JSON.stringify(stores[i].pendingState);
        }

        let response: TypedMethodResponse<any>;
        switch (entity)
        {
            case Entity.User:
                response = await api.repositories.users.saveUser(masterKey, JSON.stringify(states), backup);
                break;
            case Entity.UserVault:
                response = await api.repositories.userVaults.saveUserVault(masterKey, this.userVaultID!, JSON.stringify(states), backup);
                break;
            case Entity.Vault:
                response = await api.repositories.vaults.saveVault(masterKey, this.userVaultID!, JSON.stringify(states), backup);
                break;
        }

        if (!response.success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        return true;
    }

    private async commitStoreStates(storeUpdateStates: Dictionary<StoreUpdateState>)
    {
        const stores = Object.values(storeUpdateStates);
        for (let i = 0; i < stores.length; i++)
        {
            stores[i].store.updateState(stores[i].pendingState);
            stores[i].postSave?.();
        }
    }

    async commit(masterKey: string, backup: boolean = true)
    {
        if (!(await this.saveStoreStates(masterKey, Entity.User, this.userStoreUpdateStates, backup)))
        {
            return false;
        }

        if (!(await this.saveStoreStates(masterKey, Entity.UserVault, this.userVaultStoreUpdateStates, backup)))
        {
            return false;
        }

        if (!(await this.saveStoreStates(masterKey, Entity.Vault, this.vaultStoreUpdateStates, backup)))
        {
            return false;
        }

        this.commitStoreStates(this.userStoreUpdateStates);
        this.commitStoreStates(this.userVaultStoreUpdateStates);
        this.commitStoreStates(this.vaultStoreUpdateStates);

        return true;
    }
}