import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { api } from "../API";
import { defaultHandleFailedResponse } from "../Helpers/ResponseHelper";
import { Store, StoreEvents } from "./Stores/Base";
import app from "./Stores/AppStore";
import { CondensedVaultData, UserData } from "@vaultic/shared/Types/Entities";

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

    private async saveStoreStates(masterKey: string, entity: Entity, updateStoreStates: Dictionary<StoreUpdateState>)
    {
        const newStates: { [key: string]: any } = {};
        const currentStates: { [key: string]: any } = {};
        const stores = Object.values(updateStoreStates);

        if (stores.length == 0)
        {
            return true;
        }

        for (let i = 0; i < stores.length; i++)
        {
            newStates[stores[i].store.stateName] = JSON.vaulticStringify(stores[i].pendingState);
            currentStates[stores[i].store.stateName] = JSON.vaulticStringify(stores[i].store.getState());
        }

        let response: TypedMethodResponse<any>;
        switch (entity)
        {
            case Entity.User:
                response = await api.repositories.users.saveUser(masterKey, JSON.vaulticStringify(newStates), JSON.vaulticStringify(currentStates));
                break;
            case Entity.UserVault:
                response = await api.repositories.userVaults.saveUserVault(masterKey, this.userVaultID!, JSON.vaulticStringify(newStates), JSON.vaulticStringify(currentStates));
                break;
            case Entity.Vault:
                response = await api.repositories.vaults.saveVaultData(masterKey, this.userVaultID!, JSON.vaulticStringify(newStates), JSON.vaulticStringify(currentStates));
                break;
        }

        if (!response.success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        return true;
    }

    private async commitStoreStates(masterKey: string, entity: Entity, storeUpdateStates: Dictionary<StoreUpdateState>)
    {
        const stores = Object.values(storeUpdateStates);
        if (stores.length == 0)
        {
            return true;
        }

        const storesToRetrieve: { [key: string]: any } = {};
        for (let i = 0; i < stores.length; i++)
        {
            storesToRetrieve[stores[i].store.stateName] = {};
        }

        let response: TypedMethodResponse<any>;

        // we need to re get the store state since it could have been updated from change tracking or when merging data after backing up
        switch (entity)
        {
            case Entity.User:
                response = await api.repositories.users.getStoreStates(masterKey, storesToRetrieve as UserData);
                break;
            case Entity.UserVault:
                response = await api.repositories.userVaults.getStoreStates(masterKey, this.userVaultID!, storesToRetrieve as CondensedVaultData);
                break;
            case Entity.Vault:
                response = await api.repositories.vaults.getStoreStates(masterKey, this.userVaultID!, storesToRetrieve as CondensedVaultData);
                break;
        }

        if (!response.success)
        {
            defaultHandleFailedResponse(response);
            return false;
        }

        const storeKeys = Object.keys(response.value);
        for (let i = 0; i < storeKeys.length; i++)
        {
            storeUpdateStates[storeKeys[i]].store.initalizeNewState(JSON.vaulticParse(response.value[storeKeys[i]]));
            storeUpdateStates[storeKeys[i]].postSave?.();
        }

        return true;
    }

    async commit(masterKey: string, backup: boolean = true)
    {
        if (!(await this.saveStoreStates(masterKey, Entity.User, this.userStoreUpdateStates)))
        {
            return false;
        }

        if (!(await this.saveStoreStates(masterKey, Entity.UserVault, this.userVaultStoreUpdateStates)))
        {
            return false;
        }

        if (!(await this.saveStoreStates(masterKey, Entity.Vault, this.vaultStoreUpdateStates)))
        {
            return false;
        }

        // masterKey will be "" when updating userPreferences or vaultPreferences
        if (masterKey && backup && app.isOnline)
        {
            const response = await api.helpers.repositories.backupData(masterKey);
            if (!response.success)
            {
                defaultHandleFailedResponse(response);
                return false;
            }
        }

        // do these after checking to backup since backing up can change the state
        if (!await this.commitStoreStates(masterKey, Entity.User, this.userStoreUpdateStates))
        {
            return false;
        }

        if (!await this.commitStoreStates(masterKey, Entity.UserVault, this.userVaultStoreUpdateStates))
        {
            return false;
        }

        if (!await this.commitStoreStates(masterKey, Entity.Vault, this.vaultStoreUpdateStates))
        {
            return false;
        }

        return true;
    }
}