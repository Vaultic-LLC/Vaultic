import { PendingStoreState, StateKeys, StoreState } from "@vaultic/shared/Types/Stores";

export type EditableDataType<T, U extends StoreState, V extends StateKeys> = 
{
    dataType: T;
    pendingStoreState: PendingStoreState<U, V>;
}