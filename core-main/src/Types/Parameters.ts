import { StoreType } from "@vaultic/shared/Types/Stores";
import { VaulticRepository } from "./Repositories";
import { StoreState } from "../Database/Entities/States/StoreState";

export type StoreRetriever = Partial<{ [key in StoreType]: { repository: VaulticRepository<StoreState>, getState: () => Promise<StoreState> } }>;