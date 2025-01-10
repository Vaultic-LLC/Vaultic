import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { UserVault } from "../Database/Entities/UserVault";
import { Vault } from "../Database/Entities/Vault";
import Transaction from "../Database/Transaction";
import { environment } from "../Environment";
import axiosHelper from "../Server/AxiosHelper";
import vaulticServer from "../Server/VaulticServer";
import { userDataE2EEncryptedFieldTree } from "../Types/FieldTree";
import { VaultKey } from "../Types/Properties";
import { safetifyMethod } from "./RepositoryHelper";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import { UserDataPayload } from "@vaultic/shared/Types/ClientServerTypes";
import { DeepPartial } from "@vaultic/shared/Helpers/TypeScriptHelper";

class VaultHelper 
{
    public async decryptVaultKey(masterKey: string, privateKey: string, decryptPrivateKey: boolean, vaultKey: string, decryptVaultKey: boolean = true): Promise<TypedMethodResponse<string>>
    {
        if (decryptPrivateKey)
        {
            const decryptedPrivateKey = await environment.utilities.crypt.decrypt(masterKey, privateKey);
            if (!decryptedPrivateKey.success)
            {
                return decryptedPrivateKey;
            }

            privateKey = decryptedPrivateKey.value!;
        }

        let vaultKeyToUse = vaultKey;
        if (decryptVaultKey)
        {
            const decryptedVaultKeys = await environment.utilities.crypt.decrypt(masterKey, vaultKey);
            if (!decryptedVaultKeys.success)
            {
                return decryptedVaultKeys;
            }

            vaultKeyToUse = decryptedVaultKeys.value!;
        }

        const keys: VaultKey = JSON.vaulticParse(vaultKeyToUse);
        return await environment.utilities.crypt.ECDecrypt(keys.publicKey, privateKey, keys.vaultKey);
    }

    public async decryptCondensedUserVault(vaultKey: string, condensedVault: CondensedVaultData, propertiesToDecrypt?: string[])
    {
        const decryptableProperties = propertiesToDecrypt ?? Vault.getDecryptableProperties();
        for (let j = 0; j < decryptableProperties.length; j++)
        {
            const response = await environment.utilities.crypt.decrypt(vaultKey, condensedVault[decryptableProperties[j]]);
            if (!response.success)
            {
                return null;
            }

            condensedVault[decryptableProperties[j]] = response.value!;
        }

        return condensedVault;
    }
}

const vaultHelper: VaultHelper = new VaultHelper();
export default vaultHelper;