import { api } from "../API";
import { defaultHandleFailedResponse } from "../Helpers/ResponseHelper";
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
    storeUpdateStates: StoreUpdateState[];
    ignoreFail: boolean;
    entity: Entity;
    userVaultID: number | undefined;

    constructor(entity: Entity, userVaultID?: number)
    {
        this.entity = entity;
        this.storeUpdateStates = [];
        this.userVaultID = userVaultID;
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

    async commit(masterKey: string, backup: boolean = true)
    {
        const states = {};
        for (let i = 0; i < this.storeUpdateStates.length; i++)
        {
            states[this.storeUpdateStates[i].store.stateName] = JSON.stringify(this.storeUpdateStates[i].pendingState);
        }

        let response: TypedMethodResponse<any>;
        switch (this.entity)
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

        // commit the states in memory. This is just an object.assign so it shouldn't fail
        for (let i = 0; i < this.storeUpdateStates.length; i++)
        {
            this.storeUpdateStates[i].store.updateState(this.storeUpdateStates[i].pendingState);
            this.storeUpdateStates[i].postSave?.();
        }

        return true;
    }
}