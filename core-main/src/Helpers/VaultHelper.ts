import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { Vault } from "../Database/Entities/Vault";
import { environment } from "../Environment";
import { VaultKey } from "../Types/Properties";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";

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