import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { api } from "../API";
import { defaultHandleFailedResponse } from "../Helpers/ResponseHelper";
import { Store, StoreEvents } from "./Stores/Base";
import { PendingStoreState, StateKeys, StoreState } from "@vaultic/shared/Types/Stores";
import app from "./Stores/AppStore";

export enum Entity
{
    User,
    UserVault,
    Vault
};

interface StoreUpdateState
{
    store: Store<StoreState, StateKeys>;
    pendingState: PendingStoreState<StoreState, StateKeys>;
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

    private addStore(
        updateStoreStates: Dictionary<StoreUpdateState>,
        store: Store<any, StateKeys, StoreEvents>,
        pendingState: PendingStoreState<StoreState, StateKeys>,
        postSave: ((() => void) | undefined) = undefined)
    {
        if (updateStoreStates[store.type])
        {
            return;
        }

        updateStoreStates[store.type] =
        {
            store,
            pendingState,
            postSave
        };
    }

    updateUserStore(store: Store<any, StateKeys, StoreEvents>, pendingState: PendingStoreState<StoreState, StateKeys>, postSave: ((() => void) | undefined) = undefined)
    {
        this.addStore(this.userStoreUpdateStates, store, pendingState, postSave);
    }

    updateUserVaultStore(store: Store<any, StateKeys, StoreEvents>, pendingState: PendingStoreState<StoreState, StateKeys>, postSave: ((() => void) | undefined) = undefined)
    {
        this.addStore(this.userVaultStoreUpdateStates, store, pendingState, postSave);
    }

    updateVaultStore(store: Store<any, StateKeys, StoreEvents>, pendingState: PendingStoreState<StoreState, StateKeys>, postSave: ((() => void) | undefined) = undefined)
    {
        this.addStore(this.vaultStoreUpdateStates, store, pendingState, postSave);
    }

    private async saveStoreChanges(masterKey: string, entity: Entity, updateStoreStates: Dictionary<StoreUpdateState>)
    {
        if (app.isSyncing.value)
        {
            return false;
        }

        const changes: { [key: string]: any } = {};
        const stores = Object.keys(updateStoreStates);

        if (stores.length == 0)
        {
            return true;
        }

        for (let i = 0; i < stores.length; i++)
        {
            // can happen if the user didn't actually change anything
            const keys = Object.keys(updateStoreStates[stores[i]].pendingState.changes);
            if (keys.length == 0)
            {
                continue;
            }

            changes[stores[i]] = JSON.stringify(updateStoreStates[stores[i]].pendingState.changes);
        }

        // nothing was updated, nothing to do
        if (Object.keys(changes).length == 0)
        {
            return true;
        }

        let response: TypedMethodResponse<any>;
        switch (entity)
        {
            case Entity.User:
                response = await api.repositories.users.saveUser(masterKey, JSON.stringify(changes));
                break;
            case Entity.UserVault:
                response = await api.repositories.userVaults.saveUserVault(masterKey, this.userVaultID!, JSON.stringify(changes));
                break;
            case Entity.Vault:
                response = await api.repositories.vaults.saveVaultData(masterKey, this.userVaultID!, JSON.stringify(changes));
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
            stores[i].store.initalizeNewState(stores[i].pendingState.state);
            stores[i].postSave?.();
        }

        return true;
    }

    async commit(masterKey: string)
    {
        if (!(await this.saveStoreChanges(masterKey, Entity.User, this.userStoreUpdateStates)))
        {
            return false;
        }

        if (!(await this.saveStoreChanges(masterKey, Entity.UserVault, this.userVaultStoreUpdateStates)))
        {
            return false;
        }

        if (!(await this.saveStoreChanges(masterKey, Entity.Vault, this.vaultStoreUpdateStates)))
        {
            return false;
        }

        if (!await this.commitStoreStates(this.userStoreUpdateStates))
        {
            return false;
        }

        if (!await this.commitStoreStates(this.userVaultStoreUpdateStates))
        {
            return false;
        }

        if (!await this.commitStoreStates(this.vaultStoreUpdateStates))
        {
            return false;
        }

        return true;
    }
}