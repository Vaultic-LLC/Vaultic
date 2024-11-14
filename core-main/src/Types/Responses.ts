import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";
import { Vault } from "../Database/Entities/Vault";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";

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

export interface CurrentSignaturesVaultKeys 
{
    signatures: UserDataPayload;
    keys: string[];
}