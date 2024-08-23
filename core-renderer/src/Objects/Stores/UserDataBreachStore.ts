import { UserDataBreach } from "../../Types/SharedTypes";
import { Store, StoreEvents } from "./Base";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { api } from "../../API"

export interface UserDataBreachStoreState
{
    userBreaches: UserDataBreach[];
}

type DataBreachStoreEvent = StoreEvents | "onBreachDismissed";

export class UserDataBreachStore extends Store<UserDataBreachStoreState, DataBreachStoreEvent>
{
    get userDataBreaches() { return this.state.userBreaches; }

    constructor()
    {
        super('userDataBreachStore');
    }

    protected defaultState()
    {
        return {
            userBreaches: []
        };
    }

    // this store isn't written to a file, we request the data on each new load
    public writeState(_: string): Promise<boolean>
    {
        return Promise.resolve(true)
    }

    public async readState(_: string): Promise<boolean>
    {
        return Promise.resolve(true);
    }

    public addEvent(event: DataBreachStoreEvent, callback: () => void)
    {
        super.addEvent(event, callback);
    }

    public removeEvent(event: DataBreachStoreEvent, callback: () => void)
    {
        if (!this.events[event])
        {
            return;
        }

        this.events[event] = this.events[event].filter(c => c != callback);
    }

    public updateUserBreaches(userBreaches: UserDataBreach[])
    {
        this.state.userBreaches = userBreaches;
    }

    public async dismissUserDataBreach(userDataBreachID: number): Promise<boolean>
    {
        const response = await api.server.user.dismissUserDataBreach(userDataBreachID);
        if (response.Success)
        {
            this.state.userBreaches = this.state.userBreaches.filter(b => b.UserDataBreachID != userDataBreachID);
            this.events["onBreachDismissed"].forEach(f => f());

            return true;
        }

        defaultHandleFailedResponse(response);
        return false;
    }
}

