import { User } from "../Database/Entities/User";
import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import { DeepPartial } from "../Helpers/TypeScriptHelper";
import { ServerDisplayVault } from "./Repositories";

export interface EncryptedRequest
{
    Key: string;
    Data: string;
}

export interface UserDataPayload 
{
    user?: DeepPartial<User>;
    userVaults?: DeepPartial<UserVault>[];
    vaults?: DeepPartial<Vault>[];
    archivedVaults?: DeepPartial<ServerDisplayVault>[];
    sharedVaults?: DeepPartial<ServerDisplayVault>[];
}