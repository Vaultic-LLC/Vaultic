import { StoreType } from "@vaultic/shared/Types/Stores";
import { VaulticRepository } from "./Repositories";
import { StoreState } from "../Database/Entities/States/StoreState";

export type StoreRetriever = Partial<{ [key in StoreType]:
    {
        /**
         * Key used to save the store state
         */
        saveKey: string;
        /**
         * whether or not the state is decryptable. Defaults to true. UserPreferencs is not
         */
        decryptable?: boolean;
        /**
         *  The repository for the State Entity
         */
        repository: VaulticRepository<StoreState>,
        /**
         * The state that was returned from the server, if there was one. This is needed in case we also have changes for the same state we are overriding 
         * since it hasn't been saved yet.
         */
        serverState?: string,
        /**
         *  Query that returns the State Entity for this state
         * @returns Store State Entity
         */
        getState: () => Promise<StoreState>
    } }>;