import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { Vault } from "../Database/Entities/Vault";
import { environment } from "../Environment";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { Algorithm, MLKEM1024KeyResult, SignedVaultKey, SignedVaultKeyMessage } from "@vaultic/shared/Types/Keys";
import { VaultStoreStates } from "@vaultic/shared/Types/Stores";
import { StoreState } from "../Database/Entities/States/StoreState";

class VaultHelper 
{
    public async prepareVaultKeyForRecipient(senderUserID: number,
        recipientPublicEncryptingKey: string, vaultKey: string): Promise<TypedMethodResponse<string | undefined>>
    {
        const asymmetricEncryptResult = await environment.utilities.crypt.asymmeticEncrypt(recipientPublicEncryptingKey, vaultKey);
        if (!asymmetricEncryptResult.success)
        {
            return asymmetricEncryptResult as TypedMethodResponse<string | undefined>;
        }

        const keyResult: MLKEM1024KeyResult = asymmetricEncryptResult.value as MLKEM1024KeyResult;
        const message: SignedVaultKeyMessage =
        {
            senderUserID,
            cipherText: keyResult.cipherText,
            vaultKey: keyResult.value
        };

        const signingKey = await environment.cache.getDecryptedCurrentUserSigningKey();
        const signature = await environment.utilities.crypt.sign(signingKey, JSON.stringify(message));

        if (!signature.success)
        {
            return TypedMethodResponse.propagateFail(signature);
        }

        const signedVaultKey: SignedVaultKey =
        {
            algorithm: Algorithm.Vaultic_Key_Share,
            signature: signature.value,
            message
        };

        return TypedMethodResponse.success(JSON.stringify(signedVaultKey));
    }

    public async evaluateVaultKeyFromSender(senderPublicSigningKey: string, recipientPrivateEncryptingKey: string, signedVaultKey: SignedVaultKey)
        : Promise<TypedMethodResponse<string | undefined>>
    {
        const verifyResult = await environment.utilities.crypt.verify(senderPublicSigningKey, signedVaultKey);
        if (!verifyResult.success)
        {
            return TypedMethodResponse.propagateFail(verifyResult);
        }

        return await environment.utilities.crypt.asymmetricDecrypt(recipientPrivateEncryptingKey, signedVaultKey.message.vaultKey, signedVaultKey.message.cipherText);
    }

    public async decryptCondensedUserVault(vaultKey: string, condensedVault: CondensedVaultData, propertiesToDecrypt?: string[], storeStatesToUse?: VaultStoreStates[],
        allFields: boolean = false)
    {
        let decryptableProperties = propertiesToDecrypt;
        if (!decryptableProperties)
        {
            if (allFields)
            {
                decryptableProperties = Vault.getDecryptableProperties();
            }
            else
            {
                decryptableProperties = [];
            }
        }

        for (let j = 0; j < decryptableProperties.length; j++)
        {
            const response = await environment.utilities.crypt.symmetricDecrypt(vaultKey, condensedVault[decryptableProperties[j]]);
            if (!response.success)
            {
                return null;
            }

            condensedVault[decryptableProperties[j]] = response.value!;
        }

        let storeStates = storeStatesToUse;
        if (!storeStates)
        {
            if (allFields)
            {
                storeStates = ["vaultStoreState", "passwordStoreState", "valueStoreState", "filterStoreState", "groupStoreState"];
            }
            else 
            {
                storeStates = [];
            }
        }

        for (let j = 0; j < storeStates.length; j++)
        {
            const response = await StoreState.getUsableState(vaultKey, condensedVault[storeStates[j]]);
            if (!response.success)
            {
                return null;
            }

            condensedVault[storeStates[j]] = response.value!;
        }

        return condensedVault;
    }
}

const vaultHelper: VaultHelper = new VaultHelper();
export default vaultHelper;