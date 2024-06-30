import cryptHelper from "../Helpers/cryptHelper";
import { File } from "../Types/APITypes";
import { Store, StoreEvents, StoreState } from "./Stores/Base";

interface StoreUpdateState
{
    store: Store<StoreState, StoreEvents>;
    currentState: StoreState;
    pendingState: StoreState;
    committed: boolean;
    postSave?: () => void;
}

export default class StoreUpdateTransaction
{
    storeUpdateStates: StoreUpdateState[];
    ignoreFail: boolean;

    constructor(ignoreFail: boolean = false)
    {
        this.ignoreFail = ignoreFail;
        this.storeUpdateStates = [];
    }

    addStore(store: Store<StoreState, StoreEvents>, pendingState: StoreState, postSave: ((() => void) | undefined) = undefined)
    {
        this.storeUpdateStates.push({
            store,
            currentState: store.getState(),
            pendingState,
            committed: false,
            postSave
        });
    }

    async commit(masterKey: string)
    {
        let failed = false;
        for (let i = 0; i < this.storeUpdateStates.length; i++)
        {
            const success = await this.writeFile(masterKey, this.storeUpdateStates[i].store.getFile(),
                this.storeUpdateStates[i].pendingState, this.storeUpdateStates[i].store.encrypted());

            if (!success && !this.ignoreFail)
            {
                failed = true;
                break;
            }

            this.storeUpdateStates[i].committed = true;
        }

        // we failed to write a file. Revert any that were updated
        if (failed)
        {
            const committedFiles = this.storeUpdateStates.filter(f => f.committed === true);
            for (let i = 0; i < committedFiles.length; i++)
            {
                await this.writeFile(masterKey, committedFiles[i].store.getFile(),
                    committedFiles[i].currentState, committedFiles[i].store.encrypted());
            }
        }
        else 
        {
            // commit the states in memory. This is just an object.assign so it shouldn't fail
            for (let i = 0; i < this.storeUpdateStates.length; i++)
            {
                this.storeUpdateStates[i].store.updateState(this.storeUpdateStates[i].pendingState);
                this.storeUpdateStates[i].postSave?.();
            }
        }

        return !failed;
    }

    private async writeFile(masterKey: string, file: File, state: any, encrypt: boolean): Promise<boolean>
    {
        let data: string = JSON.stringify(state);
        if (encrypt)
        {
            const response = await cryptHelper.encrypt(masterKey, data);
            if (!response.success)
            {
                return false;
            }

            data = response.value!;
        }

        return (await file.write(data)).success;
    }
}