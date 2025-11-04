import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { Vault } from "../Database/Entities/Vault";
import { ClientChangeTrackingObject, ClientChangeTrackingType, UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { ChangeTracking } from "../Database/Entities/ChangeTracking";

export class VaultsAndKeys
{
    keys: string[];
    vaults: DeepPartial<Vault>[];

    constructor(keys?: string[], vaults?: DeepPartial<Vault>[])
    {
        this.keys = keys ?? [];
        this.vaults = vaults ?? [];
    }
}

export interface CurrentUserDataIdentifiersAndKeys 
{
    identifiers: UserDataPayload;
    keys: string[];
}

// Keep in sync with ClientChangeTrackingType
export interface ChangeTrackingsByType
{
    /** User */
    0?: ChangeTracking[];
    /** UserVault */
    1?: { [key: number]: ChangeTracking[] };
    /** Vault */
    2?: { [key: number]: ChangeTracking[] };
}

export interface UpdateFromServerResponse<T extends ClientChangeTrackingObject>
{
    needsToRePushData: boolean;
    changes: T;
}