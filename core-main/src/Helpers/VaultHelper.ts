import { CondensedVaultData } from "@vaultic/shared/Types/Entities";
import { Vault } from "../Database/Entities/Vault";
import { environment } from "../Environment";
import { TypedMethodResponse } from "@vaultic/shared/Types/MethodResponse";
import { Algorithm, MLKEM1024KeyResult, SignedVaultKey, SignedVaultKeyMessage } from "@vaultic/shared/Types/Keys";

class VaultHelper 
{
    public async prepareVaultKeyForRecipient(senderUserID: number, sendingPrivateSigningKey: string,
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

        const signature = await environment.utilities.crypt.sign(sendingPrivateSigningKey, JSON.vaulticStringify(message));
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

    public async decryptCondensedUserVault(vaultKey: string, condensedVault: CondensedVaultData, propertiesToDecrypt?: string[])
    {
        const decryptableProperties = propertiesToDecrypt ?? Vault.getDecryptableProperties();
        for (let j = 0; j < decryptableProperties.length; j++)
        {
            const response = await environment.utilities.crypt.symmetricDecrypt(vaultKey, condensedVault[decryptableProperties[j]]);
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